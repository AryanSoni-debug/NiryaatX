import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import HTTPException

logger = logging.getLogger(__name__)

MODEL_FILES = (
    "lstm_forex_model.keras",
    "xgb_forex_model.json",
    "feature_scaler.pkl",
    "target_scaler.pkl",
)
FEATURE_COLUMNS = ["Price", "Return", "RSI", "SMA_20", "SMA_50"]
LOOK_BACK = 60
FORECAST_STEPS = 20


def _model_directory() -> Path:
    configured_path = os.getenv("NIRYAATX_FOREX_MODEL_DIR")
    if configured_path:
        return Path(configured_path).expanduser().resolve()
    return (Path(__file__).resolve().parents[2].parent / "gemini").resolve()


@lru_cache(maxsize=2)
def _load_model_artifacts(model_directory: str) -> tuple[Any, Any, Any, Any]:
    directory = Path(model_directory)
    missing = [filename for filename in MODEL_FILES if not (directory / filename).is_file()]
    if missing:
        raise HTTPException(
            status_code=503,
            detail=(
                "USD/INR model artifacts are missing. Set NIRYAATX_FOREX_MODEL_DIR "
                f"to the directory containing them. Missing: {', '.join(missing)}."
            ),
        )

    try:
        import joblib
        import xgboost as xgb
        from tensorflow.keras.models import load_model
    except ImportError as error:
        logger.exception("USD/INR model dependencies are unavailable")
        raise HTTPException(
            status_code=503,
            detail="Install the backend forex model dependencies to enable predictions.",
        ) from error

    try:
        lstm_model = load_model(directory / "lstm_forex_model.keras")
        xgb_model = xgb.XGBRegressor()
        xgb_model.load_model(directory / "xgb_forex_model.json")
        feature_scaler = joblib.load(directory / "feature_scaler.pkl")
        target_scaler = joblib.load(directory / "target_scaler.pkl")
    except (OSError, ValueError, ImportError) as error:
        logger.exception("Could not load USD/INR model artifacts from %s", directory)
        raise HTTPException(
            status_code=503,
            detail="Could not load the USD/INR model artifacts; check their files and runtime versions.",
        ) from error

    return lstm_model, xgb_model, feature_scaler, target_scaler


def _calculate_rsi(series: Any, window: int = 14) -> Any:
    delta = series.diff(1)
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    average_gain = gain.ewm(com=window - 1, min_periods=window).mean()
    average_loss = loss.ewm(com=window - 1, min_periods=window).mean()
    relative_strength = average_gain / average_loss
    return 100 - (100 / (1 + relative_strength))


def predict_forex_rates() -> dict[str, Any]:
    try:
        import numpy as np
        import pandas as pd
        import yfinance as yf
    except ImportError as error:
        logger.exception("USD/INR market-data dependencies are unavailable")
        raise HTTPException(
            status_code=503,
            detail="Install the backend forex model dependencies to fetch market data.",
        ) from error

    model_directory = _model_directory()
    lstm_model, xgb_model, feature_scaler, target_scaler = _load_model_artifacts(
        str(model_directory)
    )

    try:
        live_data = yf.download("INR=X", period="6mo", interval="1d", progress=False)
    except Exception as error:
        logger.exception("Could not fetch USD/INR market data")
        raise HTTPException(
            status_code=503,
            detail="Could not fetch current USD/INR market data. Try again later.",
        ) from error

    if live_data is None or live_data.empty:
        raise HTTPException(
            status_code=503,
            detail="The USD/INR market-data provider returned no history.",
        )

    if isinstance(live_data.columns, pd.MultiIndex):
        live_data.columns = live_data.columns.get_level_values(0)
    if "Close" not in live_data.columns:
        raise HTTPException(
            status_code=502,
            detail="The USD/INR market-data response does not contain closing prices.",
        )

    prices = live_data[["Close"]].copy()
    prices.columns = ["Price"]
    prices = prices.dropna()
    prices["Return"] = prices["Price"].diff()
    prices["RSI"] = _calculate_rsi(prices["Price"])
    prices["SMA_20"] = prices["Price"].rolling(window=20).mean()
    prices["SMA_50"] = prices["Price"].rolling(window=50).mean()
    prices = prices.dropna()

    if len(prices) < LOOK_BACK:
        raise HTTPException(
            status_code=503,
            detail="Not enough valid USD/INR history to run the model.",
        )

    try:
        scaled_history = feature_scaler.transform(prices[FEATURE_COLUMNS].values)
        current_sequence = scaled_history[-LOOK_BACK:].copy()
        last_known_price = float(prices["Price"].iloc[-1])
        future_predictions = []

        for _ in range(FORECAST_STEPS):
            sequence_input = current_sequence.reshape(1, LOOK_BACK, len(FEATURE_COLUMNS))
            lstm_prediction = lstm_model.predict(sequence_input, verbose=0)
            last_step_features = sequence_input[:, -1, :]
            xgb_input = np.hstack([last_step_features, lstm_prediction])
            scaled_return = xgb_model.predict(xgb_input)
            predicted_return = float(
                target_scaler.inverse_transform(scaled_return.reshape(-1, 1))[0][0]
            )

            projected_price = last_known_price + predicted_return
            future_predictions.append(projected_price)

            simulated_prices = list(prices["Price"].iloc[-120:].values) + future_predictions
            simulated_series = pd.Series(simulated_prices)
            delta = simulated_series.diff(1)
            gains = delta.where(delta > 0, 0)
            losses = -delta.where(delta < 0, 0)
            average_gain = gains.ewm(com=13, min_periods=14).mean()
            average_loss = losses.ewm(com=13, min_periods=14).mean()
            relative_strength = average_gain / average_loss
            new_rsi = float((100 - (100 / (1 + relative_strength))).iloc[-1])
            if np.isnan(new_rsi):
                new_rsi = 50.0

            new_sma_20 = float(simulated_series.rolling(window=20).mean().iloc[-1])
            new_sma_50 = float(simulated_series.rolling(window=50).mean().iloc[-1])
            raw_features = np.array(
                [[projected_price, predicted_return, new_rsi, new_sma_20, new_sma_50]]
            )
            scaled_features = feature_scaler.transform(raw_features)
            current_sequence = np.vstack([current_sequence[1:], scaled_features[0]])
            last_known_price = projected_price
    except (ValueError, TypeError, IndexError) as error:
        logger.exception("USD/INR model inference failed")
        raise HTTPException(
            status_code=502,
            detail="USD/INR model inference failed; check model and scaler compatibility.",
        ) from error

    forecast_dates = pd.date_range(
        start=prices.index[-1] + pd.Timedelta(days=1),
        periods=FORECAST_STEPS,
        freq="B",
    )
    forecast = [
        {"date": forecast_date.strftime("%Y-%m-%d"), "predicted_price": round(price, 4)}
        for forecast_date, price in zip(forecast_dates, future_predictions)
    ]
    return {
        "status": "success",
        "currency_pair": "INR=X",
        "current_price": round(float(prices["Price"].iloc[-1]), 4),
        "forecast": forecast,
    }

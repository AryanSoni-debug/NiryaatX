# NiryaatX backend prototype

Small, modular FastAPI prototype. It intentionally has **no database, cache,
bundled trained model, or fabricated market/weather/port data**. Responses that
are demonstrations are labelled as such; unavailable external data returns
`status: "unavailable"` with `data: null`.

## Run

```sh
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Interactive API documentation is available at `/docs`; health check is `/health`.
Run tests with `pytest`. The model endpoint also requires the dependencies in
`requirements.txt` and a network connection to Yahoo Finance.

## Endpoints

- `POST /forecast`: deterministic scenario using only a caller-provided baseline
  and percentage assumption. It is not a market forecast or ML result.
- `GET /forex/forecast`: loads the LSTM, XGBoost, and scaler artifacts, fetches
  recent USD/INR history from Yahoo Finance, runs the 20-business-day hybrid
  forecast, and identifies its lowest predicted rate. Set
  `NIRYAATX_FOREX_MODEL_DIR` to the directory containing the four model files;
  by default, it looks for a sibling `gemini/` folder next to this project.
  Market-data or artifact problems are returned as explicit API errors.
- `POST /route`: echoes caller-provided origin, destination, mode, and distance;
  it does not find or optimize a route.
- `POST /weather` and `POST /port`: return an explicit unavailable response.
- `POST /analyze`: basic deterministic checks of supplied shipment fields, not
  compliance advice, risk scoring, or ML analysis.
- `POST /contract`: calculates a SHA-256 digest of supplied text. This is not a
  digital signature, legal review, or persistent contract record.
- `POST /contract/verify`: compares content against a caller-provided SHA-256
  digest; it establishes content equality only.

Request schemas reject unknown fields and validate bounds. FastAPI returns
structured `422` errors for invalid requests.

## Future integrations

Before production use, validate the model API's data provenance, training
methodology, and forecast quality, and connect a trusted market-data provider
for rate history; a routing/geocoding provider for
verified paths and distances; weather and port-operation data providers with
timestamps and provenance; and, if appropriate, a reviewed analysis/model
pipeline. Contract workflows require durable storage, access control, audit
logging, and a proper signing/verification provider. Database and cache
integration should be added behind service interfaces only when their
consistency, retention, and freshness requirements are decided.

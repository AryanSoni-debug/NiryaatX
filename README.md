# NiryaatX

NiryaatX is a prototype for connected export/import currency and shipping-risk intelligence. The landing page uses a generated Three.js ship scene as a temporary visual stand-in. A USD/INR forecast tab can proxy a separately running model API; market, carrier-route, weather, and port-congestion providers are not bundled.

## Run locally

```sh
npm install
npm run dev
```

The Vite frontend is available at `http://localhost:5173`. The FastAPI demonstration backend is in [`backend/`](./backend/); see its README for setup and endpoints. To use a different API origin, set `VITE_API_BASE_URL` in a local `.env` file. The frontend currently presents explicit no-provider states rather than implying that live data has been fetched.

## Firebase Authentication

1. Create a Firebase project and register a web app.
2. In Firebase Console, open **Authentication → Sign-in method** and enable **Email/Password**.
3. Copy `.env.example` to `.env` and replace the placeholder values with the web app's API key, auth domain, project ID, and app ID.
4. Restart the Vite dev server after editing `.env`. Add the deployed site's domain to Firebase Authentication's authorized domains before deploying.

The Firebase web configuration is included in the frontend bundle by design; never put service-account credentials or other private keys in a `VITE_` variable. Firebase Authentication persists the signed-in session in the browser. The selected Exporter/Importer role is a local UI preference only, not an authorization claim; enforce permissions with trusted server-side checks and Firebase security rules.

## Original cargo vessel asset

The website scene loads [`public/models/niryaatx-container-ship.glb`](./public/models/niryaatx-container-ship.glb), an original low-poly-count container vessel with PBR materials and an embedded painted-steel wear atlas. It contains no camera, lighting rig, water, or background. Regenerate the GLB after editing its geometry source with:

```sh
npm run model:cargo-ship
```

The builder is [`scripts/create-cargo-ship.mjs`](./scripts/create-cargo-ship.mjs). The current asset is about 67,000 triangles; this is below the requested 100k–250k target to keep the model practical for a website hero. The procedural mobile/reduced-motion fallback remains in use when the WebGL scene is disabled.

## Prototype behavior

- Shipment details are kept in `sessionStorage` and survive the sign-in redirect for the current browser session.
- Sign-in and sign-up use Firebase Authentication when configured; without Firebase web app settings, those actions remain unavailable.
- The Overview chart is illustrative. The Forecast tab runs the hybrid USD/INR LSTM + XGBoost model using artifacts from a sibling `gemini/` directory by default (`NIRYAATX_FOREX_MODEL_DIR` can point to another folder) and fetches rate history from Yahoo Finance. Weather, port, and logistics-provider data are unavailable.
- Contract fingerprints use SHA-256 on browser-stored demonstration data. A hash verifies data integrity only; it does not verify signer identity, a signature, or an agreement's authenticity.
- The backend's demo endpoints and local contract records are not production authentication, financial advice, or persistent PostgreSQL-backed records.

Before production use, integrate server-side authentication and authorization, persistent storage, validated licensed data providers, trained and monitored forecasting models, real route information, and an appropriate digital-signature workflow.
# NiryaatX 

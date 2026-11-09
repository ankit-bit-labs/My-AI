# My-AI

## Configure the Gemini API key

1. Copy `.env.example` to `.env`.
2. Set `VITE_GEMINI_API_KEY` in `.env` to your Gemini API key.
3. Restart the Vite development server after editing `.env`.

Run the app with:

```sh
npm install
npm run dev
```

Create a production build with `npm run build`, then preview it with `npm run preview`.

This frontend calls Gemini directly. A Vite `VITE_` variable is included in browser code and is **not secret**. Restrict the API key to the needed API and allowed website origins, set usage limits, and rotate the key if it has been shared publicly. Do not use this setup for a public app that needs a private API key.

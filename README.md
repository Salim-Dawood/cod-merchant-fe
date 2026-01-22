# COD Merchant Admin UI (Frontend)

React + Vite admin console for managing platform and merchant data.

## Requirements
- Node.js 18+

## Quick start
1) Install dependencies:
```bash
npm install
```

2) Set API base URL in `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001/api/v1
```

3) Start the dev server:
```bash
npm run dev
```

App runs at `http://localhost:5173`.

## Login
The UI uses platform auth cookies. Use the seeded admin:
- Email: `admin@cod-merchant.local`
- Password: `change-me`

## Build
```bash
npm run build
```
Output goes to `dist/`.

## Render deployment (free tier)
Render can host the frontend as a **Static Site**.

1) Create a **Static Site** for this repo.
2) Build command: `npm install && npm run build`
3) Publish directory: `dist`
4) Set env var: `VITE_API_URL` to your backend URL (e.g. `https://your-api.onrender.com/api/v1`)

Free tier info: `https://render.com/docs/free`

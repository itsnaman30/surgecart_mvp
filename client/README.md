# SurgeCart Client

This is the SurgeCart React client, built with Vite and Tailwind CSS.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open the app at `http://localhost:5173`

## Production build

Build the client for production:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

## Notes

- Tailwind CSS is configured via `postcss.config.js` and `tailwind.config.js`.
- The client communicates with the backend API on `http://localhost:5000` by default.
- The dashboard includes real-time updates via Socket.IO.

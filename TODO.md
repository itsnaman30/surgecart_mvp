# TODO

## Premium version (blank for now)
- [x] Create `client/src/pages/Premium.jsx` as a blank/placeholder Premium page
- [x] Add route `GET /premium` in `client/src/App.jsx`
- [x] Update landing `Pricing` CTA for Pro to link to `/premium`
- [x] Verify in browser that `/premium` renders and CTA navigates correctly (build succeeded)

## Test + scripts sanity fixes
- [x] Fix `cd client && ...` / `cd ... && ...` usage in documentation/usage by ensuring PowerShell-safe separators (`;` instead of `&&`).
- [x] Wire up real backend tests via `server/package.json` using Node’s built-in `node --test` runner.
- [x] Ensure `npm test` from repo root runs backend tests successfully.


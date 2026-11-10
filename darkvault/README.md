# DarkVault

Rebuilt from `DarkVault_Source_Code.pdf` (60 files, formatted with Prettier).

## Not included in the PDF (add these before it will run)

- `src/components/ui/*` — the shared shadcn-style UI kit (button, dialog, input, switch, slider, sonner, ...).
  The app uses custom Button variants: `neon`, `neonOutline`, `success`, `danger`, and sizes `lg`, `xl`.
- `src/assets/darkvault_logo.png.asset.json` and `src/assets/hooded_hacker_binary.jpg`
- `src/routeTree.gen.ts` (generated automatically by `vite dev` / `vite build`)
- `public/icon-192.png`, `public/icon-512.png`, `public/favicon.png`, `public/apple-touch-icon.png`
- `eslint.config.js`, `vitest.config.ts`

## Run

```bash
npm install
npm run dev
```

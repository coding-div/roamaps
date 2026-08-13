# INTEGRATIONS_AND_CONFIG.md — Roamaps

## External Integrations

**None currently active.** The project is a pure static frontend with no API calls, no third-party services, and no backend.

| Integration | Status | Notes |
|-------------|--------|-------|
| GitHub | Connected | Repository: `coding-div/roamaps`, branch: `main` |
| Google Fonts | Active | Space Grotesk, Inter, JetBrains Mono loaded via CDN |
| Umami Analytics | Configured | Via Manus platform env vars (automatic) |
| Google Maps | Available but UNUSED | Template includes Map.tsx but it's not used |

## Environment Variables

All injected automatically by the Manus platform. No manual configuration needed.

| Variable | Purpose |
|----------|---------|
| `VITE_APP_TITLE` | "Roamaps" — site title |
| `VITE_APP_LOGO` | Logo image URL |
| `VITE_APP_ID` | Manus app identifier |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus platform API key |
| `VITE_FRONTEND_FORGE_API_URL` | Manus platform API URL |
| `VITE_OAUTH_PORTAL_URL` | OAuth portal URL |
| `VITE_ANALYTICS_ENDPOINT` | Umami analytics endpoint |
| `VITE_ANALYTICS_WEBSITE_ID` | Umami website ID |
| `JWT_SECRET` | JWT secret (not used in frontend) |
| `OWNER_NAME` | Project owner name |
| `OWNER_OPEN_ID` | Project owner OpenID |
| `BUILT_IN_FORGE_API_KEY` | Built-in Forge API key |
| `BUILT_IN_FORGE_API_URL` | Built-in Forge API URL |

## Build Configuration

### Vite Config (`vite.config.ts`)
- Uses `@vitejs/plugin-react` for React support
- Uses `vite-plugin-manus-runtime` for Manus platform integration
- No custom aliases or proxy configuration

### TypeScript Config (`tsconfig.json`)
- Strict mode enabled
- Target: ESNext
- Module: ESNext
- JSX: react-jsx
- Path alias: `@` → `client/src`

### Package Scripts
```json
{
  "dev": "vite --host",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "preview": "vite preview --host",
  "check": "tsc --noEmit",
  "format": "prettier --write ."
}
```

## Theme Configuration

The app is **forced dark mode**. No light theme exists.

### Global Background
- `#0a0a0f` — near-black background used throughout

### Card/Panel Background
- `#13131a` — slightly lighter for cards, panels, zoom buttons

### Border Color
- `#2a2a35` — subtle borders

### Text Colors
- `#e4e4e7` — primary text (bright white-gray)
- `#c4c4cc` — secondary text
- `#8a8a95` — muted text (labels, hints)
- `#6b6b75` — tertiary text (descriptions)
- `#4a4a55` — very muted text (metadata)
- `#3a3a45` — faint text (footer hints)

### Fonts (Loaded via Google Fonts CDN in `index.html`)
- **Space Grotesk** (400, 500, 600, 700) — headings, node labels, brand
- **Inter** (400, 500, 600) — body text, UI elements
- **JetBrains Mono** (400, 500) — technical/mono text (character counters, metadata)

### Font Usage Rules
- Headings/titles: Space Grotesk, bold
- Node labels: Space Grotesk, semi-bold
- Body/descriptions: Inter, regular
- UI buttons/menus: Inter (via Tailwind `font-sans`)
- Character counters, metadata: JetBrains Mono (via Tailwind `font-mono`)

## Manus-Specific Configuration

- **Project name:** roamaps
- **Project path:** `/home/ubuntu/roamaps`
- **Hosting mode:** Autoscale (serverless)
- **Template:** web-static (React 19 + Tailwind 4)
- **GitHub integration:** Enabled (user: `coding-div`)
- **Deployment:** Via Manus Publish button (requires checkpoint)

## Files NOT to Modify

- `server/index.ts` — production Express server (template, not part of the app logic)
- `components.json` — shadcn/ui config (auto-generated)
- `patches/wouter@3.7.1.patch` — Wouter patch (do not remove)
- `client/src/components/ui/*` — shadcn/ui component library (only add, don't modify existing)

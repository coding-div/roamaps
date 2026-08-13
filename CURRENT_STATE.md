# CURRENT_STATE.md — Roamaps

## Latest Stable Version

- **Manus checkpoint:** `4221609e` (latest)
- **GitHub commit:** Pushed to `coding-div/roamaps` on branch `main`
- **Manus dev server URL:** `https://3000-iegfbk28297hvfijxmrbn-df6483a7.sg1.manus.computer`

## What Works Right Now

### Landing Page (`/`)
- Dark background (#0a0a0f) with the Roamaps logo and tagline
- Two tree cards displayed in a responsive grid (2 columns on desktop, 1 on mobile)
- Cards have hover effects, subtle animations on page load
- Each card shows: title, description, max depth, and branch count
- Clicking a card navigates to the tree view

### Tree View (`/tree/:id`)
- Full-screen dark canvas with subject title at top
- Back button returns to landing page
- Dot grid background pattern
- Tree rendered with orthogonal paths and colored nodes/arrows

### Interactions (Tree Canvas)
- **Zoom:** Pinch-to-zoom (2 fingers), scroll wheel (desktop), +/- buttons (bottom-right)
- **Pan:** Single-finger drag on background (not on nodes/arrows)
- **Reset View:** Home icon button snaps back to default centered view
- **Long-press on node:** Shows action panel with Edit Color, Edit Label, Remove Node
- **Long-press on arrow:** Shows action panel with Edit Color, Remove Arrow
- **Edit Color:** 7 VIBGYOR color options displayed as circular swatches
- **Edit Label:** Text input with 50-character limit counter, Save/Cancel buttons

### Tree Data (Hardcoded)
- **Tree 1** (`tree-1`): "Tree 1" — 3 levels deep, asymmetric branching in multiple directions
- **Tree 2** (`tree-2`): "Tree 2" — 8 levels deep, complex multi-directional branching

## What Does NOT Work (Known Issues)

See `KNOWN_ISSUES.md` for detailed descriptions. Summary:

1. **Arrows still appear parallel to node sides** in some cases — the arrowhead direction is not always perpendicular to the box surface it enters
2. **Crossing arrows are not visually distinguishable** — the small dark circle at intersection points is too subtle to see
3. **Cannot remove the first node of an independent tree** — after disconnecting a subtree, removing its new root node does nothing

## Project Structure (Files)

```
/home/ubuntu/roamaps/
├── client/
│   ├── index.html                          # HTML shell, Google Fonts, viewport
│   ├── public/
│   │   └── .gitkeep
│   └── src/
│       ├── App.tsx                         # Router + ThemeProvider (dark)
│       ├── main.tsx                        # React entry point
│       ├── index.css                       # Tailwind theme tokens (dark mode vars)
│       ├── const.ts                        # Shared constants (template)
│       ├── components/
│       │   ├── ErrorBoundary.tsx           # React error boundary
│       │   ├── ManusDialog.tsx             # Template component
│       │   ├── Map.tsx                     # Google Maps (UNUSED)
│       │   ├── TreeCanvas.tsx              # ★ Main canvas (751 lines)
│       │   ├── ActionPanel.tsx             # ★ Long-press popup (345 lines)
│       │   ├── ColorPicker.tsx             # ⚠️ OBSOLETE (Phase 1 leftover)
│       │   └── ui/                         # shadcn/ui components (mostly unused)
│       ├── pages/
│       │   ├── Home.tsx                    # Landing page (tree cards)
│       │   ├── TreeView.tsx                # Tree viewer page
│       │   └── NotFound.tsx                # 404 page
│       ├── lib/
│       │   ├── treeData.ts                 # ★ Data model + demo trees
│       │   └── utils.ts                    # cn() utility
│       └── contexts/
│           └── ThemeContext.tsx              # Theme management (dark)
├── server/
│   └── index.ts                            # Express static server (production only)
├── shared/
│   └── const.ts                            # Shared constants
├── ideas.md                                # Design brainstorm (Obsidian Canvas)
├── PROJECT_AUDIT_AND_ARCHITECTURE.md       # Earlier audit document (internal)
├── screenshot-notes.md                     # Screenshot observations
├── package.json                            # Dependencies
├── tsconfig.json                           # TypeScript config
└── vite.config.ts                          # Vite build config
```

## Key Code Locations

| File | Purpose | Lines of Interest |
|------|---------|-------------------|
| `client/src/components/TreeCanvas.tsx` | Main canvas rendering, zoom/pan, orthogonal paths, crossing detection, long-press | Full file (751 lines) |
| `client/src/components/ActionPanel.tsx` | Popup menu for nodes/arrows | Full file (345 lines) |
| `client/src/lib/treeData.ts` | Data model, VIBGYOR colors, demo trees, getAllEdges/getAllNodes | Full file |
| `client/src/pages/TreeView.tsx` | Page wrapper, title bar, back button | Full file (59 lines) |
| `client/src/pages/Home.tsx` | Landing page with tree cards | Full file (129 lines) |

## Environment Variables

The project uses these Vite-injected env vars (auto-configured by Manus):
- `VITE_APP_TITLE` — "Roamaps"
- `VITE_APP_LOGO` — logo URL
- `VITE_ANALYTICS_ENDPOINT` / `VITE_ANALYTICS_WEBSITE_ID` — Umami analytics
- `VITE_APP_ID`, `VITE_FRONTEND_FORGE_API_KEY` — Manus platform integration

No custom secrets or API keys are required.

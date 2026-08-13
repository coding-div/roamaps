# Imprint review — branch stage

## Scope

This review covers the Add Joiner toolbar state, fixed 3D joiner marker, joiner action panel, split-arrow tails, reverse-direction lanes, and tablet feedback added to the live Roamaps editor.

## Patterns captured

The new branch patterns are recorded in `context/ui-registry.md`. The implementation reuses the existing dark toolbar, action panel, route hit-target, toast, and Obsidian Cartography visual language instead of adding a separate component style.

## Findings by severity

### Medium — hard-coded visual values are still widespread

`TreeCanvas.tsx`, `ActionPanel.tsx`, `Home.tsx`, and `ColorPicker.tsx` use direct hex values such as `#13131a`, `#2a2a35`, `#0a0a0f`, `#e4e4e7`, and `#3B82F6`. This is consistent with the current design but is not tokenized through `index.css`. **Not auto-fixed in this pass** because moving the entire existing canvas and landing system to semantic tokens would be a separate visual refactor and could change the established trial appearance.

### Low — global UI registry and token documents were previously absent

The registry and branch review now exist, but the project still lacks a complete semantic token/rules document that covers every existing screen. **Not auto-fixed in this pass**; the new registry points to the next cleanup work rather than inventing a second token system.

### Low — Home preview intentionally excludes joiners

The full editor shows joiners, while Home roadmap previews continue to show only the simplified labeled-node preview by user decision. This is an intentional product distinction, not a consistency defect.

## Imprint outcome

The branch-stage UI is visually consistent with the existing Roamaps editor. The remaining findings are recorded for a later tokenization and documentation cleanup; no unrelated style changes are required before this trial checkpoint.


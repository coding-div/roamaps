# Roamaps UI registry

This registry records the reusable visual patterns for the foundation editor. The product language is **Obsidian Cartography**: graphite canvas surfaces, cobalt route signals, mono metadata, restrained borders, and precise map-instrument interactions.

## Canvas toolbar controls

Purpose: provide compact tablet-safe editor actions for Add node, Connect nodes, Undo, Redo, Reset, and view controls.

Pattern: `rounded-lg border border-[#2a2a35] bg-[#13131a] px-3 py-2 text-xs text-[#c4c4cc] transition-all active:scale-95`, with cobalt focus states for placement and connection modes. Toolbar actions are mutually exclusive when they change pointer interpretation.

## Fixed node marker

Purpose: represent a compact map heading that can be placed, moved, recolored, relabeled, and connected without expanding from document content.

Pattern: a fixed-size SVG rounded rectangle with a graphite fill, a thin semantic color stroke, a pale text label clipped with ellipsis, and a larger transparent tablet hit area. The visible shape is also the collision boundary for this foundation trial.

## NodePopup document surface

Purpose: provide unlimited plain-text context without turning the canvas node into a large document card.

Pattern: a centered `role="dialog"` with a graphite surface, a thin cobalt left route-marker edge, a mono `Node document / ####` header, a top-left node heading, an X-only close affordance when clean, an inline textarea during editing, and an explicit cobalt Save action. Unsaved close or node switching uses a focused Save changes / Discard changes decision surface. The empty state uses `No notes yet` and stores no placeholder text.

## Toast and confirmation feedback

Purpose: explain tablet actions and protect destructive operations without adding navigation or side panels.

Patterns: concise success or rejection toasts for placement and deferred features; clear confirmation copy when removing a node that contains popup data, including Undo or Redo that would remove it. Rejected actions create no roadmap-history entry.

## Route styling

Purpose: keep directed graph relationships legible on a dark technical canvas.

Pattern: manually oriented arrowheads, 18px transparent hit paths, 2px colored visible paths, perpendicular node entry and exit, direct aligned routes when valid, orthogonal fallback routes when needed, bridge arches at true crossings, and parallel lane offsets for reverse-direction arrows so they do not overlap.

## Registry maintenance rule

New editor controls must reuse these patterns or add a documented variant here before shipping. Hard-coded SVG colors remain centralized in the roadmap palette until the existing canvas token system is migrated to CSS variables in a separate cleanup pass.

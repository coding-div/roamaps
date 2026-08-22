# Roamaps design direction

## Three possible approaches

### Theme Name: Obsidian Cartography
Very Brief Intro: A dark, precise canvas language inspired by technical maps and spatial note-taking. It makes learning feel like navigating a quiet instrument panel.
Probability: 0.06

### Theme Name: Paper Atlas
Very Brief Intro: A warm editorial system built around parchment, ink, and marginalia. It would make roadmaps feel tactile and archival rather than digital.
Probability: 0.04

### Theme Name: Signal Garden
Very Brief Intro: A luminous, playful system where colored nodes grow into living networks. It would emphasize curiosity and discovery through softer motion and brighter accents.
Probability: 0.08

## Chosen approach: Obsidian Cartography

### Design Movement
Digital brutalism softened by Swiss information design and the spatial discipline of technical cartography.

### Core Principles
1. **Quiet precision:** Every line, node, and label should feel placed rather than decorated.
2. **Spatial hierarchy:** The canvas is the product; controls stay compact and peripheral.
3. **Measured contrast:** Near-black graphite grounds the experience while cobalt marks active knowledge.
4. **Useful density:** Empty space is intentional, but every visible control must earn its place.

### Color Philosophy
Roamaps uses near-black graphite as a low-distraction field, cool slate for structure, cobalt blue for action and focus, and restrained violet as a secondary semantic accent. The palette should feel like a precision instrument at night: calm enough for long study sessions, but with small signals that reward exploration.

### Layout Paradigm
Use an asymmetrical, left-anchored landing layout that opens into a full-bleed editor. Roadmap cards should feel like map sheets laid in a working archive rather than equal generic tiles. The editor should keep the canvas dominant, with controls aligned to the edges and an understated status rail.

### Signature Elements
1. Fine dotted coordinate grids and orthogonal connector lines.
2. Thin cobalt “route markers” that appear at active edges and card tops.
3. Compact uppercase metadata labels with generous tracking, like map annotations.

### Interaction Philosophy
Interactions should feel deliberate and reversible. Hovering reveals structure; selecting creates a precise focus state; adding a node feels like placing a pin; connecting nodes feels like drawing a route. Avoid surprise motion or decorative effects that compete with the map.

### Animation
Use 160–220ms ease-out transitions for buttons, cards, and panel reveals. Stagger landing cards by 50ms. Use subtle opacity and translate transitions only; node and arrow operations should remain immediate. Respect reduced-motion preferences and never animate the canvas while the user is panning.

### Typography System
Use Space Grotesk for display text, roadmap titles, and controls; use IBM Plex Mono for metadata, counts, and canvas annotations. Headlines should be compact and assertive. Body copy should stay small, cool, and information-dense without becoming cryptic.

### Brand Essence
Roamaps is a visual thinking tool for learners who want to see how ideas connect, without the noise of a conventional productivity suite. Personality: **precise, exploratory, composed**.

### Brand Voice
Headlines are short and directional. CTAs describe the action rather than selling it. Microcopy is calm, specific, and honest.

Example lines:

> Build the shape of what you know.

> Place a node. Draw the route.

### Wordmark & Logo
The mark is a compact three-node route glyph: two cobalt points offset around a central junction, joined by one crisp right-angle path. The wordmark is set in a custom-tightened Space Grotesk treatment with a slightly extended “R” leg; never use the plain font treatment without the mark.

### Signature Brand Color
**Route Cobalt — `#4C7DFF`**. It is bright enough to signal focus on graphite without becoming a generic neon accent.

## Style Decisions

- The published project should preserve the original dark canvas editor rather than introduce a generic marketing shell.
- Generated artwork is used sparingly: the logo mark anchors the brand, the constellation supports the landing hero, and tree illustrations appear only as roadmap previews.
- The local-first model remains the product truth: users can build immediately without login, and changes remain stored in their browser.
- The Roamaps identity remains a route-glyph-plus-custom-tight wordmark lockup; it must feel like a map instrument label rather than a default text logo.
- The editor must retain a visible cartographic structure layer—fine coordinate grid, node topology, route lines, or the status rail—even when the map is otherwise sparse.
- Roadmap examples use calm, real-feeling learning-map and route-archive names rather than placeholder tree labels.
- The Home archive is visually connected to the hero through a restrained route trace and archive junction, so the page reads as one continuous cartographic workspace.
- Route Cobalt remains reserved for active route markers, selected states, primary actions, and key junctions; it is not general decoration.

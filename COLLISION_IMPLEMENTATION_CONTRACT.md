# Roamaps Collision-Prevention Contract

**Status:** Approved design contract; implementation may proceed only against the rules below.

## Goal

Normal nodes and joiners must never overlap through their invisible interaction areas. Their visible shapes may appear close, but a placement or movement is invalid when the protected interaction envelopes would intersect.

## Recommended design

Roamaps will use one shared spatial validation system instead of separate ad-hoc checks in Add Node, Add Joiner, and drag handlers. The system will calculate an interaction envelope for every normal node and joiner, test candidate positions against those envelopes, and provide the same collision rule to placement, selection, and movement.

| Object | Visible geometry | Interaction envelope | Collision test |
|---|---|---|---|
| Normal node | Its existing variable-width rounded rectangle | The visible rectangle expanded by a small protected margin | Rectangle-versus-rectangle intersection |
| Joiner | Its existing fixed-radius 3D circle | The visible circle expanded by a protected radius margin | Circle-versus-circle distance and rectangle-versus-circle distance |

The protected margins are expressed in canvas world units so zooming does not change the logical spacing rule. The initial values are **12 world units outside normal node rectangles** and **6 world units outside joiner circles**. The system uses shape-aware geometry rather than comparing only center points; this prevents a wide node from overlapping a joiner or another wide node even when their centers are far apart.

## Placement behavior

Add Node becomes a one-placement mode matching Add Joiner. The user activates the toolbar option, taps the canvas, and Roamaps evaluates one candidate position. A successful placement creates one object and turns the mode off. Pressing the same toolbar option again cancels the mode without creating an object.

The interaction uses a lightweight placement preview. While the candidate is being indicated, the object is shown as a ghost at the selected world position. The ghost is valid only when its interaction envelope is clear. A valid candidate commits on the placement tap; an invalid candidate is not committed, the mode turns off, and a short tablet toast explains the rejection. The preview is a visual aid, not a second object and not persisted.

If the tap lands directly on an existing node or joiner envelope, placement is rejected. If Add Node is tapped directly on any existing arrow hit path, placement is rejected. If Add Joiner is tapped directly on an eligible arrow segment, the joiner is placed there and splits that segment; this includes segments created by an earlier split. An enlarged joiner envelope may overlap the arrow path only for this intentional split-arrow exception. If the arrow segment is too short or otherwise ineligible, Add Joiner placement is rejected. A candidate beside an arrow but not directly on its hit path is valid; the arrow does not block placement, and normal-node routing recalculates around a newly placed normal node without touching it. Joiners remain excluded from routing obstacles according to the approved branch contract.

## Movement behavior

Dragging uses the same interaction-envelope validator. The object follows the finger while the candidate position is valid. When the finger enters an overlapping position, the object shows a temporary invalid/red outline and the candidate is not committed. If the finger is released there, the object returns to the exact position where that drag began. A valid release commits one normal, undoable move. The object never jumps to an automatic nearby position.

Moving a node or joiner across an arrow never auto-attaches it. Existing arrow and split-joiner rules remain unchanged, and attached joiners continue to recalculate their split segments while remaining attached.

## Feedback and recovery

Every rejected placement turns off the active Add Node or Add Joiner mode, requiring the user to activate it manually again. Suggested messages are “Space occupied,” “Tap empty canvas,” and “Choose an open area.” If label growth is blocked by the resized interaction envelope, the message is **“No room for more text.”** A rejected drag is not an undoable graph action because no position was committed; a successful drag remains one undoable move as before.

## Label editing and history

Normal-node envelopes resize with the rendered label. The existing maximum label length remains a character limit, including spaces and line breaks. During editing, input is validated one character at a time. If typing or pasting would exceed the character limit or make the resized envelope overlap another node or joiner, only the longest valid beginning of the new input is kept. Existing text before and after the insertion point is preserved, so middle insertion behaves correctly. The rejected remainder is never added and cannot be redone.

When the user saves a valid label, the complete label change is recorded as one ordinary history transaction. Later user Undo restores the entire previous label, and user Redo restores the complete saved edit. Automatic rejection of a character, paste remainder, placement, or invalid drag creates no visible Undo or Redo entry.

## Existing saved state

The approved invariant is that saved roadmaps contain no overlapping node or joiner envelopes. The implementation does not silently reposition or rewrite old saved roadmaps. New placement, movement, and label edits must preserve the invariant going forward.

## Scope protection

This contract addresses only node/joiner overlap, placement, and movement safety. It does not yet change arrowhead rendering, shared arrow corridors, bypass deletion, joiner arrow splitting, or the approved arrow-routing architecture except where a newly positioned normal node causes existing routes to recalculate around it.

## Approval record

The user approved the shared shape-aware envelope system, the 12/6 world-unit margins, tap-to-place Add Node behavior, ghost preview, direct-arrow rules, intentional joiner-on-any-eligible-segment splitting, invalid drag outline and exact pre-drag restoration, longest-valid input handling, character-limit enforcement, “No room for more text” feedback, and clean separation between automatic rejection and user Undo/Redo history.

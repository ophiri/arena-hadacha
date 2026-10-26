# Design System

## Direction

`זירת ההדחה` is a fictional fight-night broadcast rendered as a complete arcade game shell. It rejects the previous website-like card and footer structure: the interface is now a sequence of full-screen game states—main menu, character select, fight, pause, and result.

The memorable image is four oversized fighter cutouts standing on a hazard-striped broadcast platform while the title and mode menu own the opposite half of the screen.

## Color

- **Stadium black — `#090c18`:** dominant field and deepest shadow.
- **Broadcast navy — `#11162a` / `#1a2038`:** panels, menus, and arena chrome.
- **Scoreboard cream — `#fff0c7`:** primary text and HUD faces.
- **Hazard yellow — `#ffd447`:** primary actions, player-one identity, and selection focus.
- **Broadcast orange — `#ff7048`:** versus marks, ring-out energy, and hazard stripes.
- **Corner cyan — `#67dbff`:** player-two and computer identity.
- **Fighter accents:** pink for Gotliv and green for Bennett.

Color operates in large owned fields. Avoid decorative glows, glass cards, and generic neutral dashboards.

## Typography

Use `Tahoma, "Segoe UI", Arial, sans-serif`. Hebrew display copy is very heavy, tightly spaced, and short. The main title is oversized and shadowed like arena signage. Body copy remains compact; keyboard labels and percentages are isolated LTR where necessary.

## Shape and Material

- Clipped broadcast plates, hazard-striped stage barriers, scoreboard cream HUD panels, and physical keycaps.
- Hard corners and angled cuts dominate; small radii are reserved for circular versus badges and keycaps.
- Shadows use visible offset plus soft depth, like printed signage mounted above a stage.
- Fighter art is treated as a large cutout with a cream keyline and hard cast shadow.

## Screen Composition

- **Main menu:** giant title and vertical mode menu opposite a four-fighter lineup already under arena lights.
- **Character select:** two large opposing fighter previews above a four-card roster; the active chooser is explicit.
- **Fight:** toolbar, Canvas arena, mirrored HUD, and a compact controls ribbon form one console-like frame.
- **Pause/result:** an in-arena broadcast takeover with rematch, roster, and main-menu actions.

RTL governs copy and reading order. Physical left/right controls are never semantically reversed.

## Motion and Feedback

- The main menu uses one authored entrance: title resolves from a broadcast blur while the fighter lineup rises from behind the hazard barrier.
- Gameplay uses short screen shake, impact flash, particles, comic hit words, charge orbit, and synthesized tones.
- Character-specific strips drive Tally’s objection and hammer, Bennett’s shout and kick, Bibi’s sketchpad, and Ben Gvir’s hand throw.
- Respect `prefers-reduced-motion` by removing entrance motion, shake, particle travel, and pulsing.

## Interaction States

Every user-visible state is explicit: home, mode selection, character selection, playing, paused, and round over. The computer mode labels slot two as CPU and removes irrelevant player-two key instructions. Blur, visibility changes, help, pause, restart, and navigation all clear held inputs.

## Voice

Hebrew copy is concise, playful, and fictional. It can joke about broadcasts, percentages, headlines, or the stage, but must not present political claims, real quotations, or factual assertions about the depicted people.

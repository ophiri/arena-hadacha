# Product

<!-- impeccable:product-schema 1 -->

## Platform

Web

## Users

People who want an immediate, short Hebrew browser fighting game: one player facing a simple computer opponent, or two people sharing one physical keyboard. The match should also be legible and entertaining to spectators.

## Product Purpose

Deliver a complete one-arena platform-fighter flow: enter from a main menu, choose a mode and fighter, move, double-jump, attack, build damage, increase knockback, and win by knocking the opponent outside the arena.

## Positioning

An original satirical Israeli political arena fighter presented as a fictional fight-night broadcast, not as a website, campaign, election message, or factual depiction.

## Capabilities and Constraints

- One original arena.
- Five selectable satirical fighters: בנימין נתניהו, איתמר בן גביר, טלי גוטליב, נפתלי בנט, and מנסור עבאס.
- Ben Gvir uses a supplied full sprite set for idle, running, pita, kick, crocodile, and victory animation.
- Bibi uses a supplied full sprite set for idle, running, bomb diagram, champagne, and victory animation.
- Mansour uses a supplied full sprite set for idle, running, hookah smoke, flag attack, and victory animation.
- Single-player against a deterministic computer controller.
- Local two-player on one keyboard, including mirror matches.
- Optional on-screen controls for touch devices, with held movement and charge input.
- User-supplied looping 8-bit background music controlled by the shared sound toggle.
- Every fighter has horizontal movement, a double jump, a unique basic projectile, and a held charge attack capped at 1.5 seconds.
- Attacks deal damage and knockback; accumulated damage increases later knockback.
- A round ends on a ring-out and supports rematch, roster change, or return to the main menu.
- Hebrew RTL interface; physical movement directions remain intuitive.
- No backend, accounts, networking, monetization, or additional arenas.
- Plain HTML, CSS, Canvas 2D, and JavaScript with no runtime packages or external services.

## Brand Commitments

The experience is clearly fictional satire. Preserve the bold dark arcade palette, fight-night broadcast framing, concise Hebrew jokes, and visible parody disclaimer. Use only repository-owned or user-supplied artwork.

## Evidence on Hand

- Repository-owned Bibi and Ben Gvir artwork.
- User-supplied sprite sheets for Tally Gotliv and Naftali Bennett.
- User-supplied full sprite sheet for Mansour Abbas.
- User-supplied `8-Bit Night Drive` music track.
- User-supplied Kahane-hand reference processed into a transparent game asset.
- Existing deterministic JavaScript engine, Node tests, and Playwright browser tests.

## Product Principles

- Look and behave like a game from the first viewport.
- Keep the path from main menu to active fight short and obvious.
- Make the selected mode, fighters, controls, damage, charge, and ring-out state readable at a glance.
- Favor responsive controls and deterministic rules over feature breadth.
- Make rematches faster than explanations.

## Accessibility & Inclusion

Use semantic Hebrew controls, visible keyboard focus, readable contrast, reduced-motion support, keyboard-operable menus, touch targets sized for phones, and live text announcements for round and winner states.

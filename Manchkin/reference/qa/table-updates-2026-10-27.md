# Table and rules update — 2026-10-27

Implemented the eight requested changes:

1. Both curse-target selection paths show target level and personal strength. Active combat curses are included for combatants.
2. Voluntary hand discard is separate from selling. Zero-gold items can be discarded, without earning money or consuming Halfling's doubled sale.
3. Any card with an explicit positive monetary value can be sold, including potions and enhancers. Turn, combat, reaction, pending-effect and level-nine restrictions remain enforced by the engine.
4. Requested local rule: ordinary combat rewards cannot give the primary fighter level ten with a helper. Deferred kill rewards remember the helper at kill time. Explicit existing card exceptions (Elf helper levels, Divine Intervention, Dark after death) remain. Ordinary level cards and sales cannot give the winning level. Combat logs show levels actually gained.
5. Public player areas support delayed hover/focus inspection and click/keyboard pinning. Only equipment, identities, curses, visible stats and hand count are exposed. Individual equipment cards open their complete descriptions, with a return button.
6. Left effects rail displays persistent curses, combat cards, abilities, identity auras and dungeon. It separates temporary fighter/monster modifiers; permanent aura bonuses are explicitly already counted in equipment. New potion/enhancer entries retain author and side across saves.
7. Event cards separate trades, exploration, gear, help, interference and rewards. They show actor, opponent marker, round, sequence and public card thumbnail where available. Added table status, latest event and explicit turn boundaries. The log keeps 100 events and displays 30 in a scrollable area. Narrow layouts put effects in a horizontal strip and events below the table.
8. Human identity is recalculated centrally: no race, or fewer race cards than current multi-race capacity. Equipment restrictions and monster identity modifiers use the same check. The identity section explains when the character is also Human.

Validation:

- Full Node suite: 171 passed, zero failures. Eight regression tests added for sales/discard, action gates, multi-race Human, solo/assisted winning rewards, deferred kills, effect sides/provenance, and permanent auras.
- Three existing assertions were updated to the user's requested solo-winning and Human-with-free-race-slot rules.
- Browser: combat with potion, hostile enhancer and persistent curse; opposing temporary totals; curse target strengths; public equipment dialog and nested full card details; effect detail dialog with author; keyboard/focus preview; zero-price discard; potion sale for 300 gold and resulting log/hand changes.
- QA used 127.0.0.1 origin, separately from the user's localhost save. Previous test-origin save was backed up and restored; temporary fixture page removed.

Screenshots:

- `reference/qa/table-effects-2026-10-27.png`
- `reference/qa/opponent-equipment-2026-10-27.png`

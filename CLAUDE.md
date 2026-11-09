# Low Roller

A speakeasy dice roguelike for **Steam on Windows and macOS** (and Steam Deck). Based on the bar game where the
**lowest total wins**. Low-res 3D look (Three.js, pixelated render + dither), thocky sounds, rounded felt-and-wood UI.
Owner: Colton. Desktop only, no phone or tablet layouts.

## Layout
- `src/index.html` page shell. Loads, in order: `vendor/three.min.js` (r128, pinned), `js/logic.js`, `js/game.js`.
- `src/js/logic.js` **the rules**. Pure data + functions, no DOM. Dice (`DT`), `CHARMS`, `QUIRKS`, `ACTS` (opponents,
  bosses), `LIMITS` (difficulty ladder), `POCKETS` (starting loadouts), `aiRound`, `oddsOf`, `settle`, `theirScore`.
  Also `require()`-able from Node (export at the bottom).
- `src/js/game.js` everything else: rendering, camera (`resize`, `fitCam`), table zones (`traySlots`, `railSlot`),
  fight flow (`startFight` → `startRound` → `playerThrow` → `bank` → `endRound`), screens (`renderMap`, `renderShop`, …),
  saves (`saveRun`, `saveFight`, `resumeRun`), sound (`SFX`).
- `src/styles.css` one ordered stylesheet. `src/fonts/` bundled OFL fonts (no network at runtime).
- `electron/` desktop shell. `tests/` checks. `tools/` helpers.

## Checks you can run (show their output; don't just say it passed)
| What | Command | Time |
|---|---|---|
| Rule unit tests | `npm run test:logic` | <1s |
| Balance gate (sim) | `npm run test:balance` | ~1 min |
| Browser checks, quick | `QUICK=1 npm run test:e2e` | a few min |
| Browser checks, all sizes | `npm run test:e2e` | 10-20 min |
| Run the game | `npm start` | |
| One-off balance run | `npm run sim -- n=800 skill=good lim=0` | |

Browser checks need `pip install playwright && python3 -m playwright install chromium`.
`tests/e2e/dicecheck.py` and `audit.py` take size names (`deck,fhd`) and `shots` to save screenshots.

## Rules that must hold
- **The sim mirrors the game.** `tests/sim/sim.js` replays fight flow from `game.js` (rewards, bar, events, rests,
  boss phase 2, signatures, quirks). Any rule or flow change in `game.js` must be mirrored there, then run the balance gate.
- **Card text = code.** Every charm/die/quirk `desc` must say exactly what the code does. Add a unit test in
  `tests/logic.test.js` for any new rule a player can read.
- **Balance targets** (good bot, 800 runs): Penny Ante 22-40% (aim ~30), Quarter 9-26%, The Big Board 1-12%.
  Deaths should spread across Acts II-III, not pile on one fight. Changing a band is a design decision: say why in the PR.
- **Table zones never overlap.** Back right, from the cup out to the corner: their banked dice. Middle: their throws. Front left, from the corner: your banked dice.
  Banked dice in a row may overlap slightly; dice in different zones never touch. Front: your tray. Every die stays on the felt. `fitCam()` zooms the camera to fit the zones; never move dice to make room.
- **Saves can't be gamed.** Checkpoint at each round start (with their pre-rolled throw + seed), at round end, and after
  every shop/reward/event action. Reloading must never dodge a fight, duplicate a reward, or reroll a round.
- **Desktop only.** Min window 1280×720. Mouse + keyboard first; controller for Steam Deck later.

## Style
- Colors mean the same thing everywhere: gold = odds, red = multiplier/danger, green = cash, teal = nerve.
- Fonts: Limelight (titles), Lilita One (numbers/labels), Nunito (reading). Copy is short, casual, in-world.
- No new `!important` unless JS sets the same property inline. No per-frame DOM reads in `frameFns` (cache on resize).
- Don't copy Balatro. Our identity is the room: felt, wood, brass, cigarette haze.

## Before you open a PR
1. Run the checks that cover what you touched (rules → logic + balance; layout/3D → e2e; saves → `save_reload.py`).
2. Have a fresh-context subagent review the diff against REVIEW.md. Run `/code-review` and `/security-review`.
3. Fill in the PR template (Testing with real output, Risk tier, How to revert).

## How Colton plays it, and the git workflow
Colton isn't publishing this for now; he plays it as a private Claude artifact (https://claude.ai/artifact/449QPYqwVu23fBv1WuRwhD)
on his Mac and phone. It's the desktop layout; one save syncs across devices (`tools/web/cloud-save.js`).
GitHub (private repo, `origin`) is only the backup of the full project. Colton doesn't want PRs or CI waits.
1. Clone/pull `main`, make the change, run the checks that cover it (rules → logic + balance; layout/saves → a quick
   Playwright pass).
2. `node tools/bundle.js`, then republish `dist/low-roller.html` to the artifact URL above (capabilities `{db:{}, user:{}}`).
3. Commit and push straight to `main`.

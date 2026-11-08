# Reviewing Low Roller changes

Start your summary with a count ("2 issues, 1 nit" or "Nothing to fix"). Give a file and line for every finding, plus a
concrete scenario (what the player does → what goes wrong). No guesses from names alone: read the code.
Tag each finding **Important**, **Nit** or **Pre-existing**. At most 3 nits. Don't repost a finding already on the PR.
After 3 review rounds on one PR, stop and ask whether the approach needs rethinking.

## What failure looks like here
- **It lies.** A charm/die/quirk/limit description that doesn't match what `logic.js`/`game.js` actually do.
  A number on the slip ("They lose", "Your odds") that differs from what `settle()` will apply.
- **The sim drifts.** A rule or flow change in `game.js` with no matching change in `tests/sim/sim.js`, or a balance
  change merged without the balance gate's output in the PR.
- **Dice touch or hide.** Anything that moves dice instead of the camera, puts dice/labels under a panel, or lets two
  zones overlap (see "Table zones" in CLAUDE.md). Ask for `dicecheck.py` output.
- **UI covers UI.** Toasts/pops/plates covering headings, the slip or the nameplate; text clipped at 1280×720.
- **Saves can be gamed.** Any new state that isn't saved at the right moment, so a reload dodges a fight,
  repeats a reward/purchase, rerolls a round, or loses progress. Old saves must still load.
- **Async races.** Double clicks that start two flows; `await`s that hang if a tip/menu pauses the game;
  timers that touch the DOM after the screen changed; dice or meshes left in the scene (memory or visual).
- **Electron safety.** `nodeIntegration` on, `contextIsolation` off, remote URLs loaded, `shell.openExternal` on
  untrusted input, new IPC that exposes more than it needs.
- **Performance.** DOM layout reads inside per-frame functions, allocations in the render loop, geometry/material leaks.

## Skip
`src/vendor/`, `src/fonts/`, formatting-only changes, and the screenshot/test-output folders.

## Risk tiers (Colton approves Medium and High)
- **Low** (merge on green checks): copy, numbers inside the balance bands, tests, docs.
- **Medium** (one human look): new charms/dice/opponents, UI layout, camera/table zones, fight flow.
- **High** (Colton plays it before merge): save format/resume, Electron shell, packaging/signing, Steam integration,
  anything in `.github/workflows/`.

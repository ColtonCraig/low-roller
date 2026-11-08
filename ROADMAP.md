# Roadmap to Steam

Running tally, top = next. Each item is one PR unless noted. Tick it off in the PR that finishes it.

## Now
1. ✅ **Remove mobile.** Delete portrait/phone/fold layouts and touch-only code: `PORTRAIT`/`NARROW` branches in
   `resize`, `traySlots`, `railSlot`, `fitCam`; the compact nameplate; `@media (pointer:coarse)`, `(hover:none)`,
   viewport-segment and `max-width:600px` rules; `drag`/touch gestures. Keep 1280×800 (Steam Deck).
   *Done when:* `npm run test:e2e` passes on all desktop sizes and the stylesheet + game.js shrink noticeably.
2. **Desktop input.** Keyboard: Space/Enter bank, 1-9 select dice, Esc menu, F11 fullscreen (Electron already handles F11).
   Hover states for every clickable thing. Windowed/fullscreen toggle in Settings.
3. **First real-hardware pass.** `npm start` on Mac and a Windows PC: frame rate, fonts, audio, window resizing, saves
   surviving restarts. Fix what you find.

## Steam
4. **Steamworks:** register the app ($100 Steam Direct fee), app ID, depots for Windows and macOS.
   Add `steamworks.js` behind the preload bridge: achievements (first boss, each Limit, each loadout), Steam Cloud
   (Auto-Cloud on the Electron userData folder is the simplest start).
5. **Signing.** Mac: Apple Developer account ($99/yr), sign + notarize in CI (`electron-builder` supports both).
   Windows: unsigned works on Steam, but signing avoids SmartScreen warnings if we ever ship outside Steam.
6. **Controller + Steam Deck.** Gamepad API: d-pad/stick to move between dice and buttons, A to select, X to bank.
   Text readable at 1280×800. Aim for "Deck Verified".
7. **Store page.** Capsule art, 5+ screenshots at 1920×1080, a 30-60s trailer, short description, tags.
8. **Beta branch.** Upload builds to a `beta` branch first; promote to default after playing it. Rollback = set the
   previous build live in Steamworks.

## Known issues
- Reloading mid-round and banking differently gives a hint of later throws (seeded rolls). Closing it fully means
  saving after every bank. Low priority.
- `tests/sim/sim.js` is a hand-written mirror of `game.js`; a shared fight-flow module would remove the drift risk.

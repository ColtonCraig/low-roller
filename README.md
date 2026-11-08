# Low Roller

A speakeasy dice roguelike. Lowest total wins. Desktop (Windows + macOS) for Steam.

## Get going (Mac)
```bash
cd low-roller
git init && git add -A && git commit -m "Low Roller: starting point"
gh repo create low-roller --private --source=. --push   # or create it on github.com and push
npm install                                             # Electron + electron-builder
npm start                                               # play it
```
Browser checks (optional locally, they run in CI anyway):
```bash
pip3 install playwright && python3 -m playwright install chromium
QUICK=1 npm run test:e2e
```
Then open Claude Code in this folder (`claude` in the terminal, or the Code tab in the desktop app) and start with
ROADMAP.md item 1. Claude reads CLAUDE.md automatically.

## Set up the review process (once)
1. **Branch protection** on `main` (GitHub → Settings → Branches): require a PR, require the CI checks
   (`Rules + balance`, `Browser checks`, `Package`), dismiss approvals when new commits land.
2. **Claude reviews on every PR:** in Claude Code run `/install-github-app` and follow the prompts. Point the reviewer at
   REVIEW.md. (On a Team/Enterprise plan, Code Review for Claude Code does this with verified, severity-ranked findings.)
3. **Locally, before every PR:** have Claude run the checks and show the output, then `/code-review` and
   `/security-review`, then a fresh-context subagent review of the diff against REVIEW.md.
4. **You approve** Medium and High risk PRs (tiers in REVIEW.md). Low risk merges on green.
5. **Ship** to a Steam `beta` branch first; promote after you've played it. Roll back by setting the previous build live.

## Commands
| | |
|---|---|
| `npm start` | run the desktop app |
| `npm test` | rule unit tests + balance gate |
| `npm run test:e2e` | layout / dice / save checks in a real browser (`QUICK=1` for two sizes) |
| `npm run sim -- n=800 skill=good lim=3` | one balance run (bots: pro, good, mid, casual; `pocket=hustler` etc.) |
| `npm run pack` | unsigned app folder in `dist/` |
| `npm run dist:mac` / `dist:win` | installers (signing setup in ROADMAP) |
| `npm run bundle` | single-file web preview in `dist/low-roller.html` |

## Licenses
Three.js r128 (MIT, `src/vendor/THREE-LICENSE.txt`). Fonts: Limelight, Lilita One, Nunito, Jersey 15, Yellowtail
(SIL Open Font License, `src/fonts/LICENSE-*.txt`), all fine to ship in a commercial game.

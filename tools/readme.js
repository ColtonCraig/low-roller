// Builds README.md: a player's guide (hand-written) plus every card, die, rule and opponent (generated from
// src/js/logic.js, so the tables always match the code).   node tools/readme.js
const fs = require('fs');
const path = require('path');
const L = require('../src/js/logic.js');
const clean = (s) => String(s || '').replace(/\|/g, '/').replace(/\n/g, ' ');
const face = (f) => (f === 'C' ? '♛' : f === 'G' ? '♛(ruby)' : f);
const table = (head, rows) => `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n` + rows.map((r) => `| ${r.map(clean).join(' | ')} |`).join('\n') + '\n';
const TIER = { c: 'Common', u: 'Uncommon', r: 'Rare', x: 'Cursed' };
const img = (f, alt) => `![${alt}](docs/img/${f})`;

const charms = Object.entries(L.CHARMS).sort((a, b) => 'cur'.indexOf(a[1].tier) - 'cur'.indexOf(b[1].tier) || a[1].name.localeCompare(b[1].name));
const dice = Object.entries(L.DT).sort((a, b) => 'curx'.indexOf(a[1].tier) - 'curx'.indexOf(b[1].tier) || a[1].name.localeCompare(b[1].name));
const quirks = Object.entries(L.QUIRKS).filter(([k]) => !L.RULE_Q.includes(k));
const counters = Object.entries(L.QUIRKS).filter(([k]) => L.RULE_Q.includes(k));
const foes = [];
L.ACTS.forEach((A, a) => { const f = A.foes; [['Table', [...f.t1, ...f.t2]], ['Shark', [...f.e1, ...f.e2]]].forEach(([kind, list]) => list.forEach((d) => foes.push([`Act ${'I'.repeat(a + 1).replace('III', 'III')}`, kind, d.n, d.s, d.t === 1 ? 'Tight' : 'Loose', (d.q || []).map((q) => L.QUIRKS[q].name).join(', ') || '–']))); });
const bosses = [];
L.ACTS.forEach((A, a) => (A.foes.bosses || [A.foes.boss]).forEach((b) => { const H = b.half || A.half; bosses.push([A.name, b.n, b.d || A.bossD || '', b.sigT || (H && H.note) || '', H ? `${H.big}: ${H.small}` : '']); }));

const STOPS = [['Table', 'A regular. Pays $5 and a pick of spoils (a die or two commons).'], ['Shark', 'Tougher, hits harder, draws a house rule. Pays $10 and a pick of uncommons. Beat one in 2 rounds or less for a chit.'], ['Burning shark', 'High stakes: +40% nerve, +1 Hits. Pays $15 and a rare.'], ['A stranger', 'An event: a choice, a deal or a gamble.'], ['The bar', 'The shop. Two or three a room.'], ['Back alley', 'Rest, or get a die worked on.'], ['The owner', 'The boss. Pays $20, a rare, Reputation +1 and a deed.']];
const md = `# Low Roller

**A speakeasy dice roguelike. Lowest total wins.**

You walk into a 1920s gambling den with a bag of dice and fifty nerve. Three rooms, three owners, one night. Beat the
table, buy charms at the bar, build a bag of dice that rolls low, and take the joint.

This README is the player's guide: how a round works, how hits are counted, every system, and every charm, die and
opponent in the game (those tables are generated from the code, so they're always current: \`node tools/readme.js\`).

${img('title.png', 'Title screen')}

---

## Contents
1. [The basics](#the-basics)
2. [How a round works](#how-a-round-works)
3. [Hits: margin × odds](#hits-margin--odds)
4. [Plays](#plays)
5. [Guard](#guard)
6. [Your opponent: Hits, tags and intents](#your-opponent-hits-tags-and-intents)
7. [The floor plan](#the-floor-plan)
8. [The bar, Last call and the alley](#the-bar-last-call-and-the-alley)
9. [Charms](#charms)
10. [Dice](#dice)
11. [Finishes, fixtures, crates, drinks, chits](#finishes-fixtures-crates-drinks-chits)
12. [Owners and deeds](#owners-and-deeds)
13. [Limits and pockets](#limits-and-pockets)
14. [Tips and strategy](#tips-and-strategy)
15. [Everything, listed](#everything-listed)
16. [For developers](#for-developers)

---

## The basics
- It's based on a bar dice game where the **lowest total wins**.
- A **crown ♛ scores 0**. A ruby crown also scores 0 and adds +1 odds when you bank it.
- You and your opponent each have **nerve** (health). Win a round and you hit them; lose one and they hit you.
- A run is **three acts** (the Rusty Nail, the Velvet Room, the Back Room), **nine floors each**, ending with that room's owner.
  Beat the third owner and you win the night. *Stay all night* (endless) keeps going, harder every lap.
- Between fights you shop, rest and meet strangers. Everything you buy stays for the whole run.

## How a round works
1. **You draw six dice** from your bag (your bag holds more than six; the rest wait).
2. **They throw first.** Their total is the number to beat, shown as *Sitting on* on their nameplate.
3. **You throw.** Pick at least one die and **bank** it. Banked dice are locked in; the rest get thrown again.
4. Keep throwing and banking until every die is banked. Your banked total is your score.
5. **Lower total wins.** A tie is a push: nobody gets hit.

The slip at the bottom shows the round live: *you vs them*, and *ahead by × your odds = what they lose*.
Click the slip any time for the full breakdown of your odds.

${img('fight.png', 'A round in progress')}

## Hits: margin × odds
**Win a round:** you hit for **margin × your odds**.
- **Margin** = how far under them you finished, plus anything that widens a win (Plays, Dealer's Cut, Haymaker).
- **Odds** start at 1. Charms, finishes, drinks, Plays and reputation **add** to it (+) first, then × effects **multiply** the total.

**Lose a round:** they hit you for **how far over you were × their Hits** (their odds, shown on the nameplate).

Every owner you beat gives **Reputation +1 odds** for the rest of the night. When a hit is bigger than what they had left,
the **overkill pays $1 per 10** (up to $10).

${img('payout.png', 'A payout: every piece of your odds fires in order')}

## Plays
Some banks are **Plays**. Each one you make in a round **adds its level to your margin and adds odds**:

${table(['Play', 'How to make it', 'Odds per level'], L.PLAY_KEYS.map((k) => [L.PLAYS[k].name, L.PLAYS[k].desc, '+' + L.PLAYS[k].per]))}
Every Play starts at level 1. **Every ${L.PLAY_EVERY}th time you make one it levels up** for the rest of the night. The back alley's
*Run the numbers* also levels your most-made Play. Your levels, and how close each Play is to its next level, are in Menu → Your Night.

## Guard
**Guard** soaks hits before your nerve does, and unlike a drink it **stays between rounds** at a table (it resets when you
sit down somewhere new). It only loses what it soaks. Build it with Hip Flask, The Bulldog, The Bodyguard and the
Protection Racket deed; Haymaker turns it into bigger wins. Your Guard shows under your score on the slip.

## Your opponent: Hits, tags and intents
Their **nameplate** (top right) has everything, top to bottom:
- **If they win a round: gap ×N**: how hard their wins land on your nerve (their Hits). It climbs every act.
- **This round / Next round**: what they're up to, in plain words. Green means it helps you, red means it hurts you. You see next round's coming so you can plan your drinks.
- **Their tricks**: their tags. **Tap one** to read it.
- **Plays Tight / Loose**: Tight only keeps 1s and crowns; Loose keeps anything 2 or under.
- **Tags (quirks)**: their special rules (list below).
- **House rules (counters)**: bosses and sharks draw one at random each night, built to punish one kind of build.

${table(['Intent', 'What it does'], Object.values(L.INTENTS).map((i) => [i.name, i.short]))}
**Bosses** have a signature move printed on their door, and get worse at half nerve. **No boss loses more than half their
nerve in one round**, so you always see their second half. One **burning door** per room is a high-stakes shark: 40% more
nerve, hits 1 harder, pays a rare charm.

## The floor plan
Each room is drawn up front. Climb from the bottom row to the owner at the top, **one row at a time along the lines**.

${table(['Stop', 'What happens'], STOPS)}
Floors 5 and 8 are always a choice between the bar and the back alley. From floor 2 on you can **walk past** a table
for a chit instead of fighting. **Tap a stop to see which card it is; tap again to go.**

${img('map.png', 'The floor plan')}

## The bar, Last call and the alley
**The bar** sells dice, charms (sometimes a silver *Off the Books* charm that doesn't take a slot) and drinks, plus:
- **Restock** the shelf (price climbs each time), **crates** (open one, keep one), and **one fixture per room** (permanent).
- **Services:** the back room (reveals a rare), a stiff one (+12 nerve), **toss a die** ($6, then $3 more each time; the bag never goes under 6),
  **file a face** (highest face becomes a 1), **ruby crown** (highest face becomes a ruby crown).
- **Running a tab:** short on cash? Click a price twice and he fronts the rest for $2, up to $15. It comes out of your next winnings.

${img('bar.png', 'The bar')}

**Last call:** after every table the bartender offers one drink and a stiff one, so you can patch up between bars.

**The back alley:** catch your breath (heal 40%), have a House Die loaded, sand an Octo down to a House Die,
*Run the numbers* (+1 level to your most-made Play), or *Get a die marked* (Marked finish, −5 max nerve).

## Charms
Charms sit in your rack at the top and are **always working**. You hold **five** (six with the Back Booth fixture or The Still deed).
Tap a charm to read it or sell it for half. **Drag a charm to any slot** to move it. Order only matters for **The Mimic**: it copies whatever charm sits right of it, so that charm works twice (a little purple arrow on The Mimic and a purple ring on the copied charm show it, and both pulse when it fires). A few charms don't do more twice: Pair of Jacks, Lucky Penny, Deuces Wild, Sleight of Hand and Near Miss.
Rarer charms tend to multiply. The full list is in [Everything, listed](#everything-listed).

## Dice
Your bag is your deck. Six dice come out each round. Better dice have more low faces and crowns; **Octos** (eight sides) mostly roll high.
Toss the bad ones at the bar, file their high faces down, or crown them. Full list below.

## Finishes, fixtures, crates, drinks, chits
**Finishes** (one per die, shown as a glowing rim):
${table(['Finish', 'Effect'], Object.values(L.FINISHES).map((f) => [f.name, f.desc]))}
**Fixtures** (one is offered at the bar each room; yours for good):
${table(['Fixture', 'Price', 'Effect'], Object.values(L.FIXTURES).map((f) => [f.name, '$' + f.price, f.desc]))}
**Crates:**
${table(['Crate', 'Price', 'Effect'], Object.values(L.CRATES).map((f) => [f.name, '$' + f.price, f.desc]))}
**Drinks** ride in your coat (two at most). Tap one on your turn; it lasts the round. Bourbon and a Sidecar work any time.
${table(['Drink', 'Price', 'Effect'], Object.values(L.DRINKS).map((f) => [f.name, '$' + f.price, f.desc]))}
**Chits** are small favors, earned by beating a shark quickly or walking past a table:
${table(['Chit', 'Effect'], Object.values(L.CHITS).map((f) => [f.name, f.desc]))}
## Owners and deeds
${table(['Room', 'Owner', 'Who', 'Signature', 'At half nerve'], bosses)}
Each room has two possible owners, picked at random every night.

**Deeds:** beat an owner and you can take the deed to one of their rackets: strong, with a catch, for the rest of the night.
${table(['Deed', 'What it does'], Object.values(L.DEEDS).map((d) => [d.name, d.desc]))}
## Limits and pockets
Beat the house to raise the **limit**. Each one stacks on every limit below it.
${table(['#', 'Limit', 'Adds'], L.LIMITS.map((l, i) => [i, l.n, l.d]))}
**Pockets** are who you walk in as. Beating owners unlocks more.
${table(['Pocket', 'Start', 'Unlocks after'], L.POCKETS.map((p) => [p.n, p.d, p.need ? p.need + ' owners beaten' : 'start']))}
## Tips and strategy
- **Bank crowns and 1s first.** A crown is a free 0. With few dice left, take what's low and stop chasing.
- **Read their number before you commit.** If they sit on 12, you can afford to bank a 3; if they sit on 2, you need crowns.
- **Build in two directions.** Odds (+ first, then ×) make your wins huge; low-score effects (Lucky Penny, The Ringer,
  Sleight of Hand, filed faces, ruby crowns) make you *win more rounds*. The best runs have both.
- **Thin your bag.** Toss Octos early. The fewer bad dice you own, the more often your good ones come out (but tossing gets pricier).
- **Use the intents.** Drink your Absinthe on an *On tilt* round; save your Bourbon for after a *Leaning in*.
- **Route on purpose.** Plan to hit a bar when your pockets are full and an alley before the owner. Sharks pay better but bite.
- **Guard wins long fights.** Against bosses and anything with Bloodlust or Second Wind, a few rounds of Guard is worth more than odds.
- **Plays snowball.** Pick one or two you make naturally (Pair of Ones with Boxcars or Viper; Crown Court with crown dice) and lean in.
- **Mind the house rules.** Flat Rate turns off ×; The Vig halves your odds; Jinx benches a charm each round. Have a plan B.

## Everything, listed
### Charms (${charms.length})
${table(['Charm', 'Rarity', 'Price', 'What it does'], charms.map(([k, c]) => [c.name, TIER[c.tier], '$' + c.price, c.desc]))}
### Dice (${dice.length})
${table(['Die', 'Rarity', 'Price', 'Faces', 'Notes'], dice.map(([k, d]) => [d.name, TIER[d.tier] || '', d.price ? '$' + d.price : '–', d.faces.map(face).join(' '), d.desc]))}
### Opponent tags
${table(['Tag', 'What it does'], quirks.map(([k, q]) => [q.name, q.desc]))}
### House rules (counters)
${table(['House rule', 'What it does'], counters.map(([k, q]) => [q.name, q.desc]))}
### Regulars and sharks
${table(['Act', 'Kind', 'Name', 'Who', 'Plays', 'Tags'], foes)}
---

## For developers
- \`src/js/logic.js\` holds the rules (data + pure functions, \`require\`-able from Node); \`src/js/game.js\` is everything else.
- \`node tools/bundle.js\` builds the single-file web version (\`dist/low-roller.html\`) that's published as a private Claude artifact.
- Checks: \`node tests/logic.test.js\` (rules), \`node tests/sim/check-balance.js\` (balance gate with the bots),
  \`QUICK=1 python3 tests/e2e/run_all.py\` (browser checks). Bots: \`node tests/sim/sim.js n=300 skill=pro|good|mid lim=0\`.
- \`node tools/readme.js\` rebuilds this README from the code. CLAUDE.md has the working rules.
`;
fs.writeFileSync(path.join(__dirname, '..', 'README.md'), md);
console.log('wrote README.md', md.length, 'chars');

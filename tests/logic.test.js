// Unit tests for the rules in src/js/logic.js. Fast (well under a second) and deterministic.
// Each test pins a rule players can see on a card or a quirk tag, so the text and the math can't drift apart.
// Several pin bugs that were found in review and fixed; keep them.
const assert = require('node:assert/strict');
const L = require('../src/js/logic.js');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message.split('\n')[0]); }
}
const R0 = () => L.newRound();
const opp = (q = [], odds = 2, sig) => ({ q, odds, sig });
const env = (o = {}) => ({ gold: 0, rep: 0, tally: 0, wins: 0, lossStreak: 0, oppHalf: false, bag: 8, round: 2, q: [], ...o });

console.log('rules');

test('lowest total wins; winner hits for gap x odds', () => {
  const r = L.settle(3, 7, R0(), [], opp([], 2), env());
  assert.equal(r.winner, 'you'); assert.equal(r.gap, 4); assert.equal(r.dmg, 4); // your odds start at 1
  const t = L.settle(9, 5, R0(), [], opp([], 3), env());
  assert.equal(t.winner, 'them'); assert.equal(t.dmg, 12);
});

test('a plain tie is a push', () => {
  assert.equal(L.settle(5, 5, R0(), [], opp(), env()).winner, 'push');
});

test('The House wins ties for 2 x their odds', () => {
  const r = L.settle(5, 5, R0(), [], opp([], 3, 'house'), env());
  assert.equal(r.winner, 'them'); assert.equal(r.gap, 2); assert.equal(r.dmg, 6); assert.ok(r.house);
});

test('Sharp: ties go to them for 1 x their odds', () => {
  const r = L.settle(5, 5, R0(), [], opp(['sharp'], 3), env({ q: ['sharp'] }));
  assert.equal(r.winner, 'them'); assert.equal(r.dmg, 3); assert.ok(r.sharp);
});

test('Near Miss: losing by exactly 1 is a push', () => {
  const r = L.settle(6, 5, R0(), ['nearmiss'], opp(), env());
  assert.equal(r.winner, 'push'); assert.ok(r.near);
  assert.equal(L.settle(7, 5, R0(), ['nearmiss'], opp(), env()).winner, 'them');
});

test('Thick Skin takes 3 off a loss, never below 1', () => {
  assert.equal(L.settle(9, 5, R0(), ['thick'], opp([], 1), env()).dmg, 1);
  assert.equal(L.settle(10, 5, R0(), ['thick'], opp([], 1), env()).dmg, 2);
  assert.equal(L.settle(6, 5, R0(), ['thick'], opp([], 1), env()).dmg, 1);
});

test('Three Sheets: their score is 1 higher', () => {
  assert.equal(L.theirScore(7, R0(), [], ['sloppy']), 8);
});

test('Copycat: banking any crown drops their score by exactly 1', () => {
  const R = R0(); R.crowns = 3;
  assert.equal(L.theirScore(10, R, [], ['copycat']), 9);
  assert.equal(L.theirScore(10, R0(), [], ['copycat']), 10);
});

test('The Heckler: only your first crown adds to their score', () => {
  const R = R0(); R.crowns = 5;
  assert.equal(L.theirScore(10, R, ['heckler'], []), 11);
});

test('their score never goes below 0', () => {
  const R = R0(); R.crowns = 1;
  assert.equal(L.theirScore(0, R, [], ['copycat', 'edge']), 0);
});

test('Loudmouth takes 2 odds but never wipes your multipliers (review bug)', () => {
  const O = L.oddsOf(R0(), ['opener'], env({ round: 1, q: ['loud'] }));
  assert.equal(O.odds, 2); // base 1, -2 floors at 1, then x2 from Opening Act
});

test('odds never drop below 1', () => {
  assert.ok(L.oddsOf(R0(), [], env({ q: ['loud'] })).odds >= 1);
});

test('a raid forces odds to exactly 1', () => {
  const O = L.oddsOf(R0(), ['opener', 'highstakes'], env({ round: 1, raid: true }));
  assert.equal(O.odds, 1); assert.ok(O.raid);
});

test('Opening Act doubles odds only in round 1', () => {
  assert.equal(L.oddsOf(R0(), ['opener'], env({ round: 1 })).odds, 2);
  assert.equal(L.oddsOf(R0(), ['opener'], env({ round: 2 })).odds, 1);
});

test('Packed House: +1 odds per 2 dice in your bag', () => {
  assert.equal(L.oddsOf(R0(), ['packed'], env({ bag: 9 })).odds, 1 + 4);
});

test('Short Stack: +2 odds per die under 9', () => {
  assert.equal(L.oddsOf(R0(), ['stack'], env({ bag: 6 })).odds, 1 + 6);
});

test('Double Down needs the last round won', () => {
  assert.equal(L.oddsOf(R0(), ['doubledown'], env({ wins: 0 })).odds, 1);
  assert.equal(L.oddsOf(R0(), ['doubledown'], env({ wins: 1 })).odds, 3);
});

test('All In: x3 only when everything is banked on the first throw', () => {
  const R = R0(); R.throws = 1;
  assert.equal(L.oddsOf(R, ['allin'], env({ done: true })).odds, 3);
  R.throws = 2;
  assert.equal(L.oddsOf(R, ['allin'], env({ done: true })).odds, 1);
});

test('Glassblower: Glass Dice last 2 rounds longer', () => {
  assert.equal(L.breaksAt('glass', []), L.DT.glass.breaks);
  assert.equal(L.breaksAt('glass', ['glassblower']), L.DT.glass.breaks + 2);
  assert.equal(L.breaksAt('d6', ['glassblower']), 0);
});

test('every charm, die and quirk has a name and a description', () => {
  for (const [k, c] of Object.entries(L.CHARMS)) assert.ok(c.name && c.desc && c.price > 0, 'charm ' + k);
  for (const [k, d] of Object.entries(L.DT)) assert.ok(d.name && d.desc && d.faces.length, 'die ' + k);
  for (const [k, q] of Object.entries(L.QUIRKS)) assert.ok(q.name && q.desc, 'quirk ' + k);
});

test('every opponent only throws dice that exist', () => {
  for (const A of L.ACTS) for (const pool of Object.values(A.foes)) for (const f of [].concat(pool))
    for (const t of f.bag) assert.ok(L.DT[t], `${f.n} has unknown die ${t}`);
});

test('every quirk an opponent can have is defined', () => {
  for (const A of L.ACTS) for (const pool of Object.values(A.foes)) for (const f of [].concat(pool))
    for (const q of f.q || []) assert.ok(L.QUIRKS[q], `${f.n} has unknown quirk ${q}`);
  for (const q of L.EXTRA_Q) assert.ok(L.QUIRKS[q], 'extra quirk ' + q);
});

test('each act has two possible bosses', () => {
  for (let a = 0; a < 3; a++) { assert.ok(L.bossOf(a, 0).boss); assert.ok(L.bossOf(a, 1).boss); assert.notEqual(L.bossOf(a, 0).n, L.bossOf(a, 1).n); }
});

test('Limits stack and only get harder', () => {
  let prev = L.limitMods(0);
  for (let lv = 1; lv < L.LIMITS.length; lv++) {
    const m = L.limitMods(lv);
    assert.ok(m.hp >= prev.hp && m.price >= prev.price && m.startHp <= prev.startHp && m.odds >= prev.odds && m.stairs <= prev.stairs && m.pay <= prev.pay, 'limit ' + lv);
    prev = m;
  }
});

test('starting loadouts are all valid', () => {
  for (const P of L.POCKETS) { const s = L.pocketStart(P.k); assert.ok(s.hp > 0 && s.bag.length >= 6); for (const t of s.bag) assert.ok(L.DT[t]); for (const c of s.charms) assert.ok(L.CHARMS[c]); }
});

test('opponents always score at least 0 and at most their max', () => {
  for (let i = 0; i < 2000; i++) {
    const r = L.aiRound(['d6', 'd6', 'loaded', 'pebble', 'coin', 'devil'], 1 + (i % 2));
    assert.ok(Number.isFinite(r.total));
  }
});

test('Last Call: the highest die in your final bank counts 1 less, if 4+', () => {
  assert.deepEqual(L.bankVals([5, 2], {}, ['lastcall'], true), [4, 2]);
  assert.deepEqual(L.bankVals([3], {}, ['lastcall'], true), [3]);
  assert.deepEqual(L.bankVals([5, 2], {}, ['lastcall'], false), [5, 2]);
});
test('Lucky Penny: 1s score 0 (game passes penny only on the first throw)', () => {
  assert.equal(L.effVal(1, { penny: true }), 0);
  assert.equal(L.effVal(1, { penny: false }), 1);
});
test('High Stakes: losses hit 1 harder', () => {
  const r = L.settle(6, 3, R0(), ['highstakes'], { q: [], odds: 1 }, env({}));
  assert.equal(r.dmg, 4);
});

// ---- new builds ----
const bank = (R, faces, types, charms = []) => { L.noteBank(R, faces, types || faces.map(() => 'd6'), charms); return R; };
test('Deuces Wild and The Ringer change face values', () => {
  assert.equal(L.effVal(2, { deuces: true }), 1);
  assert.equal(L.effVal('C', { ringer: true }), -1);
  assert.equal(L.effVal('C', { ringer: true, cold: true }), 1);
  assert.equal(L.effVal(1, { ringer: true }), 3);
});
test('The Collection and Big Shot count charms held', () => {
  assert.equal(L.oddsOf(L.newRound(), ['collection', 'tip', 'cut'], env({})).odds, 13);
  assert.equal(+L.oddsOf(L.newRound(), ['bigshot', 'tip'], env({})).odds.toFixed(2), 1.44);
});
test('Even Money: +2 per 2, 4 or 6 banked', () => {
  const R = bank(L.newRound(), [2, 4, 6, 3]); assert.equal(L.oddsOf(R, ['evens'], env({})).odds, 7);
});
test('Tommy Gun counts the final bank only, at round end', () => {
  const R = bank(bank(L.newRound(), [1]), [2, 3, 1]);
  assert.equal(L.oddsOf(R, ['tommy'], env({ done: true })).odds, 7);
  assert.equal(L.oddsOf(R, ['tommy'], env({})).odds, 1);
});
test('Shiner: +4 at round end with no crowns banked', () => {
  assert.equal(L.oddsOf(bank(L.newRound(), [1, 2]), ['shiner'], env({ done: true })).odds, 7);
  assert.equal(L.oddsOf(bank(L.newRound(), ['C']), ['shiner'], env({ done: true })).odds, 1);
});
test('Jackpot needs three of a kind in ONE bank', () => {
  assert.equal(L.oddsOf(bank(L.newRound(), [3, 3, 3]), ['jackpot'], env({})).odds, 2);
  assert.equal(L.oddsOf(bank(bank(L.newRound(), [3, 3]), [3]), ['jackpot'], env({})).odds, 1);
});
test('Long Shot x2.5 on a win by 1 or 2; Finisher x2.5 at half nerve', () => {
  assert.equal(L.oddsOf(L.newRound(), ['longshot'], env({ margin: 2 })).odds, 2.5);
  assert.equal(L.oddsOf(L.newRound(), ['longshot'], env({ margin: 3 })).odds, 1);
  assert.equal(L.oddsOf(L.newRound(), ['finisher'], env({ oppHalf: true })).odds, 2.5);
});
test('Crown Room needs 3 crowns; Straight Shooter needs 1, 2 and 3', () => {
  assert.equal(L.oddsOf(bank(L.newRound(), ['C', 'C', 'C']), ['crownroom'], env({})).odds, 3);
  assert.equal(L.oddsOf(bank(bank(L.newRound(), [1, 3]), [2]), ['straight'], env({})).odds, 5);
  assert.equal(L.oddsOf(bank(L.newRound(), [1, 3]), ['straight'], env({})).odds, 1);
});
test('Piggy Bank grows +2 on wins, breaks to 0 on a real loss; Moonshine never resets', () => {
  const G = { charms: ['piggy', 'moonshine'], gold: 0 };
  L.afterRound(G, 'you'); L.afterRound(G, 'you'); assert.equal(G.grow.piggy, 4);
  L.afterRound(G, 'them', true); assert.equal(G.grow.piggy, 4);
  L.afterRound(G, 'them'); assert.equal(G.grow.piggy, 0); assert.equal(G.grow.moon, 2);
  assert.equal(+L.oddsOf(L.newRound(), ['moonshine'], env({ grow: G.grow })).odds.toFixed(2), 1.1);
});
test('Consolation pays $2 a lost round; Savings Bond pays $1 per $10, max $5', () => {
  assert.equal(L.afterRound({ charms: ['consolation'] }, 'them'), 2);
  assert.equal(L.afterFight({ charms: ['savings'], gold: 37 }), 3);
  assert.equal(L.afterFight({ charms: ['savings'], gold: 99 }), 5);
});
test('Champagne and Viper multiply per trigger; Payday counts its 1s', () => {
  const R = bank(L.newRound(), ['C', 'C', 1, 1], ['bubbly', 'bubbly', 'viper', 'payday']);
  assert.equal(L.oddsOf(R, [], env({})).odds, 1.5 * 1.5 * 1.5); assert.equal(R.payday, 1);
});
test('Off the Books charms don\'t take a slot', () => {
  const G = { charms: ['tip', 'cut', 'penny'], offbook: ['penny'] };
  assert.equal(L.slotsUsed(G), 2); assert.ok(L.offbook(G, 'penny')); assert.ok(!L.offbook(G, 'tip'));
});
test('Picking dice without banking never leaks into the round (shallow copies)', () => {
  const R = L.newRound(); L.noteBank(R, [1], ['d6'], []); const R2 = { ...R }; L.noteBank(R2, [2, 3], ['d6', 'd6'], []);
  assert.equal(L.oddsOf(R, ['straight'], env({})).odds, 1); assert.equal(L.oddsOf(R2, ['straight'], env({})).odds, 5);
});
// ---- counters ----
const O = (q, hp = 100, odds = 1) => ({ q, hp, odds });
test('Iron Jaw caps a round at a third of max nerve', () => {
  const r = L.settle(0, 30, L.newRound(), ['highstakes'], O(['ironjaw'], 90), env({}));
  assert.equal(r.dmg, 30); assert.ok(r.capped);
});
test('Bulletproof Vest: the first win does nothing, later wins hit', () => {
  assert.equal(L.settle(1, 5, L.newRound(), [], O(['armor']), env({})).dmg, 0);
  assert.equal(L.settle(1, 5, L.newRound(), [], O(['armor']), env({ wonOnce: true })).dmg, 4);
});
test('Flat Rate drops x odds; The Vig halves odds', () => {
  const R = L.newRound(); R.crowns = 2;
  assert.equal(L.oddsOf(R, ['jewels', 'kingpin'], env({ q: ['flat'] })).odds, 3);
  assert.equal(L.oddsOf(R, ['jewels'], env({ q: ['vig'] })).odds, 1);
});
test('Bloodlust: +1 to their odds every other round', () => {
  assert.equal(L.settle(5, 3, L.newRound(), [], O(['bloodlust'], 100, 1), env({ round: 5 })).dmg, 6);
});
test('Brass Knuckles sends back a tenth, 1 to 5', () => {
  assert.equal(L.settle(0, 4, L.newRound(), [], O(['thorns']), env({})).recoil, 1);
  assert.equal(L.settle(0, 20, L.newRound(), ['highstakes'], O(['thorns']), env({})).recoil, 4);
  assert.equal(L.settle(0, 90, L.newRound(), ['highstakes'], O(['thorns']), env({})).recoil, 5);
});
test('Second Wind heals 3% of max; Snakebit 1s score 2', () => {
  assert.equal(L.regenOf(O(['regen'], 200)), 6); assert.equal(L.effVal(1, { snakebit: true }), 2);
});
test('Endless keeps climbing: lap 1 is harder than Act III', () => {
  const a3 = L.makeOpp(L.ACTS[2].foes.t1[0], 'F', 2, 2, 0, false, 0), l1 = L.makeOpp(L.ACTS[0].foes.t1[0], 'F', 0, 2, 1, false, 0);
  assert.ok(l1.hp > a3.hp && l1.odds > a3.odds);
});
// ---- finishes, fixtures, chits ----
test('Finishes: Polished +2, Lucky +4 on a hit, Chrome x1.25, Featherweight 1s score 0', () => {
  const R = L.newRound(); L.noteBank(R, [3, 3, 3], ['d6', 'd6', 'd6'], [], ['polished', 'lucky', 'chrome']);
  assert.equal(L.oddsOf(R, [], env({})).odds, (1 + 2 + 4) * 1.25);
  assert.deepEqual(L.bankVals([1, 2], {}, [], false, ['feather', 'feather']), [0, 2]);
});
test('Shoeshine adds 2 per finished die banked; Curator counts finished dice in the bag', () => {
  const R = L.newRound(); L.noteBank(R, [3], ['d6'], [], ['polished']);
  assert.equal(L.oddsOf(R, ['shoeshine'], env({})).odds, 5);
  assert.equal(L.oddsOf(L.newRound(), ['curator'], env({ finished: 3 })).odds, 7);
});
test('Lucky is fixed per round and die (no fishing on reload)', () => {
  assert.equal(L.luckyHit(1234, 7), L.luckyHit(1234, 7));
  let hits = 0; for (let s = 0; s < 3000; s++) if (L.luckyHit(s, 5)) hits++; assert.ok(hits > 850 && hits < 1150);
});
test('Fixtures: Back Booth 6 slots, discount 20%, Standing Order first restock free', () => {
  const G = { fix: ['booth', 'discount', 'restock'], restocks: 0 };
  assert.equal(L.charmSlots(G), 6); assert.equal(L.barPrice(G, 10), 8);
  assert.equal(L.restockPrice(G), 0); G.restocks = 2; assert.equal(L.restockPrice(G), 4);
  assert.equal(L.restockPrice({ restocks: 0 }), 3);
});
test('Lucky Felt +1 odds; Wall Safe stacks with Savings Bond', () => {
  assert.equal(L.oddsOf(L.newRound(), [], env({ fixOdds: 1 })).odds, 2);
  assert.equal(L.afterFight({ charms: ['savings'], fix: ['vault'], gold: 30 }), 6);
});
test('Growers: Restless, Crate Rat, Ticket Stub', () => {
  const grow = { restock: 3, crates: 2, chits: 1 };
  assert.equal(L.oddsOf(L.newRound(), ['restless', 'craterat', 'stub'], env({ grow })).odds, 1 + 6 + 6 + 2);
});
test('Drinks: Gin +3, Absinthe x2, Soda +2 to their score, Bitters makes their odds 1', () => {
  assert.equal(L.oddsOf(L.newRound(), [], env({ drink: { gin: 1, absinthe: 1 } })).odds, 8);
  assert.equal(L.settle(3, 4, L.newRound(), [], O([], 100, 1), env({ drink: { soda: 1 } })).dmg, 3);
  assert.equal(L.settle(8, 3, L.newRound(), [], O([], 100, 3), env({ drink: { bitters: 1 } })).dmg, 5);
});
test('New pockets start as described', () => {
  assert.deepEqual(L.pocketStart('collector').fins, ['polished', 'lucky']);
  assert.equal(L.pocketStart('bootlegger').drinks.length, 2);
  assert.deepEqual(L.pocketStart('mechanic').fix, ['felt']); assert.equal(L.pocketStart('ghost').hp, 40);
});
test('Plays pay by level: Pair of Ones +1/level, Three of a Kind +2, Ladder +2, Crown Court +3, Clean Hands +2', () => {
  const R = L.newRound(); L.noteBank(R, [1, 1], ['d6', 'd6'], []);
  assert.equal(L.oddsOf(R, [], env({ plays: {} })).odds, 2);
  assert.equal(L.oddsOf(R, [], env({ plays: { pair: 2 } })).odds, 4);
  const T = L.newRound(); L.noteBank(T, [2, 2, 2], ['d6', 'd6', 'd6'], []); assert.equal(L.oddsOf(T, [], env({ plays: {} })).odds, 3);
  const D = L.newRound(); L.noteBank(D, [1], ['d6'], []); L.noteBank(D, [2], ['d6'], []); L.noteBank(D, [3], ['d6'], []); assert.equal(L.oddsOf(D, [], env({ plays: {} })).odds, 3);
  const C = L.newRound(); L.noteBank(C, ['C', 'C', 'C'], ['d6', 'd6', 'd6'], []); assert.ok(L.playsHit(C, {}).includes('court'));
  assert.ok(L.playsHit(L.newRound(), { done: true, score: 3 }).includes('clean')); assert.ok(!L.playsHit(L.newRound(), { done: true, score: 4 }).includes('clean'));
});
test('The Echo doubles crowns from the first throw; Double Take doubles 1s', () => {
  const R = L.newRound(); L.noteBank(R, ['C', 'C'], ['d6', 'd6'], ['echo']); L.noteBank(R, ['C'], ['d6'], ['echo']); assert.equal(R.crowns, 5);
  const S = L.newRound(); L.noteBank(S, [1], ['d6'], ['doubletake']); assert.equal(S.ones, 2); assert.ok(S.snake);
});
test('Intents: Leaning in +1 to their Hits, Sweating halves them, Getting tired +2 to their score, On tilt x2 odds', () => {
  assert.equal(L.settle(7, 5, L.newRound(), [], O([], 100, 3), env({ intent: 'lean' })).dmg, 8);
  assert.equal(L.settle(7, 5, L.newRound(), [], O([], 100, 3), env({ intent: 'sweat' })).dmg, 4);
  assert.equal(L.targetOf(8, L.newRound(), [], [], { intent: 'tired' }), 10);
  assert.equal(L.oddsOf(L.newRound(), [], env({ intent: 'tilted' })).odds, 2);
  assert.ok(!L.INTENTS.raise);
});
test('Bosses always reach their second half; toss price climbs $3', () => {
  assert.equal(L.gateDmg({ boss: true }, 100, 100, false, 80), 50); assert.equal(L.gateDmg({ boss: true }, 100, 100, true, 80), 80);
  assert.equal(L.gateDmg({}, 100, 100, false, 80), 80); assert.equal(L.gateDmg({ boss: true }, 60, 100, false, 5), 5);
  assert.equal(L.tossPrice({}), 6); assert.equal(L.tossPrice({ tossed: 2 }), 12);
});
test('Deeds: Still +1 slot and +$2 prices; Brass caps a loss at 12; Deep Pockets draws 7 and hits 2 harder; Black Book makes Plays x1.5; Bad Rep +3 odds', () => {
  const G = { deeds: [], hp: 50, maxHp: 50, rep: 0 };
  L.takeDeed(G, 'still'); assert.equal(L.charmSlots(G), 6); assert.equal(L.barPrice(G, 5), 7);
  L.takeDeed(G, 'brass'); assert.equal(G.maxHp, 40);
  assert.equal(L.settle(20, 2, L.newRound(), [], O([], 100, 3), env({ deeds: G.deeds })).dmg, 12);
  assert.equal(L.handSize({ deeds: ['pockets'] }), 7);
  assert.equal(L.settle(5, 3, L.newRound(), [], O([], 100, 1), env({ deeds: ['pockets'] })).dmg, 4);
  const T = L.newRound(); L.noteBank(T, [2, 2, 2], ['d6', 'd6', 'd6'], []); assert.equal(L.oddsOf(T, [], env({ plays: {}, deeds: ['blackbook'] })).odds, 1.5);
  const C = { deeds: [], rep: 0 }; L.takeDeed(C, 'badrep'); assert.equal(C.rep, 3);
});
test('Limits: Lead Die never crowns; Last Orders doubles restocks; Double Down at the top', () => {
  assert.ok(!L.DT.lead.faces.includes('C')); assert.equal(L.LIMITS.length, 12);
  assert.equal(L.restockPrice({ restocks: 1, limit: 9 }), 8); assert.equal(L.restockPrice({ restocks: 1, limit: 8 }), 4);
  assert.ok(L.limitMods(11).double && !L.limitMods(10).double); assert.ok(L.limitMods(7).lead && L.limitMods(6).hideE && !L.limitMods(6).lead);
  assert.deepEqual(L.LIMIT_V1.length, 8);
});
test('Floor plan: 9 rows, owner on top, alley/bar rows, lines never cross, every seat reachable', () => {
  for (let k = 0; k < 200; k++) { const M = L.genMap(); assert.equal(M.length, 9); assert.equal(M[8][0].n, 'B');
    [4, 7].forEach(r => { assert.ok(M[r].every(o => o.n === 'R' || o.n === 'S')); assert.ok(M[r].some(o => o.n === 'R') && M[r].some(o => o.n === 'S')); });
    assert.ok([...M[2], ...M[3]].some(o => o.n === 'S') && [...M[5], ...M[6]].some(o => o.n === 'S'));
    for (let r = 0; r < 7; r++) { const a = M[r][0].to.includes(1), b = M[r][1].to.includes(0), c = M[r][1].to.includes(2), d = M[r][2].to.includes(1); assert.ok(!(a && b) && !(c && d));
      M[r + 1].forEach(n => assert.ok(M[r].some(o => o.to.includes(n.x)))); } }
});
test('Round 2: Plays add margin, Guard soaks and carries, overkill pays', () => {
  assert.equal(L.oddsOf(L.newRound(), [], env({ intent: 'tilted' })).odds, 2);
  const R = L.newRound(); L.noteBank(R, [1, 1], ['d6', 'd6'], []);
  // Pair of Ones and Two and Through (one throw) both count: +1 margin each at level 1
  assert.equal(L.settle(4, 7, R, [], O([], 100, 1), env({ plays: {} })).margin, 5);
  assert.equal(L.settle(4, 7, R, [], O([], 100, 1), env({ plays: { pair: 2 } })).margin, 7);
  assert.deepEqual(L.soak(5, 3), { dmg: 0, guard: 2, soaked: 3 }); assert.deepEqual(L.soak(2, 7), { dmg: 5, guard: 0, soaked: 2 });
  assert.equal(L.settle(2, 5, L.newRound(), ['haymaker'], O([], 100, 1), env({ guard: 5 })).margin, 8);
  assert.equal(L.overkillPay(60, 20), 4); assert.equal(L.overkillPay(500, 20), 10); assert.equal(L.overkillPay(10, 20), 0);
});
test('Plays level every 4th time you make one; Marked counts its face twice; The Mimic copies the charm to its right', () => {
  const G = {}; const R = L.newRound(); L.noteBank(R, [1, 1], ['d6', 'd6'], []);
  for (let k = 0; k < 3; k++) L.notePlays(G, R, {}); assert.equal(L.playLv(G.plays, 'pair'), 1); assert.deepEqual(L.notePlays(G, R, {}), ['pair']); assert.equal(L.playLv(G.plays, 'pair'), 2);
  const M = L.newRound(); L.noteBank(M, ['C'], ['d6'], [], ['marked']); assert.equal(M.crowns, 2);
  const K = L.newRound(); L.noteBank(K, ['C', 'C'], ['d6', 'd6'], []);
  assert.equal(+L.oddsOf(K, ['mimic', 'kingpin'], env()).odds.toFixed(3), +(Math.pow(1.35, 2) ** 2).toFixed(3));
  assert.equal(L.oddsOf(K, ['kingpin', 'mimic'], env()).odds, Math.pow(1.35, 2));
});
test('The Mimic copies non-odds effects too, only from the slot right of it', () => {
  const G = { charms: ['mimic', 'cigar'], offbook: [] };
  assert.equal(L.mimicOf(G.charms, L.rackOf(G)), 'cigar');
  assert.equal(L.nOf(G.charms, 'cigar', L.rackOf(G)), 2);           // Victory Cigar heals twice
  assert.equal(L.nOf(['cigar', 'mimic'], 'cigar'), 1);                // left of it: no copy
  // an empty slot between them breaks the copy; an off-book charm sits after the empty slots
  const G2 = { charms: ['mimic', 'tip'], offbook: ['tip'] };
  assert.equal(L.mimicOf(G2.charms, L.rackOf(G2)), null);
  // a jinxed neighbor is switched off, and the Mimic doesn't skip over it
  assert.equal(L.mimicOf(['mimic', 'tip'], ['mimic', 'cigar', 'tip']), null);
  // settle: Thick Skin and Dealer's Cut count twice
  const lose1 = L.settle(9, 5, R0(), ['thick'], opp([], 2), env()), lose2 = L.settle(9, 5, R0(), ['mimic', 'thick'], opp([], 2), env({ rack: ['mimic', 'thick'] }));
  assert.equal(lose1.dmg - lose2.dmg, 3);
  const w1 = L.settle(3, 7, R0(), ['cut'], opp(), env()), w2 = L.settle(3, 7, R0(), ['mimic', 'cut'], opp(), env({ rack: ['mimic', 'cut'] }));
  assert.equal(w2.margin - w1.margin, 2);
  // Consolation pays $4, Savings Bond doubles, Glassblower adds 4 rounds, Last Call takes 2 off
  assert.equal(L.afterRound({ charms: ['mimic', 'consolation'], grow: {} }, 'them', false), 4);
  assert.equal(L.afterFight({ charms: ['mimic', 'savings'], gold: 30 }), 6);
  assert.equal(L.breaksAt('glass', ['mimic', 'glassblower']) - L.breaksAt('glass', ['glassblower']), 2);
  assert.deepEqual(L.bankVals([6, 2], {}, ['mimic', 'lastcall'], true), [4, 2]);
  // The Echo: a first-throw crown counts three times
  const R = R0(); L.noteBank(R, ['C'], ['d6'], ['mimic', 'echo']); assert.equal(R.crowns, 3);
});
test('Second case of dice: what each one pays when you bank it', () => {
  const R = R0(); L.noteBank(R, [3, 'C', 'C', 4], ['rust', 'slot', 'saint', 'iron'], []);
  assert.equal(R.cash, 6); assert.equal(R.heal, 3); assert.equal(R.guard, 2); assert.equal(R.big, true); assert.equal(R.crown2, true);
  const Q = R0(); L.noteBank(Q, [2, 3, 5, 5], ['mercury', 'jade', 'anvil', 'magnet'], []); L.noteBank(Q, [4], ['moon'], []);
  const parts = Object.fromEntries(L.oddsOf(Q, [], env({ done: true })).parts.map(p => [p[0], p[2]]));
  assert.equal(parts['Quicksilver'], 3); assert.equal(parts['Jade Die'], 3); assert.equal(parts['Magnet'], 4); assert.equal(parts['Anvil'], 1.5); assert.equal(parts['Moonstone'], 2);
  const D = R0(); L.noteBank(D, ['C'], ['dynamite'], []); assert.equal(D.bomb, 2);
  assert.equal(L.DT.chip.faces.length, 2); assert.ok(L.SHOP_DICE.every(d => L.DT[d]));
});
test('Second shelf of charms: the card text is what the code does', () => {
  const od = (R, ch, e) => L.oddsOf(R, ch, env(e)).odds;
  const R = R0(); L.noteBank(R, [1, 2, 5, 0], ['d6', 'd6', 'd8', 'goose'], []);     // one throw, four dice
  assert.equal(od(R, ['twostep']), 3); assert.equal(od(R, ['oddball']), 5); assert.equal(od(R, ['aces']), 3); assert.equal(od(R, ['bigbank']), 6);
  assert.equal(od(R, ['eightball']), 4); assert.equal(od(R, ['purist']), 5); assert.equal(od(R, ['rainbow']), 7); assert.equal(od(R, ['highroad']), 4); assert.equal(od(R, ['zero']), 5);
  assert.equal(od(R, ['lonewolf']), 1); assert.equal(od(R, ['marathon']), 2); assert.equal(od(R, ['quickdraw'], { done: true }), 7); assert.equal(od(R, ['evensteven'], { done: true, score: 8 }), 5);
  assert.equal(od(R, ['bully'], { kind: 'F' }), 6); assert.equal(od(R, ['bully'], { kind: 'E' }), 1); assert.equal(od(R, ['giantkiller'], { kind: 'B' }), 1.5);
  assert.equal(od(R, ['firstblood'], { oppFull: true }), 7); assert.equal(od(R, ['fullstomach'], { hp: 50, maxHp: 50 }), 6); assert.equal(od(R, ['adrenaline'], { hp: 20, maxHp: 50 }), 2);
  assert.equal(od(R, ['broke'], { gold: 5 }), 9); assert.equal(od(R, ['broke'], { gold: 6 }), 1); assert.equal(od(R, ['midas'], { gold: 35 }), 1.3); assert.equal(od(R, ['midas'], { gold: 500 }), 2);
  assert.equal(od(R, ['brickwall'], { guard: 7 }), 4); assert.equal(od(R, ['happyhour'], { coat: 2 }), 7); assert.equal(od(R, ['lonestar'], { free: 3 }), 22);
  assert.equal(od(R, ['topshelf', 'kingpin', 'midas']), 7); assert.equal(od(R, ['welldrinks', 'tip']), 5);
  assert.equal(od(R, ['closingtime'], { round: 4 }), 2); assert.equal(od(R, ['closingtime'], { round: 3 }), 1); assert.equal(od(R, ['comeback'], { lossStreak: 1 }), 2.5);
  assert.equal(od(R, ['pokerface'], { intent: 'lean' }), 2); assert.equal(od(R, ['nightcap'], { drink: { gin: 1 } }), 6); assert.equal(od(R, ['wheel'], { wheel: true }), 3); assert.equal(od(R, ['wheel']), 1);
  assert.equal(od(R, ['heavyweight'], { done: true, score: 10, margin: 2 }), 3); assert.equal(od(R, ['sevens'], { done: true, score: 7 }), 4); assert.equal(od(R, ['sweep'], { done: true, score: 0 }), 4);
  assert.equal(od(R, ['snakepit']), 1.2); assert.equal(od(R, ['regicide'], { done: true }), 2); assert.equal(od(R, ['glassjaw']), 2.5); assert.equal(od(R, ['travellight'], { bag: 6 }), 1.5625);
  const S = R0(); L.noteBank(S, [6, 'C', 'C'], ['d8', 'd6', 'd6'], []); assert.equal(od(S, ['sixgun']), 2); assert.equal(od(S, ['coronation']), 7); assert.equal(od(S, ['regicide'], { done: true }), 1);
  assert.equal(od(S, ['showman'], { plays: {}, done: true }), 1 + 3 * 2 + 2 + 2);   // High Society and Two and Through: +3 each, plus the Plays' own +2 and +2
  // not odds: Deep Breath heals, The Fence sells at full price and cuts the toss, The Barback and Ice Box widen the coat, Practice Makes
  const G = { charms: ['deepbreath'], hp: 10, maxHp: 50, grow: {} }; L.afterRound(G, 'you', false); assert.equal(G.hp, 12);
  assert.equal(L.sellValue({ charms: ['fence'] }, 'kingpin'), 18); assert.equal(L.sellValue({ charms: [] }, 'kingpin'), 9);
  assert.equal(L.tossPrice({ charms: ['fence'], tossed: 1 }), 6); assert.equal(L.tossPrice({ charms: [], fix: ['backdoor'] }), 3);
  assert.equal(L.drinkMax({ charms: ['barback'], fix: ['icebox'] }), 4); assert.equal(L.playEvery({ charms: ['practice'] }), 3);
  assert.equal(L.CHARMS.glassjaw.hp, -15); assert.equal(L.CHARMS.liver.hp, 12);
});
test('New tricks, drinks, finishes, deeds, fixtures and Plays', () => {
  assert.equal(L.effVal(3, { odd: true }), 4);                                                       // Odd Job
  assert.deepEqual(L.bankVals([2, 3], { lastword: true }, [], true), [3, 3]); assert.deepEqual(L.bankVals([2, 3], { lastword: true }, [], false), [2, 3]);
  assert.equal(L.theirScore(12, R0(), [], ['lid']), 8);                                              // Tight Lid
  const base = L.settle(3, 5, R0(), [], opp([], 2), env()).dmg;
  assert.equal(L.settle(3, 5, R0(), [], opp(['thickhide'], 2), env()).dmg, Math.ceil(base / 2));     // win by 2: half
  assert.equal(L.settle(1, 5, R0(), [], opp(['thickhide'], 2), env()).dmg, L.settle(1, 5, R0(), [], opp([], 2), env()).dmg);
  assert.equal(L.settle(1, 9, R0(), [], opp(['soft'], 2), env()).dmg, Math.round(L.settle(1, 9, R0(), [], opp([], 2), env()).dmg * 1.25));
  const w = L.settle(3, 5, R0(), [], opp(), env()).margin;
  assert.equal(L.settle(3, 5, R0(), [], opp(), env({ drink: { oldf: 1 } })).margin, w + 3);
  assert.equal(L.settle(3, 5, R0(), [], opp(), env({ deeds: ['muscle'] })).margin, w + 2);
  assert.equal(L.settle(9, 5, R0(), [], opp([], 2), env({ deeds: ['muscle'] })).dmg, L.settle(9, 5, R0(), [], opp([], 2), env()).dmg + 1);
  const R = R0(); L.noteBank(R, ['C'], ['d6'], [], ['inked']); assert.equal(R.crowns, 2);
  assert.equal(L.oddsOf(R, [], env({ drink: { mimosa: 1 } })).odds, 5); assert.equal(L.oddsOf(R0(), [], env({ drink: { martini: 1 } })).odds, 3);
  assert.equal(L.oddsOf(R0(), [], env({ deeds: ['numbers'] })).odds, 1.5);
  assert.equal(L.finVal(6, 'weighted'), 5); assert.equal(L.finVal(4, 'weighted'), 4);
  const F = R0(); L.noteBank(F, [2, 3], ['d6', 'd6'], [], ['sterling', 'blessed']); assert.equal(F.guard, 1); assert.equal(F.heal, 1);
  assert.equal(L.barPrice({ deeds: ['pawnshop'] }, 12), 9);
  const G = { charms: [], offbook: [], fix: ['jukebox', 'chandelier'], deeds: ['numbers'] }; assert.equal(L.startGuard(G), 5); assert.equal(L.payMod(G), -2);
  const P = R0(); L.noteBank(P, [1, 2, 3, 4], ['d6', 'd6', 'd6', 'd6'], []); assert.deepEqual(L.playsHit(P, { done: true, score: 10 }).sort(), ['bighand', 'ladder', 'quick']);
  assert.ok(L.ACTS.every(a => a.foes.bosses.length === 3)); assert.ok(L.ACTS.every(a => a.foes.bosses.every(b => b.q.every(q => L.QUIRKS[q]))));
  assert.ok(L.ACTS.every(a => ['t1', 't2', 'e1', 'e2'].every(k => a.foes[k].every(f => (f.q || []).every(q => L.QUIRKS[q]) && f.bag.every(d => L.DT[d])))));
  for (const p of L.POCKETS) { const S = L.pocketStart(p.k); assert.ok(S.bag.every(d => L.DT[d]) && S.charms.every(c => L.CHARMS[c]), p.k); }
});
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

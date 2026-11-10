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

test('Thick Skin takes 2 off a loss, never below 1', () => {
  assert.equal(L.settle(9, 5, R0(), ['thick'], opp([], 1), env()).dmg, 2);
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
  assert.equal(L.oddsOf(R0(), ['doubledown'], env({ wins: 1 })).odds, 2);
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

test('Last Call: the highest die in your final bank counts 1 less', () => {
  assert.deepEqual(L.bankVals([5, 2], {}, ['lastcall'], true), [4, 2]);
  assert.deepEqual(L.bankVals([1], {}, ['lastcall'], true), [0]);
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
  assert.equal(L.oddsOf(L.newRound(), ['collection', 'tip', 'cut'], env({})).odds, 10);
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
test('Long Shot x2.5 on a win by 1 or 2; Finisher x2 at half nerve', () => {
  assert.equal(L.oddsOf(L.newRound(), ['longshot'], env({ margin: 2 })).odds, 2.5);
  assert.equal(L.oddsOf(L.newRound(), ['longshot'], env({ margin: 3 })).odds, 1);
  assert.equal(L.oddsOf(L.newRound(), ['finisher'], env({ oppHalf: true })).odds, 2);
});
test('Crown Room needs 3 crowns; Straight Shooter needs 1, 2 and 3', () => {
  assert.equal(L.oddsOf(bank(L.newRound(), ['C', 'C', 'C']), ['crownroom'], env({})).odds, 3);
  assert.equal(L.oddsOf(bank(bank(L.newRound(), [1, 3]), [2]), ['straight'], env({})).odds, 3);
  assert.equal(L.oddsOf(bank(L.newRound(), [1, 3]), ['straight'], env({})).odds, 1);
});
test('Piggy Bank grows on wins, halves on a real loss; Moonshine never resets', () => {
  const G = { charms: ['piggy', 'moonshine'], gold: 0 };
  L.afterRound(G, 'you'); L.afterRound(G, 'you'); assert.equal(G.grow.piggy, 6);
  L.afterRound(G, 'them', true); assert.equal(G.grow.piggy, 6);
  L.afterRound(G, 'them'); assert.equal(G.grow.piggy, 3); assert.equal(G.grow.moon, 2);
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
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

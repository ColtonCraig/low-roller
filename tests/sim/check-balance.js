// Balance gate: runs the "good" bot (a solid human) and fails if win rates leave the target bands.
// Targets come from tuning sessions: Penny Ante ~30%, getting harder every Limit, The Big Board in single digits.
// Sims are noisy: bands are wide on purpose. If a change moves a number outside its band, that's a
// design decision to make on purpose (update the band here and say why in the PR), not something to paper over.
const { execFileSync } = require('child_process');
const path = require('path');
const SIM = path.join(__dirname, 'sim.js');
const N = +(process.env.BALANCE_N || 800);

const CHECKS = [
  { args: ['skill=good', 'lim=0'], min: 22, max: 40, label: 'Penny Ante, good bot' },
  { args: ['skill=good', 'lim=3'], min: 9, max: 26, label: 'Quarter, good bot' },
  { args: ['skill=good', 'lim=7'], min: 1, max: 12, label: 'The Big Board, good bot' },
];

let failed = 0;
for (const c of CHECKS) {
  const out = execFileSync(process.execPath, [SIM, `n=${N}`, ...c.args], { encoding: 'utf8' });
  const m = out.match(/WIN (\d+)%/);
  const win = m ? +m[1] : NaN;
  const ok = win >= c.min && win <= c.max;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.label.padEnd(26)} win ${win}%  (target ${c.min}-${c.max}%)`);
  if (!ok) console.log('   ' + out.split('\n').slice(0, 3).join('\n   '));
}
process.exit(failed ? 1 : 0);

// Web preview only (tools/bundle.js inlines this; the desktop app never loads it).
// Mirrors the game's lr-* localStorage keys to the artifact's private per-person storage so one save follows you
// between devices. The game itself still just uses localStorage; this script syncs it before the game starts,
// pushes changes a moment after they happen, and pulls newer progress from another device when the tab comes back.
(function () {
  const LS = localStorage, AT = '_lrAt';            // AT: when this device last changed a game key
  const oSet = Storage.prototype.setItem, oDel = Storage.prototype.removeItem;
  const isGame = (k) => typeof k === 'string' && k.startsWith('lr-');
  const now = () => Date.now();
  let ref = null, started = false, timer = null, writing = false, again = false, synced = false;
  // What this device held before this visit. The first comparison with the cloud uses this, not writes the game made
  // while the cloud was still answering (a tip, a setting), so a slow connection can't push a stale copy over a newer one.
  const bootAt = +LS.getItem(AT) || 0;

  function snapshot() {
    const kv = {};
    for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (isGame(k)) kv[k] = LS.getItem(k); }
    return kv;
  }
  function localAt() { return +LS.getItem(AT) || 0; }
  // Progress only ever goes up: unlocked limits, owners beaten, best nights, the Collection and seen tips are merged
  // (max / union) whichever copy wins, so an older device or an update can never take them away.
  const MAXK = ['lr-limit', 'lr-bossn', 'lr-best', 'lr-bestscore'], UNIONK = ['lr-book', 'lr-tips'];
  const parse = (v) => { try { return JSON.parse(v); } catch (e) { return null; } };
  function union(a, b) { if (!a || typeof a !== 'object') return b; if (!b || typeof b !== 'object') return a; const o = { ...a };
    Object.keys(b).forEach((k) => { o[k] = (o[k] && typeof o[k] === 'object' && typeof b[k] === 'object') ? union(o[k], b[k]) : (o[k] || b[k]); }); return o; }
  // Settings and your last loadout pick belong to you, not to one copy of the save: a copy that never touched them can't
  // wipe them, and when both have them the most recently changed one wins (settings carry their own _t stamp).
  const KEEPK = ['lr-set', 'lr-pick'];
  const stamp = (v) => (parse(v) || {})._t || 0;
  function mergeKV(win, other) { const o = { ...win }; if (!other) return o;
    KEEPK.forEach((k) => { if (other[k] == null) return; if (o[k] == null || stamp(other[k]) > stamp(o[k])) o[k] = other[k]; });
    MAXK.forEach((k) => { const a = +parse(o[k]) || 0, b = +parse(other[k]) || 0; if (a || b) o[k] = JSON.stringify(Math.max(a, b)); });
    UNIONK.forEach((k) => { const a = parse(o[k]), b = parse(other[k]); if (a || b) o[k] = JSON.stringify(union(a || {}, b || {})); });
    return o; }
  // the last three copies of this device's data, kept outside the synced keys, before anything replaces them
  function backup() { try { const bk = parse(LS.getItem('_lrBak')) || []; bk.unshift({ t: now(), kv: snapshot() }); oSet.call(LS, '_lrBak', JSON.stringify(bk.slice(0, 3))); } catch (e) {} }
  function apply(kv, at) {
    backup(); kv = mergeKV(kv, snapshot());
    Object.keys(snapshot()).forEach((k) => oDel.call(LS, k));
    Object.keys(kv).forEach((k) => { if (isGame(k)) oSet.call(LS, k, kv[k]); });
    oSet.call(LS, AT, String(at));
  }
  function startGame() {
    if (started) return; started = true;
    const s = document.createElement('script');
    s.textContent = document.getElementById('lr-game').textContent;
    document.body.appendChild(s);
  }

  async function push() {
    if (!ref || !synced) return;
    if (writing) { again = true; return; }
    writing = true;
    try {
      // never overwrite a newer copy (another device played since): take theirs instead, keeping our progress
      const snap = await ref.get(), r = snap.exists ? snap.data() : null, rkv = r && typeof r.data === 'string' ? parse(r.data) : null;
      if (r && rkv && (r.at || 0) > localAt()) { apply(rkv, r.at); writing = false; if (started) location.reload(); return; }
      const kv = mergeKV(snapshot(), rkv); [...MAXK, ...UNIONK].forEach((k) => { if (kv[k] != null && kv[k] !== LS.getItem(k)) oSet.call(LS, k, kv[k]); });
      await ref.set({ data: JSON.stringify(kv), at: localAt() });
    } catch (e) {}
    writing = false;
    if (again) { again = false; push(); }
  }
  function schedule() { if (!synced) return; clearTimeout(timer); timer = setTimeout(push, 1200); }

  // Any game write marks this device as newer and queues a push.
  Storage.prototype.setItem = function (k, v) {
    oSet.call(this, k, v);
    if (this === LS && isGame(k)) { oSet.call(LS, AT, String(now())); schedule(); }
  };
  Storage.prototype.removeItem = function (k) {
    oDel.call(this, k);
    if (this === LS && isGame(k)) { oSet.call(LS, AT, String(now())); schedule(); }
  };

  // Bring this device and the cloud copy level. Returns once local storage holds the newest save.
  async function reconcile() {
    if (!ref) return;
    let snap; try { snap = await ref.get(); } catch (e) { return; }
    const first = !synced, r = snap.exists ? snap.data() : null, mine = first ? bootAt : localAt(); synced = true;
    if (r && typeof r.data === 'string' && (r.at || 0) > mine) {
      let kv; try { kv = JSON.parse(r.data); } catch (e) { return; }
      if (!kv || typeof kv !== 'object') return;
      apply(kv, r.at || now());
      if (started) location.reload();               // the running game has the old save in memory
      return;
    } else if (!r || mine > (r.at || 0)) {
      if (!mine && !Object.keys(snapshot()).length) return;   // nothing here and nothing there
      if (!localAt()) oSet.call(LS, AT, String(now()));
      push();
    } else if (first && localAt() > mine) push();   // level at boot, then changed while connecting
  }

  async function connect() {
    const c = window.claude;
    if (!c || !c.use) return;
    const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
    const id = db && user && await user.id();
    if (!id) return;
    ref = db.collection('data/users/' + id).doc('low-roller');
    await reconcile();
  }

  document.addEventListener('visibilitychange', () => {
    if (!ref) return;
    if (document.visibilityState === 'hidden') { clearTimeout(timer); push(); }
    else reconcile();
  });

  // Settings lost to the old sync (a copy without them used to replace this device's): bring back the newest backed-up ones.
  try { if (LS.getItem('lr-set') == null) { const bk = parse(LS.getItem('_lrBak')) || [], hit = bk.find((b) => b && b.kv && b.kv['lr-set']); if (hit) oSet.call(LS, 'lr-set', hit.kv['lr-set']); } } catch (e) {}

  // Start the game once synced, or after 4 s with whatever is on this device (it catches up when the cloud answers).
  setTimeout(startGame, 4000);
  connect().then(startGame, startGame);
})();

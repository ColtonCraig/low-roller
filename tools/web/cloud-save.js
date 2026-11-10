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
  function apply(kv, at) {
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
    try { await ref.set({ data: JSON.stringify(snapshot()), at: localAt() }); } catch (e) {}
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

  // Start the game once synced, or after 4 s with whatever is on this device (it catches up when the cloud answers).
  setTimeout(startGame, 4000);
  connect().then(startGame, startGame);
})();

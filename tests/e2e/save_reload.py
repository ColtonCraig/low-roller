# Save/reload: start a fight, finish a round, reload the page mid-fight, hit Continue,
# and check you're back in the same fight with the same nerve on both sides (no dodging a fight by reloading).
#   python3 tests/e2e/save_reload.py
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *
async def turn(pg):
    for _ in range(100):
        await pg.wait_for_timeout(300)
        if await pg.query_selector('#bank') and not await pg.evaluate('busy'): return True
    return False
async def main():
    async with async_playwright() as p:
        b, pg, errs, _ = await open_game(p, 1280, 800)
        await pg.click('#go'); await pg.wait_for_timeout(400)
        await pg.evaluate("SET.tips=false; SET.speed=2.4; 0")
        await pg.click('#stops .entry'); assert await turn(pg), 'never reached your turn'
        await pg.evaluate("tray().forEach(o=>toggleSel(o)); document.querySelector('#bank').click(); 0")
        await pg.wait_for_timeout(6000)
        saved = await pg.evaluate("(JSON.parse(localStorage.getItem('lr-save')||'{}')).at")
        before = await pg.evaluate("({hp:G.hp, ohp:F.oppHp, n:F.opp.n})")
        await pg.reload(); await pg.wait_for_timeout(2500)
        await pg.evaluate("SET.tips=false; 0"); await pg.click('#cont0'); r=await turn(pg)
        if not r: await pg.screenshot(path='/tmp/claude-0/-home-claude/2a8a4667-47dd-501b-97ca-f97176ec3ef7/scratchpad/sr_fail.png'); print('DEBUG', errs, await pg.evaluate("[!!F, F&&F.round, typeof busy!=='undefined'&&busy, document.querySelector('#ui').className, (document.querySelector('.msg')||{}).textContent]"))
        assert r, 'resume never reached your turn'
        after = await pg.evaluate("({hp:G.hp, ohp:F.oppHp, n:F.opp.n})")
        ok = saved == 'fight' and before == after and not errs
        print('save at:', saved); print('before:', before); print('after: ', after); print('errors:', errs)
        print('PASS' if ok else 'FAIL'); await b.close()
        sys.exit(0 if ok else 1)
asyncio.run(main())

# Music scenes: each part of a run picks the right music.
#   python3 tests/e2e/music_scenes.py
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *
async def main():
    async with async_playwright() as p:
        b, pg, errs = await open_game(p, 1280, 800)
        await pg.click('#go'); await pg.wait_for_timeout(500)
        await pg.evaluate("SET.tips=false; 0")
        got = {'map': await pg.evaluate("musicScene()")}
        await pg.evaluate("renderShop(); 0"); await pg.wait_for_timeout(300)
        got['bar'] = await pg.evaluate("musicScene()")
        await pg.evaluate("renderMap(); 0"); await pg.wait_for_timeout(300)
        await pg.click('#stops .entry'); await pg.wait_for_timeout(150); await pg.evaluate("(()=>{ const e=document.querySelector('#stops .entry.sel'); if(e) e.click(); })()"); await pg.wait_for_timeout(800)
        got['fight'] = await pg.evaluate("musicScene()")
        await pg.evaluate("F.kind='B'; 0")
        got['boss'] = await pg.evaluate("musicScene()")
        await pg.evaluate("F.phase2=true; 0")
        got['boss2'] = await pg.evaluate("musicScene()")
        await pg.evaluate("G.hp=0; 0")
        got['lost'] = await pg.evaluate("musicScene()")
        n0 = await pg.evaluate("beatN"); await pg.wait_for_timeout(2500); n1 = await pg.evaluate("beatN")
        want = {'map':'room','bar':'bar','fight':'fight','boss':'boss','boss2':'boss2','lost':'room'}
        ok = got == want and n1 > n0 and not errs
        print('scenes:', got); print('beats advanced:', n0, '->', n1); print('errors:', errs); print('PASS' if ok else 'FAIL')
        await b.close(); sys.exit(0 if ok else 1)
asyncio.run(main())

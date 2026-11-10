# Shared Playwright harness: opens src/index.html straight from disk at a given window size.
# Uses Playwright's bundled Chromium (pip install playwright && python -m playwright install chromium).
# Set CHROME=/path/to/chrome to use another build. SwiftShader is forced so results match on CI
# machines without a GPU; on your own machine you can set LR_GPU=1 to use the real GPU.
import os, pathlib
from playwright.async_api import async_playwright  # re-exported for the test scripts
INDEX = (pathlib.Path(__file__).resolve().parents[2] / 'src' / 'index.html').as_uri()
# Desktop window sizes we ship for (inner size of the game window).
DESKTOP = {
  'tablet': (1000, 703),   # Colton's phone/tablet, landscape (the artifact viewer)
  'deck':   (1280, 800),   # Steam Deck, and the minimum window height we allow
  'hd':     (1280, 720),   # minimum window size
  'laptop': (1366, 768),
  'mba13':  (1470, 956),   # MacBook Air 13" default scaling
  'mbp14':  (1512, 982),
  'wxga':   (1440, 900),
  'fhd':    (1920, 1080),
  'qhd':    (2560, 1440),
}
async def open_game(p, w, h):
    args = [] if os.environ.get('LR_GPU') else ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    kw = {'args': args}
    if os.environ.get('CHROME'): kw['executable_path'] = os.environ['CHROME']
    b = await p.chromium.launch(**kw)
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1)
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(INDEX); await pg.wait_for_timeout(1600)
    return b, pg, errs

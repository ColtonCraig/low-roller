# Runs every browser check and fails if any fails. Desktop sizes only.
#   python3 tests/e2e/run_all.py            all sizes (slow under software rendering: ~10-20 min)
#   QUICK=1 python3 tests/e2e/run_all.py    two sizes (deck + fhd): a few minutes; use while iterating
import subprocess, sys, os, time
here = os.path.dirname(os.path.abspath(__file__))
sizes = 'deck,fhd' if os.environ.get('QUICK') else ''
steps = [('layout audit', ['audit.py', sizes]), ('dice check', ['dicecheck.py', sizes]), ('save/reload', ['save_reload.py'])]
failed = []
for name, args in steps:
    t = time.time(); print(f'--- {name}', flush=True)
    r = subprocess.run([sys.executable, os.path.join(here, args[0])] + [a for a in args[1:] if a])
    print(f'--- {name}: {"PASS" if r.returncode == 0 else "FAIL"} ({time.time()-t:.0f}s)', flush=True)
    if r.returncode: failed.append(name)
print('ALL PASS' if not failed else 'FAILED: ' + ', '.join(failed))
sys.exit(1 if failed else 0)

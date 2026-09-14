from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = '<script src="/assets/concierge-locale-defaults.js?v=1"></script>'
CAROUSEL_RE = re.compile(r'(<script\s+src=["\']/?assets/concierge-carousel\.js[^>]*></script>)', re.I)
SELECTED_RE = re.compile(r'data-selected=["\'][^"\']*["\']', re.I)


def update(path: Path) -> bool:
    text = path.read_text(encoding='utf-8')
    if 'data-concierge-carousel' not in text or 'concierge-carousel.js' not in text:
        return False

    fixed = text
    rel = path.relative_to(ROOT).as_posix()
    if rel.startswith('en/'):
        fixed = SELECTED_RE.sub('data-selected="lukas"', fixed)
    elif rel.startswith('tr/'):
        fixed = SELECTED_RE.sub('data-selected="leyla"', fixed)

    if '/assets/concierge-locale-defaults.js' not in fixed:
        fixed, count = CAROUSEL_RE.subn(SCRIPT + '\n    ' + r'\1', fixed, count=1)
        if count != 1:
            raise SystemExit(f'Could not inject locale defaults into {rel}')

    if fixed == text:
        return False
    path.write_text(fixed, encoding='utf-8')
    print(f'updated {rel}')
    return True


changed = 0
for path in sorted(ROOT.rglob('*.html')):
    if any(part in {'.git', 'node_modules'} for part in path.parts):
        continue
    changed += int(update(path))
print(f'changed={changed}')

"""Rebuild the self-contained Sandbox HTML from the tracked module sources."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HTML = ROOT.parent / 'Sandbox_Styles_v8_WORKING.html'
MODULES = (
    'editor-store.js', 'engine.js', 'ai-contract.js', 'map-v5.js', 'editor.js',
    'adaptation.js', 'image-normalization.js', 'collect-ui.js', 'ai-ui.js', 'program-copy.js', 'media-v7.js',
)

src = HTML.read_text(encoding='utf-8')
# The historical build depended on uploads/Sandbox_Original.html, which is not
# included in the public repository. Strip the previously inlined modules from
# the tracked standalone file instead, keeping the already-built app shell.
marker = '<script>\n/* Independent editor presets.'
start = src.find(marker)
body = src.rfind('</body>')
if body < 0:
    raise SystemExit('Sandbox HTML is missing </body>.')
if start >= 0 and start < body:
    src = src[:start] + src[body:]

bundle = '\n'.join(
    '<script>\n' + (ROOT / name).read_text(encoding='utf-8').replace('</script', '<\\/script') + '\n</script>'
    for name in MODULES
)
assert src.count('</body>') == 1, 'Expected one closing body tag.'
src = src.replace('</body>', bundle + '\n</body>', 1)
HTML.write_text(src, encoding='utf-8')
print(f'Built {HTML} ({HTML.stat().st_size:,} bytes; {len(MODULES)} modules)')

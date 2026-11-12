"""Rebuild the orange knockout labels (panel eyebrows + FOUNDER tags) in
index.html as SVG masks made of glyph PATHS, so they render identically in
every browser (SVG <text> inside <mask> is unreliable on Brave/Android etc).

Run from repo root:  uv run --with fonttools python scripts/build-labels.py
Output is a single evenodd compound path per label (no mask/text/ids).
Font: .tools/fonts/IBMPlexMono-SemiBold.ttf (IBM Plex Mono, OFL).
"""
import re, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, '.tools', 'fonts', 'IBMPlexMono-SemiBold.ttf')
HTML = os.path.join(ROOT, 'index.html')

H = 18          # viewBox height (units)
PAD = 18        # side padding (units)
FONT_PX = 11.5  # cap size in viewBox units, matches the old CSS font-size
TRACK = 0.14    # letter-spacing in em
BASE = 12.7     # baseline y

font = TTFont(FONT)
upem = font['head'].unitsPerEm
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
scale = FONT_PX / upem

def label_svg(mask_id, text):
    text = text.upper()
    adv = 0.0
    d_parts = []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(glyphs)
        # flip y, scale to viewBox units, translate to pen position
        glyphs[g].draw(TransformPen(pen, (scale, 0, 0, -scale, adv + PAD, BASE)))
        p = pen.getCommands()
        if p:
            d_parts.append(p)
        adv += glyphs[g].width * scale + FONT_PX * TRACK
    adv -= FONT_PX * TRACK  # no tracking after the last glyph
    w = round(adv + 2 * PAD, 1)
    # shift paths right by PAD
    d = ' '.join(d_parts)
    # One compound path: the block rectangle plus every glyph outline, filled
    # with the even-odd rule so the letters are holes. No <mask>, no <text>,
    # no ids -- nothing a mobile browser can get wrong.
    rect = 'M0 0H{w}V{h}H0Z'.format(w=w, h=H)
    d = rect + ' ' + ' '.join(d_parts)
    return ('<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" aria-hidden="true">'
            '<path fill="currentColor" fill-rule="evenodd" d="{d}"/></svg>').format(w=w, h=H, d=d)

s = open(HTML, newline='').read()
n = 0
def repl_panel(m):
    global n; n += 1
    label = m.group(1)
    return '<p class="product-index reveal" aria-label="%s">%s</p>' % (label, label_svg('pi-%d' % n, label))
s = re.sub(r'<p class="product-index reveal" aria-label="([^"]+)"><svg.*?</svg></p>', repl_panel, s, flags=re.S)
k = 0
def repl_f(m):
    global k; k += 1
    return '<p class="founder-mark" aria-label="Founder">%s</p>' % label_svg('fm-%d' % k, 'Founder')
s = re.sub(r'<p class="founder-mark" aria-label="Founder"><svg.*?</svg></p>', repl_f, s, flags=re.S)
assert n == 5 and k == 2, (n, k)
s = re.sub(r'css/styles\.css\?v=(\d+)', lambda m: 'css/styles.css?v=%d' % (int(m.group(1)) + 1), s)
open(HTML, 'w', newline='').write(s)
print('rebuilt', n, 'panel labels and', k, 'founder tags')

"""Build the self-contained client; requires Pillow, no build-time npm packages."""
import base64
import json
import math
import re
import zlib
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SIZE = 384
color = Image.open(ROOT / 'assets/lroc_color_2k.jpg').convert('RGB')
height = Image.open(ROOT / 'assets/ldem_3_8bit.jpg').convert('L')

def sample(image, u, v):
    x = (u % 1) * (image.width - 1)
    y = max(0, min(1, v)) * (image.height - 1)
    ix, iy = int(x), int(y)
    fx, fy = x - ix, y - iy
    samples = [image.getpixel((a % image.width, min(b, image.height - 1)))
               for a, b in [(ix, iy), (ix+1, iy), (ix, iy+1), (ix+1, iy+1)]]
    if image.mode == 'RGB':
        samples = [0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2] for p in samples]
    return ((samples[0] * (1-fx) + samples[1] * fx) * (1-fy)
            + (samples[2] * (1-fx) + samples[3] * fx) * fy)

pixels = bytearray(SIZE * SIZE)
preview = Image.new('RGBA', (SIZE, SIZE))
radius = SIZE / 2 - 1
light = (-0.36, 0.16, math.sqrt(1 - 0.36**2 - 0.16**2))
for y in range(SIZE):
    for x in range(SIZE):
        nx = (x + 0.5 - SIZE/2) / radius
        ny = -(y + 0.5 - SIZE/2) / radius
        rho = nx*nx + ny*ny
        if rho >= 1:
            continue
        nz = math.sqrt(1-rho)
        lon = math.atan2(nx, nz)
        lat = math.asin(ny)
        u, v = 0.5 + lon / (2*math.pi), 0.5 - lat / math.pi
        albedo = sample(color, u, v) / 255
        # LOLA height gradients perturb the surface normal for subtle crater relief.
        du, dv = 1/height.width, 1/height.height
        east = (sample(height, u+du, v) - sample(height, u-du, v)) * (20/255) / (2*du*2*math.pi*1737.4*max(.15, math.cos(lat)))
        north = (sample(height, u, v-dv) - sample(height, u, v+dv)) * (20/255) / (2*dv*math.pi*1737.4)
        bx = nx - east*math.cos(lon) + north*math.sin(lat)*math.sin(lon)
        by = ny - north*math.cos(lat)
        bz = nz + east*math.sin(lon) + north*math.sin(lat)*math.cos(lon)
        norm = math.sqrt(bx*bx + by*by + bz*bz)
        mu0 = max(0, (bx*light[0] + by*light[1] + bz*light[2]) / norm)
        # Lunar regolith is mostly diffuse backscatter, not a shiny Lambert ball.
        ls = 2*mu0 / max(.001, mu0+nz)
        illumination = .78*ls + .22*mu0
        value = round(255 * min(.94, max(0, (albedo**1.24 * 1.06) * illumination + albedo*.012)))
        pixels[y*SIZE+x] = value
        edge = radius - math.hypot(x+.5-SIZE/2, y+.5-SIZE/2)
        alpha = round(max(0, min(1, edge+.5))*255)
        preview.putpixel((x, y), (value, round(value*.993), round(value*.975), alpha))

token_path = ROOT / 'tools/tokens.json'
if not token_path.exists():
    old = (ROOT / 'lib/client.js').read_text(encoding='utf-8')
    tokens = re.search(r'var TOKENS = (\{.*?\n\s*\});', old, re.S).group(1)
    tokens = re.sub(r'\b(light|dark):', r'"\1":', tokens)
    token_path.write_text(json.dumps(json.loads(tokens), ensure_ascii=False, indent=2), encoding='utf-8')
tokens = json.loads(token_path.read_text(encoding='utf-8'))
template = (ROOT / 'tools/client.template.js').read_text(encoding='utf-8')
client = template.replace('__ORBIT_TOKENS__', json.dumps(tokens, ensure_ascii=False))
rocket_svg = (ROOT / 'assets/rocket-cursor.svg').read_text(encoding='utf-8')
client = client.replace('__ORBIT_ROCKET_SVG__', json.dumps(rocket_svg))
text_svg = (ROOT / 'assets/text-cursor.svg').read_text(encoding='utf-8')
client = client.replace('__ORBIT_TEXT_CURSOR_SVG__', json.dumps(text_svg))
resize_svg = (ROOT / 'assets/resize-cursor.svg').read_text(encoding='utf-8')
resize_svgs = {
    axis: resize_svg.replace('<g id="resize-axis">', f'<g id="resize-axis" transform="rotate({angle} 16 16)">')
    for axis, angle in [('ew', 0), ('ns', 90), ('nwse', 45), ('nesw', -45)]
}
client = client.replace('__ORBIT_RESIZE_SVGS__', json.dumps(resize_svgs))
client = client.replace('__ORBIT_MOON_PIXELS__', base64.b64encode(pixels).decode('ascii'))
# Export the generated cutout to a compact, alpha-preserving runtime pixel asset.
# Bundled pixels draw without remote requests or a CSP img-src/data exemption.
astronauts = Image.open(ROOT / 'assets/floating-astronaut-v2.png').convert('RGBA')
astronauts = astronauts.resize((640, 427), Image.Resampling.LANCZOS)
packed = zlib.compress(astronauts.tobytes(), 9)
client = client.replace('__ORBIT_ASTRONAUT_PIXELS__', base64.b64encode(packed).decode('ascii'))
(ROOT / 'lib/client.js').write_text(client, encoding='utf-8')
preview.save(ROOT / 'assets/moon-rendered.png')
print(f'Built {ROOT / "lib/client.js"}: {len(client):,} bytes')

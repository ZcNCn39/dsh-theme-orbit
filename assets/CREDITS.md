Moon maps: NASA's Scientific Visualization Studio, CGI Moon Kit (SVS 4720).
Source: https://svs.gsfc.nasa.gov/4720/
Visualizer: Ernie Wright. Scientist: Noah Petro (NASA/GSFC).
Color: LRO / LROC WAC, lroc_color_2k.jpg (2025 map).
Elevation: LRO / LOLA, ldem_3_8bit.jpg.

moon-rendered.png and the bundled moon pixels are derived orthographic renderings
with a fixed decorative light direction, not the current astronomical phase.
Run tools/build.py with Pillow to rebuild the self-contained lib/client.js.

floating-astronauts-v1.png: generated with the built-in image_gen tool on 2026-10-22.
Prompt summary: three photorealistic white-suited EVA astronauts, one large and
two distant, yawed left approximately 30 degrees and reclined approximately
60 degrees, hands and feet spread in a relaxed zero-gravity pose; isolated on
a transparent background. The original alpha is preserved in the runtime export.

floating-astronaut-v2.png: edited with the built-in image_gen tool on 2026-10-22
from floating-astronauts-v1.png. Only the large astronaut is retained, enlarged
to fill the composition, with both hands raised above the shoulders.
The runtime now uses v2. Exact edit prompt: floating-astronaut-v2.prompt.md.

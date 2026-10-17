"""Render the Carddex Poké Ball mark to src/app/favicon.ico (16/32/48/64) with PIL.

The source of truth for the mark is src/components/PokeBall.tsx; this script
mirrors it so the favicon does not drift. Drawn at 8x and downsampled so the
edges stay smooth: red upper hemisphere, white lower hemisphere, black equator,
black outline, centre button and a gloss highlight on the red half.

    python3 ops/favicon_gen.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

APP = Path(__file__).resolve().parent.parent
OUT = APP / "src" / "app" / "favicon.ico"

S = 8  # supersample factor
N = 64  # base pixel size
W = N * S

BLACK = (17, 17, 20, 255)
RED = (227, 52, 47, 255)
WHITE = (255, 255, 255, 255)

img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

u = W / 32.0  # one SVG user unit in pixels


def P(v: float) -> float:
    return v * u


# hemispheres, clipped by pasting them through a circular mask
ball = Image.new("RGBA", (W, W), (0, 0, 0, 0))
bd = ImageDraw.Draw(ball)
bd.rectangle([0, P(16), W, W], fill=WHITE)
bd.rectangle([0, 0, W, P(16)], fill=RED)
bd.rectangle([0, P(14.7), W, P(17.3)], fill=BLACK)

gloss = Image.new("RGBA", (W, W), (0, 0, 0, 0))
gd = ImageDraw.Draw(gloss)
gd.ellipse(
    [P(11.4) - P(5.4), P(7.6) - P(2.6), P(11.4) + P(5.4), P(7.6) + P(2.6)],
    fill=(255, 255, 255, 76),
)
gloss = gloss.rotate(-22, center=(P(11.4), P(7.6)), resample=Image.BICUBIC)
ball = Image.alpha_composite(ball, gloss)

mask = Image.new("L", (W, W), 0)
ImageDraw.Draw(mask).ellipse([0, 0, W - 1, W - 1], fill=255)
img.paste(ball, (0, 0), mask)

# outline
d.ellipse([0, 0, W - 1, W - 1], outline=BLACK, width=max(1, round(P(2.2))))
# centre button
d.ellipse([P(16 - 5.2), P(16 - 5.2), P(16 + 5.2), P(16 + 5.2)], fill=BLACK)
d.ellipse([P(16 - 3.4), P(16 - 3.4), P(16 + 3.4), P(16 + 3.4)], fill=WHITE)

img.resize((N, N), Image.LANCZOS).save(OUT, sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print(f"wrote {OUT}")

#!/usr/bin/env python3
"""Extract the enclosed yellow hand from the user-provided reference image."""

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "fighters" / "kahane-hand-source.png"
OUTPUT = ROOT / "assets" / "fighters" / "kahane-hand.png"


def flood(mask, starts):
    width, height = mask.size
    pixels = mask.load()
    seen = bytearray(width * height)
    queue = deque()
    for x, y in starts:
        index = y * width + x
        if pixels[x, y] and not seen[index]:
            seen[index] = 1
            queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                index = ny * width + nx
                if pixels[nx, ny] and not seen[index]:
                    seen[index] = 1
                    queue.append((nx, ny))
    return seen


source = Image.open(SOURCE).convert("RGB")
width, height = source.size
yellow = Image.new("1", source.size)
yellow_pixels = yellow.load()
for y in range(height):
    for x in range(width):
        red, green, blue = source.getpixel((x, y))
        yellow_pixels[x, y] = red > 205 and green > 205 and blue < 90

# The supplied symbol lets the yellow hand meet the yellow page near its wrist.
# A hand-shaped selection separates that intentional contact without retaining the star.
selection = Image.new("1", source.size)
ImageDraw.Draw(selection).polygon([
    (195, 289), (223, 279), (249, 270), (242, 257), (287, 235),
    (300, 246), (299, 235), (337, 215), (349, 229), (385, 196),
    (407, 232), (429, 233), (452, 257), (472, 286), (487, 311),
    (505, 329), (506, 347), (499, 365), (483, 383), (475, 398),
    (475, 419), (486, 442), (509, 468), (535, 493), (560, 516),
    (552, 522), (494, 522), (464, 503), (442, 484), (419, 466),
    (393, 450), (368, 432), (351, 452), (339, 480), (334, 497),
    (313, 492), (287, 479), (264, 458), (247, 435), (232, 410),
    (220, 384), (208, 356), (198, 328),
], fill=1)

hand = Image.new("L", source.size)
hand_pixels = hand.load()
selection_pixels = selection.load()
for y in range(height):
    for x in range(width):
        if yellow_pixels[x, y] and selection_pixels[x, y]:
            hand_pixels[x, y] = 255

bounds = hand.getbbox()
if not bounds:
    raise RuntimeError("Could not isolate the enclosed hand from the source image.")

padding = 10
left = max(0, bounds[0] - padding)
top = max(0, bounds[1] - padding)
right = min(width, bounds[2] + padding)
bottom = min(height, bounds[3] + padding)
hand = hand.crop((left, top, right, bottom))

# Preserve enclosed black details such as the palm mark while leaving the star removed.
inverse = hand.point(lambda value: 255 if value == 0 else 0)
iw, ih = inverse.size
inverse_border = [(x, 0) for x in range(iw)] + [(x, ih - 1) for x in range(iw)]
inverse_border += [(0, y) for y in range(ih)] + [(iw - 1, y) for y in range(ih)]
outside = flood(inverse.convert("1"), inverse_border)
holes = Image.new("L", inverse.size)
hole_pixels = holes.load()
inverse_pixels = inverse.load()
for y in range(ih):
    for x in range(iw):
        if inverse_pixels[x, y] and not outside[y * iw + x]:
            hole_pixels[x, y] = 255

target = 124
scale = min(target / hand.width, target / hand.height)
size = (max(1, round(hand.width * scale)), max(1, round(hand.height * scale)))
hand = hand.resize(size, Image.Resampling.LANCZOS)
holes = holes.resize(size, Image.Resampling.LANCZOS)

outline = hand.filter(ImageFilter.MaxFilter(13))
canvas = Image.new("RGBA", (152, 152), (0, 0, 0, 0))
offset = ((canvas.width - size[0]) // 2, (canvas.height - size[1]) // 2)

outline_layer = Image.new("RGBA", size, (21, 23, 42, 0))
outline_layer.putalpha(outline)
canvas.alpha_composite(outline_layer, offset)

fill_layer = Image.new("RGBA", size, (255, 229, 0, 0))
fill_layer.putalpha(hand)
canvas.alpha_composite(fill_layer, offset)

detail_layer = Image.new("RGBA", size, (21, 23, 42, 0))
detail_layer.putalpha(holes)
canvas.alpha_composite(detail_layer, offset)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUTPUT)
print(f"Created {OUTPUT.relative_to(ROOT)} ({canvas.width}x{canvas.height}).")

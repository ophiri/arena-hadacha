#!/usr/bin/env python3
"""Extract transparent Ben Gvir gameplay animations from the supplied sheet."""

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "fighters" / "ben-gvir-source.png"
OUTPUT = ROOT / "assets" / "fighters"
FRAME = (176, 150)
BACKGROUND = (115, 115, 115)


def remove_background(image):
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    visited = set()
    queue = deque()

    def background_like(x, y):
        red, green, blue, _ = pixels[x, y]
        distance = sum((value - background) ** 2 for value, background in zip(
            (red, green, blue), BACKGROUND
        )) ** 0.5
        return max(red, green, blue) - min(red, green, blue) < 14 and distance < 58

    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited or not (0 <= x < width and 0 <= y < height):
            continue
        visited.add((x, y))
        if not background_like(x, y):
            continue
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))

    bounds = image.getbbox()
    if not bounds:
        raise RuntimeError("A Ben Gvir sprite crop became fully transparent.")
    return image.crop(bounds)


def fitted(image, size=FRAME, max_width=None, max_height=None):
    width_limit = max_width or size[0] - 8
    height_limit = max_height or size[1] - 6
    scale = min(width_limit / image.width, height_limit / image.height)
    resized = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    frame = Image.new("RGBA", size, (0, 0, 0, 0))
    frame.alpha_composite(resized, ((size[0] - resized.width) // 2, size[1] - resized.height))
    return frame


def extract(source, box, **fit):
    return fitted(remove_background(source.crop(box)), **fit)


def save_strip(frames, name):
    output = Image.new("RGBA", (FRAME[0] * len(frames), FRAME[1]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        output.alpha_composite(frame, (index * FRAME[0], 0))
    output.save(OUTPUT / name)


source = Image.open(SOURCE)

idle_boxes = [
    (34, 27, 119, 144),
    (126, 27, 226, 144),
    (230, 27, 328, 144),
    (333, 27, 430, 144),
]
idle_frames = [extract(source, box) for box in idle_boxes]
save_strip(idle_frames, "ben-gvir-idle.png")
portrait = fitted(remove_background(source.crop(idle_boxes[0])), (112, 144), max_width=108, max_height=140)
portrait.save(OUTPUT / "ben-gvir-portrait.png")

run_boxes = [
    (24, 168, 126, 276),
    (126, 168, 228, 276),
    (225, 168, 329, 276),
    (324, 168, 432, 276),
    (426, 168, 536, 276),
    (526, 168, 628, 276),
]
save_strip([extract(source, box) for box in run_boxes], "ben-gvir-run.png")

basic_boxes = [
    (29, 296, 126, 414),
    (126, 296, 246, 414),
    (275, 726, 407, 850),
    (495, 726, 630, 850),
]
save_strip(
    [extract(source, box, max_width=172, max_height=146) for box in basic_boxes],
    "ben-gvir-basic.png",
)

charge_boxes = [
    (28, 423, 129, 552),
    (130, 423, 234, 552),
    (238, 575, 381, 700),
    (388, 575, 545, 695),
]
save_strip(
    [extract(source, box, max_width=174, max_height=148) for box in charge_boxes],
    "ben-gvir-charge.png",
)

pita = remove_background(source.crop((170, 730, 280, 806)))
pita = fitted(pita, (72, 72), max_width=68, max_height=52)
pita_alt = fitted(remove_background(source.crop((397, 730, 500, 806))), (72, 72), max_width=68, max_height=52)
projectiles = Image.new("RGBA", (144, 72), (0, 0, 0, 0))
projectiles.alpha_composite(pita, (0, 0))
projectiles.alpha_composite(pita_alt, (72, 0))
projectiles.save(OUTPUT / "ben-gvir-projectile.png")

victory = extract(source, (265, 846, 500, 1018), size=(176, 176), max_width=170, max_height=170)
victory.save(OUTPUT / "ben-gvir-victory.png")

print("Created Ben Gvir portrait, idle, run, basic, charge, projectile, and victory sprites.")

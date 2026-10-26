#!/usr/bin/env python3
"""Extract transparent Bibi gameplay animations from the supplied sheet."""

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "fighters" / "bibi-source.png"
OUTPUT = ROOT / "assets" / "fighters"
FRAME = (176, 150)
BACKGROUND = (124, 126, 123)


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
        return max(red, green, blue) - min(red, green, blue) < 16 and distance < 62

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
        raise RuntimeError("A Bibi sprite crop became fully transparent.")
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
    (30, 25, 130, 148),
    (140, 25, 235, 148),
    (250, 25, 365, 148),
    (375, 25, 490, 148),
    (515, 25, 615, 148),
]
idle_frames = [extract(source, box) for box in idle_boxes]
save_strip(idle_frames, "bibi-idle.png")
portrait = fitted(remove_background(source.crop(idle_boxes[0])), (112, 144), max_width=108, max_height=140)
portrait.save(OUTPUT / "bibi-portrait.png")

run_boxes = [
    (24, 176, 126, 288),
    (126, 176, 232, 288),
    (270, 176, 375, 288),
    (390, 176, 490, 288),
]
save_strip([extract(source, box) for box in run_boxes], "bibi-run.png")

basic_boxes = [
    (28, 295, 132, 421),
    (128, 295, 255, 421),
    (190, 578, 425, 701),
    (465, 578, 690, 701),
]
save_strip(
    [extract(source, box, max_width=174, max_height=148) for box in basic_boxes],
    "bibi-basic.png",
)

charge_boxes = [
    (26, 424, 132, 552),
    (25, 720, 165, 850),
    (162, 730, 382, 850),
    (382, 730, 590, 850),
]
save_strip(
    [extract(source, box, max_width=174, max_height=148) for box in charge_boxes],
    "bibi-charge.png",
)

bomb = remove_background(source.crop((400, 600, 458, 660)))
bomb = fitted(bomb, (72, 72), max_width=58, max_height=58)
bomb_alt = bomb.rotate(15, resample=Image.Resampling.BICUBIC, expand=False)
projectiles = Image.new("RGBA", (144, 72), (0, 0, 0, 0))
projectiles.alpha_composite(bomb, (0, 0))
projectiles.alpha_composite(bomb_alt, (72, 0))
projectiles.save(OUTPUT / "bibi-projectile.png")

victory = extract(source, (295, 846, 485, 1018), size=(176, 176), max_width=170, max_height=170)
victory.save(OUTPUT / "bibi-victory.png")

print("Created Bibi portrait, idle, run, basic, charge, projectile, and victory sprites.")

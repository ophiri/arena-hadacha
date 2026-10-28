#!/usr/bin/env python3
"""Extract transparent Mansour Abbas gameplay animations from the supplied sheet."""

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "fighters" / "mansour-source.png"
OUTPUT = ROOT / "assets" / "fighters"
FRAME = (176, 150)
BACKGROUND = (120, 120, 120)


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
        return max(red, green, blue) - min(red, green, blue) < 15 and distance < 64

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
        raise RuntimeError("A Mansour sprite crop became fully transparent.")
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
    (28, 60, 111, 174),
    (119, 60, 211, 174),
    (211, 60, 306, 174),
    (302, 60, 401, 174),
]
idle_frames = [extract(source, box) for box in idle_boxes]
save_strip(idle_frames, "mansour-idle.png")
portrait = fitted(remove_background(source.crop(idle_boxes[0])), (112, 144), max_width=106, max_height=140)
portrait.save(OUTPUT / "mansour-portrait.png")

run_boxes = [
    (28, 188, 116, 309),
    (115, 188, 211, 309),
    (207, 188, 310, 309),
    (304, 188, 415, 309),
    (405, 188, 524, 309),
]
save_strip([extract(source, box) for box in run_boxes], "mansour-run.png")

basic_boxes = [
    (22, 590, 140, 704),
    (137, 590, 338, 704),
    (336, 590, 548, 704),
    (542, 590, 754, 704),
]
save_strip(
    [extract(source, box, max_width=174, max_height=146) for box in basic_boxes],
    "mansour-basic.png",
)

charge_boxes = [
    (24, 735, 171, 858),
    (165, 735, 319, 858),
    (316, 735, 470, 858),
    (584, 735, 752, 858),
]
save_strip(
    [extract(source, box, max_width=174, max_height=148) for box in charge_boxes],
    "mansour-charge.png",
)

smoke_one = fitted(
    remove_background(source.crop((260, 606, 337, 698))),
    (72, 72),
    max_width=68,
    max_height=64,
)
smoke_two = fitted(
    remove_background(source.crop((466, 606, 548, 698))),
    (72, 72),
    max_width=68,
    max_height=64,
)
projectiles = Image.new("RGBA", (144, 72), (0, 0, 0, 0))
projectiles.alpha_composite(smoke_one, (0, 0))
projectiles.alpha_composite(smoke_two, (72, 0))
projectiles.save(OUTPUT / "mansour-projectile.png")

victory = extract(source, (299, 850, 483, 1024), size=(176, 176), max_width=170, max_height=170)
victory.save(OUTPUT / "mansour-victory.png")

print("Created Mansour portrait, idle, run, basic, charge, projectile, and victory sprites.")

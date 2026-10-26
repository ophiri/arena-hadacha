#!/usr/bin/env python3
"""Extract transparent Tally Gotliv gameplay strips from the supplied sprite sheet."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "fighters" / "gotliv-source.png"
OUTPUT = ROOT / "assets" / "fighters"
FRAME = (176, 150)


def remove_gray_background(image):
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, _ = pixels[x, y]
            distance = ((red - 101) ** 2 + (green - 101) ** 2 + (blue - 101) ** 2) ** 0.5
            neutral_gray = max(red, green, blue) - min(red, green, blue) < 12 and 65 <= red <= 165
            alpha = 0 if neutral_gray else max(0, min(255, round((distance - 36) / 28 * 255)))
            pixels[x, y] = (red, green, blue, alpha)
    bounds = image.getbbox()
    if not bounds:
        raise RuntimeError("A Tally sprite crop became fully transparent.")
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


def strip(frames, name):
    output = Image.new("RGBA", (FRAME[0] * len(frames), FRAME[1]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        output.alpha_composite(frame, (index * FRAME[0], 0))
    output.save(OUTPUT / name)


source = Image.open(SOURCE)
idle_crop = remove_gray_background(source.crop((44, 34, 158, 166)))
idle = fitted(idle_crop, (112, 144), max_width=105, max_height=137)
idle.save(OUTPUT / "gotliv-idle.png")

objection = source.crop((52, 650, 226, 820)).convert("RGBA")
ImageDraw.Draw(objection).rectangle((0, 0, 94, 43), fill=(101, 101, 101, 255))
basic_sources = [
    source.crop((44, 34, 158, 166)),
    source.crop((54, 348, 174, 472)),
    objection,
    source.crop((205, 692, 342, 820)),
]
basic = [fitted(remove_gray_background(image)) for image in basic_sources]
strip(basic, "gotliv-throw.png")

charge_crops = [
    (11, 518, 153, 648),
    (150, 518, 302, 648),
    (298, 455, 502, 649),
    (505, 500, 753, 654),
]
charge = [fitted(remove_gray_background(source.crop(box)), max_width=172, max_height=146)
          for box in charge_crops]
strip(charge, "gotliv-charge.png")

projectile_crop = remove_gray_background(source.crop((142, 650, 226, 719)))
projectile = fitted(projectile_crop, (72, 72), max_width=66, max_height=66)
projectile_two = projectile.rotate(-8, resample=Image.Resampling.BICUBIC, expand=False)
projectiles = Image.new("RGBA", (144, 72), (0, 0, 0, 0))
projectiles.alpha_composite(projectile, (0, 0))
projectiles.alpha_composite(projectile_two, (72, 0))
projectiles.save(OUTPUT / "gotliv-projectile.png")

print("Created Tally Gotliv idle, throw, hammer, and projectile sprites.")

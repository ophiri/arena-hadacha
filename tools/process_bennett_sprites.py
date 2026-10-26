#!/usr/bin/env python3
"""Extract transparent Naftali Bennett gameplay strips from the supplied sheet."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "fighters" / "bennett-source.png"
OUTPUT = ROOT / "assets" / "fighters"
FRAME = (176, 150)
BACKGROUND = (126, 126, 124)


def remove_background(image):
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, _ = pixels[x, y]
            distance = sum((value - background) ** 2 for value, background in zip(
                (red, green, blue), BACKGROUND
            )) ** 0.5
            neutral_gray = max(red, green, blue) - min(red, green, blue) < 11 and 78 <= red <= 176
            alpha = 0 if neutral_gray else max(0, min(255, round((distance - 34) / 30 * 255)))
            pixels[x, y] = (red, green, blue, alpha)
    bounds = image.getbbox()
    if not bounds:
        raise RuntimeError("A Bennett sprite crop became fully transparent.")
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


def save_strip(frames, name):
    output = Image.new("RGBA", (FRAME[0] * len(frames), FRAME[1]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        output.alpha_composite(frame, (index * FRAME[0], 0))
    output.save(OUTPUT / name)


source = Image.open(SOURCE)

idle_crop = remove_background(source.crop((28, 34, 126, 165)))
idle = fitted(idle_crop, (112, 144), max_width=104, max_height=138)
idle.save(OUTPUT / "bennett-idle.png")

basic_boxes = [
    (28, 34, 126, 165),
    (28, 690, 205, 825),
    (28, 350, 140, 477),
    (575, 350, 754, 477),
]
basic = [fitted(remove_background(source.crop(box))) for box in basic_boxes]
save_strip(basic, "bennett-basic.png")

charge_boxes = [
    (25, 510, 145, 651),
    (145, 510, 252, 651),
    (250, 510, 370, 651),
    (365, 510, 515, 651),
]
charge = [
    fitted(remove_background(source.crop(box)), max_width=172, max_height=146)
    for box in charge_boxes
]
save_strip(charge, "bennett-charge.png")

projectile_crop = remove_background(source.crop((111, 690, 207, 738)))
projectile = fitted(projectile_crop, (72, 72), max_width=68, max_height=62)
projectile_alt = projectile.rotate(5, resample=Image.Resampling.BICUBIC, expand=False)
projectiles = Image.new("RGBA", (144, 72), (0, 0, 0, 0))
projectiles.alpha_composite(projectile, (0, 0))
projectiles.alpha_composite(projectile_alt, (72, 0))
projectiles.save(OUTPUT / "bennett-projectile.png")

print("Created Bennett idle, basic, charge, and projectile sprites.")

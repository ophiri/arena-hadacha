#!/usr/bin/env python3
"""Extract the actual character poses from the supplied, non-grid RGB atlas."""

import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "bibi_sprite.png"
OUTPUT = ROOT / "assets" / "bibi"
FRAME = (112, 144)

# Hand-inspected rectangles: x0, y0, x1, y1, exclusive right/bottom.
# The atlas's RUN label says six, but only five separate poses are present.
CROPS = {
    "idle": [(27, 130, 97, 255), (127, 130, 199, 255),
             (226, 130, 298, 255), (324, 130, 396, 255),
             (423, 130, 495, 255), (523, 130, 595, 255)],
    "walk": [(25, 293, 99, 419), (114, 293, 187, 419),
             (198, 293, 276, 419), (288, 293, 359, 419),
             (371, 293, 450, 419), (457, 293, 536, 419),
             (548, 293, 620, 419), (633, 293, 705, 419)],
    "run": [(28, 490, 126, 614), (145, 471, 247, 613),
            (265, 457, 377, 613), (392, 471, 495, 613),
            (515, 490, 611, 614)],
    "jump": [(694, 179, 777, 282), (805, 136, 904, 280),
             (917, 129, 1016, 280), (1042, 136, 1117, 280),
             (1145, 141, 1244, 280)],
    "victory": [(37, 654, 158, 811), (181, 654, 302, 811)],
}
SCALES = {"idle": 0.97, "walk": 0.97, "run": 0.87, "jump": 0.94, "victory": 0.80}


def remove_background(image):
    """Flood-fill only border-connected gray, preserving enclosed hair/shirt."""
    image = image.convert("RGBA")
    width, height = image.size
    pixels = image.load()
    background = set()
    queue = deque()

    def enqueue(x, y):
        if not (0 <= x < width and 0 <= y < height) or (x, y) in background:
            return
        r, g, b, _ = pixels[x, y]
        if min(r, g, b) > 138 and max(r, g, b) - min(r, g, b) < 38 and b >= r - 3:
            background.add((x, y))
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)
    while queue:
        x, y = queue.popleft()
        enqueue(x - 1, y)
        enqueue(x + 1, y)
        enqueue(x, y - 1)
        enqueue(x, y + 1)
    for x, y in background:
        pixels[x, y] = (0, 0, 0, 0)
    bounds = image.getbbox()
    if not bounds:
        raise ValueError("Crop contained no foreground")
    return image.crop(bounds)


def main():
    atlas = Image.open(SOURCE)
    if atlas.size != (1264, 841):
        raise ValueError(f"Expected original 1264x841 atlas; got {atlas.size}")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    metadata = {"source": SOURCE.name, "frameWidth": FRAME[0], "frameHeight": FRAME[1], "animations": {}}
    preview = Image.new("RGB", (FRAME[0] * 8, (FRAME[1] + 30) * len(CROPS)), "#253d49")
    draw = ImageDraw.Draw(preview)
    for row, (name, boxes) in enumerate(CROPS.items()):
        strip = Image.new("RGBA", (FRAME[0] * len(boxes), FRAME[1]))
        for index, box in enumerate(boxes):
            pose = remove_background(atlas.crop(box))
            scale = SCALES[name]
            pose = pose.resize((round(pose.width * scale), round(pose.height * scale)), Image.Resampling.NEAREST)
            frame = Image.new("RGBA", FRAME)
            frame.alpha_composite(pose, ((FRAME[0] - pose.width) // 2, FRAME[1] - 8 - pose.height))
            frame.save(OUTPUT / f"{name}-{index}.png")
            strip.alpha_composite(frame, (index * FRAME[0], 0))
            px, py = index * FRAME[0], row * (FRAME[1] + 30)
            draw.rectangle((px, py + 25, px + FRAME[0] - 1, py + FRAME[1] + 24),
                           fill="#254b58" if index % 2 else "#d9b77b")
            preview.paste(frame, (px, py + 25), frame)
            draw.text((px + 8, py + 8), f"{name} {index + 1}", fill="white")
        strip.save(OUTPUT / f"{name}.png")
        metadata["animations"][name] = {"frames": len(boxes), "file": f"{name}.png",
                                         "sourceRects": boxes, "scale": SCALES[name]}
    (OUTPUT / "manifest.json").write_text(json.dumps(metadata, indent=2) + "\n")
    preview.save(OUTPUT / "contact-sheet.png")
    print(f"Extracted {sum(map(len, CROPS.values()))} transparent poses in {len(CROPS)} animations to {OUTPUT}")


if __name__ == "__main__":
    main()

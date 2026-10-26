#!/usr/bin/env python3
"""Draw original western-parody characters and locally embed the supplied Bibi face."""

import base64
from pathlib import Path
from create_rival_sprites import svg

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets"

EISENKOT_HEAD = """
<g id="head" stroke="#42392f" stroke-width="1.3" stroke-linejoin="round">
  <path fill="#dfb28c" d="M19 28Q17 10 37 7Q61 5 63 29L61 43Q57 58 41 60Q24 58 20 43Z"/>
  <ellipse cx="19" cy="36" rx="4" ry="7" fill="#dfb28c"/>
  <ellipse cx="62" cy="36" rx="4" ry="7" fill="#dfb28c"/>
  <path fill="#777773" d="M19 31Q15 13 29 9L32 15Q23 21 24 34ZM51 11Q65 13 63 33L57 34Q58 23 51 17Z"/>
  <path fill="#f0c6a2" stroke="none" d="M29 18Q41 10 53 21L55 38Q50 49 40 50Q28 47 26 36Z"/>
  <path fill="none" stroke="#68615a" stroke-width="3.2" d="M25 30Q31 26 37 30M44 30Q50 26 56 30"/>
  <path fill="#fff8df" d="M25 35Q31 31 37 35Q31 40 25 35ZM44 35Q50 31 56 35Q50 40 44 35Z"/>
  <circle cx="32" cy="35" r="2" fill="#544d43"/><circle cx="49" cy="35" r="2" fill="#544d43"/>
  <path fill="#cc9b77" d="M40 33L36 43Q41 47 46 42"/>
  <path fill="none" stroke="#885f50" stroke-width="1.6" d="M29 49Q41 54 53 48M30 44L28 46M53 43L55 46"/>
  <path fill="none" stroke="#c09270" d="M31 22Q41 19 51 22M33 24L48 24M35 56L46 56"/>
</g>
"""

BEN_GVIR_HEAD = """
<g id="head" stroke="#352f30" stroke-width="1.4" stroke-linejoin="round">
  <path fill="#e7b68e" d="M20 24Q22 10 41 10Q59 10 62 26L59 45Q53 59 40 60Q26 57 21 45Z"/>
  <path fill="#393331" d="M20 29L17 23Q16 9 30 8L46 8Q62 9 63 24L58 32L53 20L27 21L23 32Z"/>
  <path fill="#20263a" d="M28 10Q40 -1 54 11L46 14L33 13Z"/>
  <path fill="#595047" d="M22 42L29 45L33 42L40 46L48 43L57 42L55 53L44 61L34 58L26 52Z"/>
  <path fill="#edc5a0" stroke="none" d="M30 46L40 49L50 46L48 52L37 54Z"/>
  <path fill="#fff3de" d="M31 48Q40 45 50 48L46 52L35 52Z"/>
  <rect x="22" y="29" width="16" height="11" rx="3" fill="#e8e6d5" fill-opacity=".4" stroke-width="2"/>
  <rect x="43" y="29" width="16" height="11" rx="3" fill="#e8e6d5" fill-opacity=".4" stroke-width="2"/>
  <path fill="none" stroke-width="2" d="M38 32L43 32M18 31L22 32M59 32L63 30"/>
  <circle cx="31" cy="34" r="2"/><circle cx="50" cy="34" r="2"/>
  <path fill="none" stroke="#aa775e" d="M40 35L37 43L43 44"/>
</g>
"""

TOY = """
<g stroke="#443351" stroke-width="1.3" stroke-linejoin="round">
  <path fill="#ad72d5" d="M54 63H75V71H65L63 83H56L58 71H54Z"/>
  <path fill="#ffad49" d="M73 62H79V72H73Z"/>
  <path fill="#ffe889" d="M58 64H70V67H58Z"/>
  <circle cx="62" cy="70" r="3" fill="#e9faf0"/>
</g>
"""

BOOTS = """
<g stroke="#3d3030" stroke-width="1.5" stroke-linejoin="round">
  <path fill="#566578" d="M26 82H40L36 100H24ZM42 82H54L58 100H45Z"/>
  <path fill="#76513a" d="M24 94H36V103L39 108H19L20 103ZM45 94H57L59 102L66 106V108H44Z"/>
  <path fill="#e6c06b" d="M24 97H35V99H24ZM46 97H57V99H46Z"/>
</g>
"""

FORMAL_BODY = """
<g stroke="#353441" stroke-width="1.5" stroke-linejoin="round">
  <path fill="#303a50" d="M25 80H39L36 106H23ZM41 80H54L58 106H44Z"/>
  <path fill="#242936" d="M23 101H36L40 108H19ZM44 101H58L64 108H44Z"/>
  <path fill="#efc6a0" d="M33 52H47V63H33Z"/>
  <path fill="#f7f0dc" d="M30 57H50V85H30Z"/>
  <path fill="#3b475e" d="M30 55L20 60L24 87H37L34 62ZM49 55L59 61L56 87H41L46 61Z"/>
  <path fill="#50617b" d="M27 57L23 64L30 70L28 73L37 86ZM51 57L56 64L49 70L52 74L42 86Z"/>
  <path fill="#35445c" d="M22 59L15 65L13 81L22 83L28 65ZM57 60L64 63L65 77L57 80L51 65Z"/>
  <ellipse cx="17" cy="83" rx="5" ry="5" fill="#e5b78f"/>
  <ellipse cx="62" cy="79" rx="5" ry="5" fill="#e5b78f"/>
</g>
"""


def cowboy(head, scarf):
    return f"""{BOOTS}
<g stroke="#49342d" stroke-width="1.5" stroke-linejoin="round">
  <path fill="#e0ad87" d="M34 50H46V65H34Z"/>
  <path fill="#f5dba0" d="M28 57H52L58 83H22Z"/>
  <path fill="#86603e" d="M27 55L20 63L24 85H36L34 60ZM52 55L59 63L56 85H43L46 60Z"/>
  <path fill="#f1d598" d="M22 60L16 64L12 78L20 83L28 66ZM56 60L60 65L70 65L70 73L57 74L51 66Z"/>
  <ellipse cx="17" cy="83" rx="5" ry="5" fill="#e0ad87"/>
  <ellipse cx="68" cy="70" rx="5" ry="5" fill="#e0ad87"/>
  <path fill="#4c3530" d="M24 81H56V88H24Z"/>
  <rect x="36" y="81" width="9" height="7" fill="#ffd66a"/>
  <path fill="{scarf}" d="M31 54L41 59L50 54L47 64L38 68L33 61Z"/>
  <path fill="#ffe591" d="M29 66L31 70L35 71L32 74L32 78L29 76L25 78L26 74L23 71L27 70Z"/>
</g>
{head}
<g stroke="#46322c" stroke-width="1.5" stroke-linejoin="round">
  <path fill="#a77548" d="M23 18L26 5L35 3L41 8L49 3L56 6L59 20Z"/>
  <path fill="#563a31" d="M24 14L58 15L59 21L23 20Z"/>
  <path fill="#c69357" d="M8 16Q21 21 37 20Q60 23 73 16L70 24Q41 31 12 23Z"/>
</g>
{TOY}"""


def write(folder, filename, name, content, definitions=""):
    output = OUTPUT / folder
    output.mkdir(parents=True, exist_ok=True)
    (output / filename).write_text(svg(80, content, name, f"<defs>{definitions}</defs>"), encoding="utf-8")


def main():
    write("eisenkot", "portrait.svg", "גדי אייזנקוט", FORMAL_BODY + '<use href="#head"/>', EISENKOT_HEAD)
    write("eisenkot", "cowboy.svg", "גדי אייזנקוט, אקדוחן קונפטי",
          cowboy('<use href="#head"/>', "#e8b341"), EISENKOT_HEAD)
    write("ben-gvir", "portrait.svg", "איתמר בן גביר מוסר אקדח צעצוע",
          FORMAL_BODY + '<use href="#head"/>' + TOY, BEN_GVIR_HEAD)
    image = base64.b64encode((OUTPUT / "bibi" / "idle-0.png").read_bytes()).decode("ascii")
    face = f"""<svg x="19" y="7" width="44" height="49" viewBox="29 19 55 60">
      <defs><clipPath id="bibi-face"><path d="M32 18H80V61L76 68L70 73H51L44 68L41 61L36 59L32 50Z"/></clipPath></defs>
      <image width="112" height="144" href="data:image/png;base64,{image}" clip-path="url(#bibi-face)" style="image-rendering:pixelated"/>
    </svg>"""
    write("bibi", "cowboy.svg", "ביבי, אקדוחן קונפטי", cowboy(face, "#ac76cb"))
    print("Created four transparent duel portraits/costumes. Original Bibi atlas unchanged.")


if __name__ == "__main__":
    main()

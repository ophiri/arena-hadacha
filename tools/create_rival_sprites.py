#!/usr/bin/env python3
"""Generate original vector cartoon art; no photo pixels or extra packages."""

from pathlib import Path

OUTPUT = Path(__file__).resolve().parents[1] / "assets"
DEFINITIONS = """
<defs>
  <g id="head" stroke="#484745" stroke-width="1.4" stroke-linejoin="round">
    <path fill="#d4cba6" d="M18 43C10 32 13 15 23 9L31 7C39 0 52 6 56 10C68 17 65 36 60 47L53 55L23 53Z"/>
    <path fill="#f3ddb8" d="M23 25C23 14 53 12 56 27L55 41C53 49 47 55 40 56C30 55 23 47 22 40Z"/>
    <path fill="#e6bd9e" stroke="none" d="M24 35C25 47 31 53 40 54C47 53 51 49 54 41L51 47L42 50L30 46Z"/>
    <path fill="#ede4c5" d="M17 39C12 25 19 9 29 9C34 4 44 4 51 8C60 9 65 18 61 36L56 45L54 30C56 19 52 17 48 14C41 19 37 21 32 27L24 33L23 45Z"/>
    <path fill="#fff6d9" stroke="none" d="M19 25C20 14 26 11 33 11L41 8C37 16 30 22 24 27L21 34Z"/>
    <path fill="#fff6d9" stroke="none" d="M47 10C57 12 60 21 58 27L54 21L49 16Z"/>
    <path fill="none" stroke="#b8b193" stroke-width="1.1" d="M39 10C35 17 28 25 22 28M47 12C54 19 56 27 55 33M19 31L20 43"/>
    <path fill="none" stroke="#9b825f" stroke-width="1.6" d="M27 31Q31 28 35 30M43 30Q48 28 51 31"/>
    <path fill="#fff9e9" d="M26 35Q31 30 36 35Q31 39 26 35ZM43 35Q48 30 53 35Q48 39 43 35Z"/>
    <ellipse cx="32" cy="35" rx="2.2" ry="2.8" fill="#769691" stroke-width=".7"/>
    <ellipse cx="48" cy="35" rx="2.2" ry="2.8" fill="#769691" stroke-width=".7"/>
    <circle cx="32.5" cy="35" r="1" fill="#343d40" stroke="none"/>
    <circle cx="48.5" cy="35" r="1" fill="#343d40" stroke="none"/>
    <path fill="none" stroke="#bd9074" stroke-width="1.1" d="M40 35L38 41L42 42M27 39L26 41M51 39L53 41"/>
    <path fill="#bd7479" stroke="#a9696b" stroke-width=".8" d="M32 46Q40 43 48 46Q41 52 32 46Z"/>
    <path fill="#fff8e9" stroke="none" d="M34 46L46 46Q41 48 35 47Z"/>
    <circle cx="23" cy="43" r="2.2" fill="#fffae6" stroke="#b9ab85" stroke-width=".8"/>
    <circle cx="56" cy="43" r="2.2" fill="#fffae6" stroke="#b9ab85" stroke-width=".8"/>
  </g>
  <g id="torso" stroke="#313749" stroke-width="1.5" stroke-linejoin="round">
    <path fill="#e6bc9b" d="M35 50L34 58L46 58L45 50Z"/>
    <path fill="#303c56" d="M30 54L22 58L24 86L55 86L57 58L49 54L40 60Z"/>
    <path fill="#d7d6cf" stroke="#aaa99e" stroke-width="1" d="M34 55L40 59L46 55L48 85L32 85Z"/>
    <path fill="#44536c" d="M29 55L24 59L30 66L27 70L32 86L36 59ZM50 55L56 59L50 66L53 70L48 86L44 59Z"/>
    <path fill="none" stroke="#f7f0da" stroke-width="2.4" stroke-linecap="round" stroke-dasharray=".5 3.6" d="M32 56Q39 74 48 56"/>
    <circle cx="40" cy="77" r="1.1" fill="#f6f3de" stroke="none"/>
  </g>
</defs>
"""

LAPID_DEFINITIONS = """
<defs>
  <g id="head" stroke="#454650" stroke-width="1.5" stroke-linejoin="round">
    <path fill="#efc7a7" d="M22 23L24 13L49 12L59 24L56 42L49 53L33 55L23 46L20 34Z"/>
    <path fill="#d4a687" stroke="none" d="M24 37L29 47L38 51L48 49L55 38L52 49L45 55L32 53L23 44Z"/>
    <path fill="#d1d2ca" d="M21 32L18 25L19 17Q20 10 29 10L33 7L40 9L48 6L54 11Q61 13 61 23L57 34L53 26L50 20L29 21L25 27Z"/>
    <path fill="#f0efe4" stroke="none" d="M23 17Q27 12 33 12L36 10L41 13L48 10Q53 13 55 17L46 17L33 18L25 23Z"/>
    <path fill="#949c9e" stroke="none" d="M19 23L24 21L24 31L21 35ZM55 20L59 20L58 33L54 31Z"/>
    <path fill="none" stroke="#5c5650" stroke-width="2.8" d="M26 31L32 29L36 31M43 31L48 29L54 31"/>
    <path fill="#fff4e2" d="M26 35Q31 32 36 35Q31 38 26 35ZM43 35Q49 32 54 35Q48 38 43 35Z"/>
    <circle cx="32" cy="35" r="2" fill="#5d7778" stroke-width=".7"/>
    <circle cx="48" cy="35" r="2" fill="#5d7778" stroke-width=".7"/>
    <path fill="none" stroke="#b68870" stroke-width="1.2" d="M41 34L39 42L44 42M27 41L28 45M51 41L50 45"/>
    <path fill="none" stroke="#9b6d65" stroke-width="1.7" d="M33 47Q41 49 48 46"/>
    <path fill="none" stroke="#b3917e" stroke-width=".9" d="M29 48L32 50M32 50L34 51M37 52L40 52M44 51L47 50"/>
  </g>
  <g id="torso" stroke="#303647" stroke-width="1.5" stroke-linejoin="round">
    <path fill="#dfb291" d="M35 49L34 59L47 59L46 49Z"/>
    <path fill="#2b354b" d="M29 54L21 60L24 87L56 87L59 60L49 54L41 59Z"/>
    <path fill="#eeede1" d="M33 54L41 60L48 54L47 85L34 85Z"/>
    <path fill="#fffbee" stroke="#bfc4bd" stroke-width=".8" d="M34 54L41 59L36 66L32 58ZM47 54L41 59L45 65L50 58Z"/>
    <path fill="#46516a" d="M29 55L24 60L29 67L26 71L33 87L36 62ZM52 55L57 60L51 67L54 72L48 87L46 62Z"/>
    <circle cx="41" cy="75" r="1" fill="#8f9998" stroke="none"/>
  </g>
</defs>
"""


def character(step=0):
    left, right, bob = [(0, 0, 0), (-6, 6, -1), (0, 0, 0), (6, -6, -1)][step]
    return f"""
<g stroke="#303647" stroke-width="1.8" stroke-linejoin="round">
  <path fill="#454959" d="M27 82L39 82L{36 + left} 102L{26 + left} 102Z"/>
  <path fill="#394153" d="M41 82L53 82L{54 + right} 102L{44 + right} 102Z"/>
  <path fill="#262d3c" d="M{26 + left} 100L{36 + left} 100L{39 + left} 106L{23 + left} 106Z"/>
  <path fill="#262d3c" d="M{44 + right} 100L{54 + right} 100L{59 + right} 105L{44 + right} 106Z"/>
</g>
<g transform="translate(0 {bob})">
  <g stroke="#303749" stroke-width="1.7" stroke-linejoin="round">
    <path fill="#35425c" d="M24 58L19 61L{16 - left / 2} 76L{22 - left / 2} 79L29 64Z"/>
    <path fill="#efd2ae" d="M{16 - left / 2} 75Q{10 - left / 2} 83 {18 - left / 2} 84L{23 - left / 2} 78Z"/>
    <path fill="#35425c" d="M55 58L60 62L{64 - right / 2} 76L{58 - right / 2} 79L50 64Z"/>
    <path fill="#efd2ae" d="M{64 - right / 2} 75Q{70 - right / 2} 83 {62 - right / 2} 84L{57 - right / 2} 78Z"/>
  </g>
  <use href="#torso"/>
  <use href="#head"/>
</g>"""

def boxer(step=0):
    bob = -1 if step % 2 else 0
    front = 72 if step == 1 else 58
    back = 9 if step == 3 else 22
    return f"""
<g stroke="#303647" stroke-width="1.8" stroke-linejoin="round">
  <path fill="#e7bb98" d="M28 83L38 85L33 101L24 101ZM44 84L54 84L56 101L46 101Z"/>
  <path fill="#374762" d="M24 78L56 78L55 90L43 93L40 86L36 94L25 90Z"/>
  <path fill="#e6c46c" d="M24 77L56 77L56 83L24 83Z"/>
  <path fill="#fff2cf" d="M24 98L34 98L34 105L20 105L20 102ZM46 98L56 98L62 103L62 106L46 106Z"/>
</g>
<g transform="translate(0 {bob})">
  <g stroke="#554750" stroke-width="1.7" stroke-linejoin="round">
    <path fill="#efc7a7" d="M32 52L26 58L24 74L32 81L49 81L56 73L53 59L46 52Z"/>
    <path fill="#384860" d="M31 54L28 59L30 76L50 76L52 59L47 54L44 63L36 63Z"/>
    <path fill="#efc7a7" d="M27 57L19 60L{back} 51L{back - 5} 55L18 72L29 68ZM53 58L59 61L{front} 55L{front + 3} 63L59 73L51 67Z"/>
    <path fill="#cb514c" d="M{back - 8} 46Q{back - 3} 39 {back + 5} 43L{back + 7} 53Q{back + 3} 60 {back - 5} 57Z"/>
    <path fill="#ed7760" stroke="none" d="M{back - 5} 46L{back + 2} 44L{back + 4} 49L{back - 5} 51Z"/>
    <path fill="#cb514c" d="M{front - 5} 50Q{front + 3} 46 {front + 6} 53L{front + 6} 62Q{front + 1} 68 {front - 7} 63Z"/>
    <path fill="#ed7760" stroke="none" d="M{front - 3} 51L{front + 2} 51L{front + 4} 56L{front - 3} 57Z"/>
    <path fill="#efe5c7" d="M{back - 4} 57L{back + 5} 54L{back + 6} 58L{back - 2} 61ZM{front - 7} 62L{front + 3} 66L{front + 1} 70L{front - 8} 66Z"/>
  </g>
  <use href="#head"/>
</g>"""


def svg(width, content, name, definitions):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" lang="he" width="{width}" height="112" viewBox="0 0 {width} 112">
<title>{name} — דמות מצוירת מקורית למשחק</title>
<desc>Original stylized vector character for a fictional platform game, not a photograph.</desc>
{definitions}
{content}
</svg>
"""


def main():
    for folder, name, definitions in [
        ("gali", "גלי בהרב־מיארה", DEFINITIONS),
        ("lapid", "יאיר לפיד", LAPID_DEFINITIONS),
    ]:
        output = OUTPUT / folder
        output.mkdir(parents=True, exist_ok=True)
        (output / "portrait.svg").write_text(svg(80, character(), name, definitions))
        poses = "".join(f'<g transform="translate({i * 80} 0)">{character(i)}</g>' for i in range(4))
        (output / "walk.svg").write_text(svg(320, poses, name, definitions))
        print(f"Created {name} cartoon portrait and four-frame transparent walking strip.")
    boxing = "".join(f'<g transform="translate({i * 80} 0)">{boxer(i)}</g>' for i in range(4))
    (OUTPUT / "lapid" / "boxer.svg").write_text(svg(320, boxing, "יאיר לפיד, מתאגרף מצויר", LAPID_DEFINITIONS))
    (OUTPUT / "lapid" / "boxing-portrait.svg").write_text(svg(80, boxer(), "יאיר לפיד, מתאגרף מצויר", LAPID_DEFINITIONS))


if __name__ == "__main__":
    main()

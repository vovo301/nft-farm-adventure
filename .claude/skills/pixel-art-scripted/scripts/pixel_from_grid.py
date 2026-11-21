#!/usr/bin/env python3
"""Gera PNG de pixel art a partir de uma grade de caracteres + paleta.

Formato do arquivo de grade (.txt):
  - cada linha é uma linha de pixels; cada caractere é uma chave da paleta
  - '.' (ou espaço) = transparente
  - uma linha contendo só '---' separa quadros de animação (saem lado a lado num strip)
  - linhas iniciadas por '#' são comentários

Paleta (.json): {"k": "#1b1b1b", "g": "#3e8948", ...}  (hex RGB ou RGBA)

Uso:
  python pixel_from_grid.py sprite.txt --palette palette.json --out sprite.png [--scale 1]
Saída: PNG RGBA. Sai com código 1 se houver caractere fora da paleta ou quadros de tamanhos diferentes.
"""
import argparse
import json
import sys

from PIL import Image


def parse_color(value):
    v = value.lstrip("#")
    if len(v) == 6:
        v += "ff"
    if len(v) != 8:
        raise ValueError(f"cor inválida: {value}")
    return tuple(int(v[i:i + 2], 16) for i in (0, 2, 4, 6))


def read_frames(path):
    frames, cur = [], []
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.rstrip("\n")
            if line.startswith("#"):
                continue
            if line.strip() == "---":
                if cur:
                    frames.append(cur)
                cur = []
                continue
            if line == "" and not cur:
                continue
            cur.append(line)
    if cur:
        frames.append(cur)
    # remove linhas vazias finais
    return [[r for r in f if r != ""] or f for f in frames]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("grid")
    ap.add_argument("--palette", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=int, default=1, help="escala inteira (nearest) só para preview")
    a = ap.parse_args()

    with open(a.palette, encoding="utf-8") as fh:
        pal = {k: parse_color(v) for k, v in json.load(fh).items()}
    pal.setdefault(".", (0, 0, 0, 0))
    pal.setdefault(" ", (0, 0, 0, 0))

    frames = read_frames(a.grid)
    if not frames:
        sys.exit("erro: nenhum quadro encontrado")
    h = len(frames[0])
    w = max(len(r) for r in frames[0])
    errors = []
    for i, f in enumerate(frames):
        fw = max(len(r) for r in f)
        if len(f) != h or fw != w:
            errors.append(f"quadro {i}: {fw}x{len(f)} difere de {w}x{h}")
    img = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    px = img.load()
    for i, f in enumerate(frames):
        for y, row in enumerate(f):
            for x, ch in enumerate(row.ljust(w, ".")):
                if ch not in pal:
                    errors.append(f"quadro {i} linha {y + 1} col {x + 1}: '{ch}' fora da paleta")
                    continue
                px[i * w + x, y] = pal[ch]
    if errors:
        print("\n".join(errors), file=sys.stderr)
        sys.exit(1)
    if a.scale > 1:
        img = img.resize((img.width * a.scale, img.height * a.scale), Image.NEAREST)
    img.save(a.out)
    print(json.dumps({"out": a.out, "frames": len(frames), "frame_size": f"{w}x{h}"}))


if __name__ == "__main__":
    main()

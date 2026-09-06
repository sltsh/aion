# Icons

`aion-icon-transparent.png` is the master: 1254 × 1254, the disc on transparency.
`aion-icon.png` is the same artwork on an opaque background.

Everything else is derived from the master and is committed, because the repository
carries no image dependency. Regenerate after replacing the master:

```bash
python3 - <<'PY'
from PIL import Image
src = Image.open('assets/aion-icon-transparent.png').convert('RGBA')
w, h = src.size
box = src.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
r = max(box[2] - box[0], box[3] - box[1]) / 2

# The export leaves faint specks outside the disc. Clear anything beyond its edge.
px, limit = src.load(), (r + 4) ** 2
for y in range(h):
    dy2 = (y - cy) ** 2
    for x in range(w):
        if (x - cx) ** 2 + dy2 > limit and px[x, y][3] != 0:
            px[x, y] = (0, 0, 0, 0)

# The disc covers 88% of the frame. Edge to edge, the gold ring reads as clipped at 128px.
side = int(r * 2 / 0.88)
left, top = int(cx - side / 2), int(cy - side / 2)
square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
square.paste(src.crop((left, top, left + side, top + side)), (0, 0))
for size, path in [(1024, 'assets/icon-1024.png'), (128, 'assets/icon.png')]:
    square.resize((size, size), Image.LANCZOS).save(path, optimize=True)
PY
cp assets/icon.png packages/vscode/assets/icon.png
cp assets/icon.png apps/lab/public/icon.png
```

| File | Size | Used by |
|---|---|---|
| `icon.png` | 128 | the source for the two copies below |
| `icon-1024.png` | 1024 | a large export for a listing or a social card |
| `icon-square.png` | 128 | the earlier opaque tile, kept as the alternative |
| `packages/vscode/assets/icon.png` | 128 | `packages/vscode/package.json` → the marketplace |
| `apps/lab/public/icon.png` | 128 | the lab favicon and masthead |

The transparent disc is the one that ships. `galleryBanner.color` is the editor
background, so the marketplace header is dark and the disc sits on it without a tile
edge. Swap `icon-square.png` back in if a listing ever needs an opaque tile.

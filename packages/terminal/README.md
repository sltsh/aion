# Aion for Windows Terminal

The Aion colour scheme, shipped two ways. Both carry the same sixteen ANSI slots as the
VS Code integrated terminal, so a shell looks the same in either place.

The background is `#11151c`, the editor value. The VS Code panel sits one step lighter at
`#14181f`, because a panel inside a window needs to separate from the editor and a
standalone window does not.

## Fragment extension, no settings edit

Copy `fragments/aion.json` into the Windows Terminal fragments folder:

```powershell
$target = "$env:LOCALAPPDATA\Microsoft\Windows Terminal\Fragments\sltio"
New-Item -ItemType Directory -Force -Path $target
Copy-Item fragments\aion.json -Destination $target
```

Restart Windows Terminal. Aion appears in **Settings → Profiles → Appearance → Colour
scheme**. Windows Terminal owns the file, so no settings edit is needed and an update
replaces one file.

The path is the same for every build, the Store one included. The loader enumerates
`\Microsoft\Windows Terminal\Fragments` under `FOLDERID_LocalAppData` and under
`FOLDERID_ProgramData`, and nothing else; read at `093e49e2` of `microsoft/terminal`, in
`CascadiaSettingsSerialization.cpp`. Use the ProgramData directory to install the scheme
for every user on the machine:

```powershell
$target = "$env:PROGRAMDATA\Microsoft\Windows Terminal\Fragments\sltio"
```

## Settings snippet

`snippets/settings.json` is a whole settings fragment: an object with one `schemes` array
in it. Merge that object into the root of your `settings.json`, or, if you already have a
`schemes` array, copy the single object inside `schemes` into it. Pasting the file itself
into the array nests a second wrapper and Windows Terminal shows no new scheme.

Then set `"colorScheme": "Aion"` on a profile.

## Slots

| # | Slot | Hex | # | Slot | Hex |
|---|---|---|---|---|---|
| 0 | black | `#2a2e36` | 8 | bright black | `#8b909a` |
| 1 | red | `#d86e6c` | 9 | bright red | `#ed807e` |
| 2 | green | `#67ba75` | 10 | bright green | `#7bce88` |
| 3 | yellow | `#d1ad43` | 11 | bright yellow | `#e4c058` |
| 4 | blue | `#6b9fe2` | 12 | bright blue | `#7db2f7` |
| 5 | purple | `#aa84d5` | 13 | bright purple | `#bd96e9` |
| 6 | cyan | `#43b9b5` | 14 | bright cyan | `#59cdc8` |
| 7 | white | `#a7acb7` | 15 | bright white | `#e2e8f3` |

The bright eight are byte-identical to the editor syntax accents.

## What the contrast floor covers here

Every slot except slot 0 clears 4.5:1 on both supported backgrounds: the standalone
`#11151c` and the VS Code panel `#14181f`. Slot 8 is raised so it clears the floor on the
lighter of the two and under a selection or a find-match wash as well, because a prompt
puts the time and the git status in it and a terminal has no foreground override key.

**Slot 0 is the one exemption, and it is a real limitation.** It reads 1.31:1 as a
foreground on the panel and 1.34:1 on the standalone background. `SGR 30` does select it,
so an application that writes black text on the default background is not legible. No dark
scheme can fix that and keep slot 0 dark enough to serve as a background, which is what
`SGR 40` and reverse video need. Aion keeps it dark and guarantees the other direction:
ANSI white reads 5.98:1 on slot 0 and bright white 11.07:1. Reverse video, which paints
the default foreground as the background, clears the floor in both directions.

A terminal that applies its own minimum-contrast correction will change these requested
colours before drawing them. The numbers above describe what Aion asks for.

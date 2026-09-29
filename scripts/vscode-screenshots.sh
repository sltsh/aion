#!/usr/bin/env bash
# Native VS Code screenshots of screenshots/demo in both schemes.
# Needs: code, xvfb-run, xdotool, ImageMagick `import`, git, Monaspace Neon installed as a system font.
# Usage: scripts/vscode-screenshots.sh [out-dir]   (default: screenshots)
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT=$(cd "${1:-$ROOT/screenshots}" && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

[ -n "$(fc-list "Monaspace Neon")" ] || { echo "Monaspace Neon is not installed" >&2; exit 1; }

npm run build -w packages/vscode --prefix "$ROOT" >/dev/null
(cd "$ROOT/packages/vscode" && npx --no-install vsce package --no-dependencies -o "$TMP/aion.vsix" >/dev/null)

# The demo is committed at its baseline, then moved to its working state, so the Explorer and
# the gutter carry real git decorations: two modified files and one untracked.
WORK="$TMP/tidal"
cp -r "$ROOT/screenshots/demo/project" "$WORK"
cp -r "$ROOT/screenshots/demo/baseline/." "$WORK/"
mv "$WORK/test/format.test.ts" "$TMP/format.test.ts"
git -C "$WORK" init -q -b main
git -C "$WORK" -c user.name=tidal -c user.email=tidal@example.invalid add -A
git -C "$WORK" -c user.name=tidal -c user.email=tidal@example.invalid commit -q -m "Predict heights from harmonic constants"
cp -r "$ROOT/screenshots/demo/project/src/." "$WORK/src/"
mv "$TMP/format.test.ts" "$WORK/test/format.test.ts"

# VS Code on Linux draws its interface in system-ui. Resolve that to Ubuntu Sans for this
# process only, so the capture looks like a stock Ubuntu desktop rather than the DejaVu
# fallback of a headless machine. The package is unpacked, not installed.
FONTS="$TMP/fonts"
if (cd "$TMP" && apt-get download -q fonts-ubuntu >/dev/null 2>&1); then
  dpkg-deb -x "$TMP"/fonts-ubuntu_*.deb "$TMP/fonts-deb"
  mkdir -p "$FONTS" && cp "$TMP"/fonts-deb/usr/share/fonts/truetype/ubuntu/UbuntuSans*wdth* "$FONTS/"
  cat > "$TMP/fonts.conf" <<EOF
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>
  <dir>$FONTS</dir>
  <alias binding="strong"><family>system-ui</family><prefer><family>Ubuntu Sans</family></prefer></alias>
  <alias binding="strong"><family>sans-serif</family><prefer><family>Ubuntu Sans</family></prefer></alias>
</fontconfig>
EOF
  export FONTCONFIG_FILE="$TMP/fonts.conf"
fi

capture() {
  local theme=$1 out=$2 profile="$TMP/profile-${1// /-}"
  mkdir -p "$profile/user/User" "$profile/ext"
  code --user-data-dir "$profile/user" --extensions-dir "$profile/ext" \
    --install-extension "$TMP/aion.vsix" >/dev/null 2>&1
  cat > "$profile/user/User/settings.json" <<EOF
{
  "workbench.colorTheme": "$theme",
  "editor.fontFamily": "Monaspace Neon",
  "editor.fontSize": 14,
  "editor.lineHeight": 1.6,
  "editor.minimap.enabled": false,
  "editor.lightbulb.enabled": "off",
  "terminal.integrated.fontFamily": "Monaspace Neon",
  "terminal.integrated.fontSize": 13,
  "terminal.integrated.defaultProfile.linux": "demo",
  "terminal.integrated.profiles.linux": {
    "demo": { "path": "bash", "args": ["--noprofile", "--norc"],
              "env": { "PS1": "\\\\[\\\\e[1;34m\\\\]tidal\\\\[\\\\e[0m\\\\] \\\\[\\\\e[33m\\\\]main\\\\[\\\\e[0m\\\\] \$ " } }
  },
  "window.titleBarStyle": "custom",
  "window.commandCenter": false,
  "workbench.layoutControl.enabled": false,
  "workbench.startupEditor": "none",
  "workbench.tips.enabled": false,
  "workbench.enableExperiments": false,
  "workbench.secondarySideBar.defaultVisibility": "hidden",
  "chat.disableAIFeatures": true,
  "telemetry.telemetryLevel": "off",
  "update.mode": "none",
  "extensions.ignoreRecommendations": true,
  "security.workspace.trust.enabled": false,
  "git.openRepositoryInParentFolders": "never"
}
EOF
  rm -f "$out"
  xvfb-run -a -s "-screen 0 2880x1800x24" bash -s "$profile" "$WORK" "$out" <<'EOS'
set -euo pipefail
profile=$1 work=$2 out=$3
vscode() { code --user-data-dir "$profile/user" --extensions-dir "$profile/ext" --force-device-scale-factor=2 "$@" </dev/null >/dev/null 2>&1; }
vscode --new-window "$work" "$work/README.md" "$work/src/format.ts" &
sleep 14
vscode --reuse-window --goto "$work/src/predict.ts:31:5"
sleep 3
wid=$(xdotool search --onlyvisible --class code | tail -1)
xdotool windowmove "$wid" 0 0 windowsize "$wid" 2880 1800
sleep 2
# No window manager runs under Xvfb, so focus comes from a click on the title bar.
xdotool windowfocus "$wid" mousemove --window "$wid" 1800 20 click 1
sleep 1
xdotool key ctrl+grave
sleep 3
xdotool type --delay 40 "npm test"
xdotool key Return
sleep 5
# Scroll the terminal back so the command shows above its output.
xdotool mousemove --window "$wid" 2000 1450 click --repeat 6 --delay 80 4 mousemove --window "$wid" 1800 20
sleep 1
xdotool key ctrl+1
sleep 2
# Without a window manager Electron leaves an 8px resize frame on three sides.
import -window "$wid" -crop 2864x1792+8+0 +repage "$out"
pkill -f "user-data-dir $profile/user" || true
EOS
  [ -s "$out" ] || { echo "capture failed: $out" >&2; exit 1; }
  echo "wrote $out"
}

capture "Aion" "$OUT/vscode-dark.png"
capture "Aion Light" "$OUT/vscode-light.png"

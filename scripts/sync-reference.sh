#!/usr/bin/env bash
# Clona/atualiza o Sunflower Land como REFERÊNCIA somente leitura (não versionado).
# O repositório é UNLICENSED: leia para entender, não copie código nem arte.
set -euo pipefail
DIR="reference/sunflower-land"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only
else
  mkdir -p reference
  git clone --depth 1 https://github.com/sunflower-land/sunflower-land.git "$DIR"
fi
echo "Commit de referência: $(git -C "$DIR" rev-parse --short HEAD)"

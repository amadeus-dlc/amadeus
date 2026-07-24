#!/usr/bin/env bash
set -euo pipefail

full=false
drift=false
coverage=false

while IFS= read -r -d '' path; do
  case "${path}" in
    *.ts|*.tsx|*.mts|*.cts|\
    bun.lock|package.json|*/package.json|tsconfig*.json|biome.json|biome.jsonc|\
    .github/workflows/ci.yml|\
    scripts/*|tests/*|packages/framework/*|packages/setup/*|book-pack/*)
      full=true
      ;;
  esac

  case "${path}" in
    packages/framework/*|\
    dist/*|.agents/*|.claude/*|.codex/*|.kiro/*|.cursor/*|.opencode/*|\
    AGENTS.md|CLAUDE.md)
      drift=true
      ;;
  esac

  case "${path}" in
    *.ts|*.tsx|*.mts|*.cts|\
    bun.lock|package.json|*/package.json|\
    .github/workflows/ci.yml|tests/*)
      coverage=true
      ;;
  esac
done

printf 'full=%s\n' "${full}"
printf 'drift=%s\n' "${drift}"
printf 'coverage=%s\n' "${coverage}"

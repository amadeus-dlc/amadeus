#!/usr/bin/env bash
set -euo pipefail

full=false
drift=false
coverage=false
risk=false
changed_count=0

while IFS= read -r -d '' path; do
  changed_count=$((changed_count + 1))

  case "${path}" in
    packages/framework/core/tools/amadeus-*.ts)
      risk=true
      ;;
  esac

  case "${path}" in
    dist/*)
      drift=true
      continue
      ;;
    .kiro/*|.kiro-ide/*)
      continue
      ;;
  esac

  case "${path}" in
    *.ts|*.tsx|*.mts|*.cts|\
    bun.lock|package.json|*/package.json|tsconfig*.json|biome.json|biome.jsonc|\
    .github/workflows/*|\
    docs/reference/15-stage-definition.md|docs/reference/15-stage-definition.ja.md|\
    scripts/*|tests/*|packages/framework/*|packages/setup/*|book-pack/*)
      full=true
      ;;
  esac

  case "${path}" in
    packages/framework/*|\
    .agents/*|.claude/*|.codex/*|.cursor/*|.opencode/*|.kimi-code/*|.pi/*|\
    .gitignore|.gitattributes|\
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

if (( changed_count >= 30 )); then
  risk=true
fi

printf 'full=%s\n' "${full}"
printf 'drift=%s\n' "${drift}"
printf 'coverage=%s\n' "${coverage}"
printf 'risk=%s\n' "${risk}"

# CI Pipeline Memory

## Interpretations

- 2026-07-04T10:38:00Z — 既存 CI は GitHub Actions と解釈した。根拠は `.github/workflows/ci.yaml` である。
- 2026-07-04T10:38:00Z — CI config は新規作成ではなく、既存 workflow と package scripts の整合を記録する成果物として扱う。

## Deviations

- 2026-07-04T10:38:00Z — 実 CI workflow は変更しない。現在の workflow は `npm run test:all` を実行しており、今回の parity failure を gate として検出できるためである。

## Tradeoffs

- 2026-07-04T10:38:00Z — parity failure を回避するための exception は追加しない。人間の明示承認なしに `dev-scripts/data/parity-map.json` を変更しない方針を優先する。

## Open questions

- 2026-07-04T10:38:00Z — PR merge は人間が実行する。CI 成果物と quality gate は、マージ可能性の判断材料としてだけ扱う。

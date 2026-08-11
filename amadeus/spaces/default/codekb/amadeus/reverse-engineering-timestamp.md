# リバースエンジニアリング実施記録

## 最新 scan

- Date: `2026-08-11`
- Observed commit: `854692fd7`
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Depth: `Minimal`
- Focus: [Issue #2838](https://github.com/amadeus-dlc/amadeus/issues/2838) — 4 self-* scope の mandatory PR convergence と手書き report bypass の fail-closed 化
- Result: scope/stage wiring、per-unit engine coverage、PR content provenance は実装済み。report attestation、blocking sensor wiring、local delivery prerequisites、direct completion all-required guard、要求 matrix 回帰は未実装であり、Issue は未解決。
- Scan record: `re-scans/260811-pr-convergence-gate.md`

## Freshness

このファイルは repo 単位の共有 freshness pointer であり、intent 固有の差分 base は scan record に記録する。共有9成果物は last-writer-wins derived cache として本 scan の current snapshot に更新した。

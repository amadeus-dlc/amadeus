# Team Practices 差分ドラフト — Codex Duration Bounds

## 差分判定

変更なし。`code-structure`、`technology-stack`、`dependencies`、`code-quality-assessment`、`architecture`、`business-overview` と4領域のfresh scanを、affirm済みの Way of Working / Walking Skeleton / Testing Posture / Deployment / Code Style と照合したが、変更を要する差分はなかった。

本ドラフトは5個の正準セクション見出しを意図的に含めない部分ドラフトである。`practices-promote` は既存セクションを更新せず、live practiceをbyte-preserveする。

## 既存方針との照合

- Way of Working: `main` 中心の短命PR、Bolt単位のsquash merge、1 Issue = 1 Bolt = 1 PR、着地後の後続rebaseと整合する。
- Walking Skeleton: `self-feature` の最初のConstruction Boltにwalking-skeleton gateを維持する既存規則と整合する。
- Testing Posture: Bunのunit/integration/smoke、risk-based e2e、TDD、coverage・complexity・distribution driftのblocking gateと整合する。
- Deployment: 手動 `workflow_dispatch` からGitHub Releaseとnpm publishを行い、AIがPR mergeやreleaseを自発実行しない既存境界と整合する。
- Code Style: TypeScript/ESM、Bun、strict typecheck、Biome、harness-neutral coreと薄いharness adapter、生成物の直接編集禁止と整合する。

## Intent固有の適用

Codexは一次dogfood対象だが、判定・予算・停止性は共有core契約として定義し、harness adapterはnative factまたはunavailableを供給する。この適用は既存practiceの具体化であり、新しいチーム慣行ではない。

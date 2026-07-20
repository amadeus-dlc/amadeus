# Practices Discovery — Evidence(260720-hold-choice-resolution)

上流入力(consumes 全数): code-structure.md、technology-stack.md、dependencies.md、code-quality-assessment.md、architecture.md、business-overview.md

## 証跡スキャンの代用(practices-discovery:c1)

同日(2026-07-20)の RE diff-refresh(re-scans/260720-hold-choice-resolution.md、observed f6ab1e48d)+前 intent の practices-discovery(260719-ballot-failclosed-amend、timestamp 2026-07-19)を証跡として代用。両者から本 intent 固有の差分ギャップは 0。

## 実測証跡(差分確認)

| 面 | 証跡 | 対応 |
| --- | --- | --- |
| テスト層 | hold 系テストは t236(integration)/t241(e2e)— 本 intent の追加テストも同層へ | Testing Posture どおり |
| コードスタイル | HOLD_RESOLUTIONS の Record テーブル・Result 様式(handleHoldResolved の fail 経路)— 既習様式への追加 | functional-domain-modeling-ts / Tech Stack どおり |
| 配布境界 | scripts/ は dist 投影 0(前 intent RE 実測の継承、区間内も不変) | gh-scripts-boundary 同区画 |
| CI | 既存4検証コマンド不変 | 既存 CI gate |

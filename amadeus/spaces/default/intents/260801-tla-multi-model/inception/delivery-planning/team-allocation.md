# Team Allocation — 260801-tla-multi-model

上流入力(consumes 全数): `bolt-plan.md`

## 体制

ソロモード(単一 conductor セッション + subagent worker)。チーム割り当てなし。

## 実行方式

- 既定: conductor が各 Bolt を直列に subagent ディスパッチ(batch 2 の u2∥u3 は並行可能 — 実行方式 Q1 で裁定)。
- レビュー: ステージ規定の §12a reviewer(architecture-reviewer)を construction のステージ単位で適用。
- 常任グラント `3364aa0b`(stage-gates + phase-boundary、exp 2026-08-02T03:15Z)でゲートを執行。

# Team Practices — 260720-upstream-sync-230（部分ドラフト）

上流入力(consumes 全数): code-structure.md、technology-stack.md、dependencies.md、code-quality-assessment.md、architecture.md、business-overview.md

## 変更セクション

**なし（全セクション live 温存 — practices-discovery:c2）。** discovered-rules.md のとおり新規ルール候補は0件であり、`team.md` / `project.md` への practices-promote は行わない。既存の Way of Working / Walking Skeleton / Testing Posture / Deployment / Code Style をそのまま本 intent に適用する。

## 温存の根拠

- plugin は新しい拡張・配布面だが、greenfield 要素を最初の Construction Bolt で end-to-end に閉じる Walking Skeleton と、正本・6ハーネス配布物・self-install の同期検証が既に project.md で既決である。
- 24項目の upstream 同期は既存 TypeScript/Bun、Result 型、生成投影、GitHub Flow、包括テストの枠内で実施でき、別の作業方式・言語・リリース経路を導入しない。
- release は本 intent のスコープ外であり、手動 `workflow_dispatch` 以外から version/tag/npm publish を行わない既存 Deployment 契約を変更しない。

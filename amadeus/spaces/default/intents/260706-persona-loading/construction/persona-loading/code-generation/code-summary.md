# Code Summary — persona-loading（Issue #582）

## 上流入力

[requirements.md](../../../inception/requirements-analysis/requirements.md)（FR-1〜FR-3、NFR-1〜2）。

## 実施結果

| 変更 | 内容 | 結果 |
|---|---|---|
| stage-protocol.md §5 | 「Include the agent persona context in the Task tool prompt」ほか 3 項を、named agent 自動読込 + 注入禁止 + artifacts/state を渡す理由付きの 2 項へ書き換え（SKILL.md L82・conductor persona・stage 定義と同一語彙） | FR-1.1 充足 |
| stage-protocol.md §11 | 「Always include: Agent persona (agent.md), knowledge files, ...」を「amadeus-state.md + task instructions のみ。persona/knowledge は自動読込 — 注入しない」へ書き換え | FR-1.3 充足 |
| stage-protocol.md §11（隣接 bullet） | 「Cap knowledge files」bullet を削除（手動注入を前提とし、自動読込後は orchestrator 側で cap する機構が存在しないため。reviewer iteration 1 の残存矛盾指摘） | FR-1.3 の帰結 |
| parity-map.json | exceptions[] の既存 stage-protocol.md エントリの reason へ #582 分を統合（新規エントリなし、engineFileExceptions 不変。上流フィードバック候補の旨を明記 = FR-3 の記録先） | FR-2 / FR-3 充足 |

## 検証記録

| 検証 | 結果 |
|---|---|
| 旧文言の残存 grep（Include the agent persona / Agent persona (agent.md)） | 0 件 |
| npm run parity:check | ok（既存エントリの理由統合のみ） |
| npm run test:all | 実行結果は build-and-test で記録 |

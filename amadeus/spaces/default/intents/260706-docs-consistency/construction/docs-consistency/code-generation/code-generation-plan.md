# Code Generation Plan — docs-consistency

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)（実施設計の正）、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 実施計画と実施結果

| # | 作業 | 実施方法 | 結果 |
|---|---|---|---|
| 1 | B001-1: 参照元更新（`skill-language-policy{.md,.ja.md}` の Related documents リンクを到達点段落へ置換、`aidlc-v2-reviewer-mapping{.md,.ja.md}` のリンク行を除去） | 設計文例に基づき英日 4 ファイルを直接編集 | 完了 |
| 2 | B001-2: `docs/amadeus/skill-englishization-rollout-plan{.md,.ja.md}` を `git rm`（互換 stub なし） | `git rm` | 完了 |
| 3 | B001-3: リンク切れ横断 grep | `grep -rln "skill-englishization-rollout-plan" docs amadeus` から record 配下を除外 | 完了（0 件。skill-language-policy 側の git 履歴参照 2 件のみ残存、リンクではない） |
| 4 | B002-1〜2: overview / scopes（英日）の 2 層構造化（定義行、ツリー内コメント、差分表行、41/104 行） | 設計文例に基づき英日 4 ファイルを直接編集。scopes.md のステージ数表は `bun run .agents/amadeus/tools/amadeus-utility.ts scope-table` で再実測し、記載値（bugfix 7/32、refactor 8/32、poc 8/32 等）と一致することを確認（BR-8） | 完了 |
| 5 | B002-3: `memory/phases/operation.md`（steering、日本語のみ）の根拠引用補正 | 直接編集 | 完了 |
| 6 | B002-4: `aidlc-v2-operation-phase-boundary{.md,.ja.md}` の位置づけ注記追加 + Decision 節断定文の補正 | 設計文例（文字列回避方式）に基づき直接編集 | 完了 |
| 7 | B002-5: overview（L197 ツリーコメント）、state（L64）、construction（L221）の同型矛盾の補正（reviewer it1 #1/#2） | 設計文例に基づき英日 6 ファイルを直接編集 | 完了 |
| 8 | 記録整合: `amadeus-state.md` の `Per unit: [TBD]` を実 unit 名 `docs-consistency` へ手動更新 | 直接編集（前例踏襲。team.md Corrections 記載の既知対応） | 完了 |

## 検証（NFR-1 の 4 項目）

1. `npm run test:all` — pass（全 suite green）。
2. リンク切れ grep（`skill-englishization-rollout-plan` の record 外横断 grep）— 0 件。
3. Operation 矛盾表現 5 文字列の単純横断 grep（`docs/amadeus/` + `amadeus/spaces/default/memory/`、record 除外）— 0 件。
4. `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-docs-consistency` — pass（不足・矛盾 0 件）。

詳細な実行ログと逸脱の有無は [code-summary.md](code-summary.md) を参照する。

# Domain Entities — pr-gate-discipline

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 規範の層（本 Intent が扱う実体）

| 実体 | 位置 | 役割 | 配布 |
|---|---|---|---|
| ルール（不変条件） | team.md「PR 監視」節、phases/construction.md「PR Gate」節 | rules_in_context として全ステージへ常時注入される注意資源。最小の不変条件だけを持つ | 乗らない（workspace 層） |
| ルール（不変条件、メソドロジ既定） | stage-protocol.md「Construction Bolt gates」節 | 配布先の利用者環境でも立つ最小ポインタ | 乗る（installer の amadeus-common） |
| 知識（手順・判断基準） | `.agents/amadeus/knowledge/amadeus-shared/pr-gate-discipline.md` | PR 作成後の場面で参照される手順の正本 | 乗る（installer の knowledge） |
| ポインタ | ルール側 3 か所の参照文字列 | ルールから知識文書への導線。実在パスへ解決すること（Q4 = A の機械的確認対象） | ルールと同じ |

## 関係

- ルール（3 か所）→ 知識文書: 参照（ポインタ）。多対 1。
- 知識文書 → ルール: §Invariants がルール側の不変条件を再掲し、意味の一致を保つ（乖離時はルール側 = 正）。
- team.md の固有名例示 → 知識文書の一般化表現: 具体化の関係（workspace 固有の実例）。
- ローカル正準（.agents/amadeus/ 側）↔ 上流（awslabs/aidlc-workflows）: parity-check による適応差分の追跡。stage-protocol.md の追記は `exceptions[]` の既存エントリへの理由統合で宣言する。skills/ 側に対応ファイルは存在せず（実測）、`skills/amadeus/references/aidlc-v2/` は上流スナップショットで同期対象外。知識文書は上流対応物を持たない新設ファイルであり、出自は PR 説明で追跡する。

## ライフサイクル

1. 本 Intent: 知識文書の新設、ルール側 3 か所の最小化・追記、parity reason 統合（一時停止条件は PR #542 merge で解除済み。code-generation 前に origin/main へ再追従する）。
2. 次の PR サイクル: Maintainer が個人 CLAUDE.md から重複情報を削除し、engineer の PR 監視挙動が維持されることを観察検証（受け入れ条件 2。本 Intent のスコープ外）。
3. 将来: #530（リンター = 強制）で規律の機械的強制を検討。#533（利用者ガイド）が知識文書を素材に troubleshooting/PR 章を執筆。上流提案は人間判断。

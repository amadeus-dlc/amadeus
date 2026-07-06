# Code Summary — guide-ops

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-logic-model.md](../functional-design/business-logic-model.md)

## 実施した変更

### 新設（docs/guide/、6 ファイル = 3 対）

| 章 | H1（英語版） | H2 対 |
|---|---|---|
| 06 | Agents | 6 / 6 |
| 07 | Interaction Modes | 5 / 5 |
| 12 | CLI Commands | 6 / 6 |

- 執筆は subagent 2 体並行（A = 06 + 07、B = 12）。上流 docs/guide 本文は開いていない。
- 12 章の help 掲載は全 50 行を 5 block に分割（無改変、subagent B が diff 照合）。06 章の 14 agents / 07 章の 4 択は照合台帳と一致（subagent 自己検証 + conductor 再確認）。

### index 対の更新

- 06 / 07 / 12 の 3 行を予定一覧（4 列）から削除し、既執筆章の上部テーブル（3 列）へ実リンク行として移動（設計どおり）。
- あわせて予定一覧の導入文（「導入 3 章より先の章」）を、3 行移動後の実態に合う表現（「まだ執筆していない章」/ extend the guide further）へ 1 行ずつ整合修正した（stage reviewer の申告精度指摘を受けて追記）。

## 初見読者レビュー（NFR-4、reviewer / GPT-5.5）の所見と対応

High 4 + Low 2 → 全件対応（commit 7c1f6ed8、英日同時）。合否基準を対応完了で充足。

| 所見 | 対応 |
|---|---|
| High 1: `--version` を「参照全体を表示」と誤記 | framework 版表示へ訂正（help の実記述と一致） |
| High 2: read-only 分類に `intent <name>` / `space <name>`（カーソル切替）を混入 | 切替系を「状態・ワークフロー系」へ分離し、安全な確認操作と誤読されない記述へ |
| High 3: 「常にこの順序の 4 択」の一般化が Codex annex（3 択 + custom）と不整合 | Claude Code 前提へ限定し、Codex の見え方を 1 文補足 |
| High 4: subagent の persona を「Task 呼び出しへ内容を渡す」と誤記（SKILL.md は自動読込・注入禁止） | harness が自動読込する実体へ訂正 |
| Low 1: 実行モードの参照先（overview に決定規則なし） | stage frontmatter + Stage Catalog へ変更 |
| Low 2: Guide me 説明の each question / batch 衝突 | 小さなまとまり単位の表現へ |

## 検証結果

- 英語版 3 件: 日本語残存 0 件。3 対 + index 対の H2 数一致。
- リンク機械検査（NFR-5）: checker を新章 6 ファイルへ拡張して checked=198 broken=0（対象リスト固定の checker は新設ファイルを黙って素通しするため、拡張自体を検品項目とした）。
- help 掲載の無改変: 5 block を実測ログと diff 照合（subagent B）。
- コミット構成（BR-7）: 06 対 / 07 対 / 12 対 / index 対 / レビュー所見反映 の 5 コミット。

## PR 準備前の残タスク

- validator + `npm run test:all` の実行・記録（build-and-test）。
- draft PR 作成 → 3 条件で Ready → merge 依頼。

# Delivery Planning — Questions（260725-teamup-launch-hardening / #1476, #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-dependency.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-story-map.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/practices-discovery/team-practices.md`

- `requirements.md` — NFR-3（actas 排他ロック）と FR-7（部分失敗のロールバック）を主要リスクの根拠とした。
- `components.md` — 変更対象コンポーネントを引き、リスクが顕在化する箇所を特定した。
- `unit-of-work.md` — 各ユニットの完了の定義を引き、リスク緩和の検証点と対応づけた。
- `unit-of-work-dependency.md` — 依存辺ゼロと配布同期の交差を引き、順序決定の根拠とした。
- `unit-of-work-story-map.md` — US-2 の順序制約を引き、Bolt 1 内部順序のリスク根拠とした。
- `team-practices.md` — 落ちる実証・配布同期・検証コマンドの実務を、各リスクの緩和手段とした。

## E-OC1 選挙不要判定

判定: **選挙不要（ソロモード）**。根拠種別 = 運用形態。`AMADEUS_OPERATING_MODE` は未設定でありソロモード（`team.md` § Operating Modes）。

leader 承認: 2026-07-25T13:50Z — ユーザーが conductor へ直接指示。本ステージは既決裁定から Bolt 構成・順序・リスクを機械的に導出する工程であり、**新たな未決事項は生じなかった**。

## 既決事項（本ステージで再度問わない）

`cid:requirements-analysis:no-election-for-decided-norms` に従う。

| 事項 | 裁定 | 出典 |
|---|---|---|
| 出荷単位 | ユニットごとに2 PR | intent-capture Q1 = A |
| 完了条件 | 実測2点 + テスト構造の是正 | intent-capture Q3 = A |
| 待機位置 | 検証を `mux_attach` の後ろへ移す | feasibility Q1 = A |
| 並列度 | 固定上限4 | feasibility Q2 = A |
| タイムアウト | 実測 32.2秒 へ接地して縮小 | requirements Q1 = A |
| ロールバック | worktree 実在走査で再導出 | requirements Q2 = A |
| ユニット分割 | 2ユニット、依存辺ゼロ | units-generation（reviewer READY） |

## 本ステージで導出した事項（裁定不要）

| 事項 | 導出結果 | 根拠 |
|---|---|---|
| Bolt 順序 | U1 → U2 の直列 | 依存辺ゼロ + 優先度（P1 → P2）+ 配布同期の交差による直列化 |
| Bolt 1 の内部順序 | B-3（待機設計）を先頭 | US-2 の順序制約。actas 移行を先に入れると退行の窓ができる |
| 自律性モード | `gated`（各 Bolt でユーザー承認） | ソロモード運用。`org.md` のラダープロンプトは walking-skeleton 実行時のもので、本 intent は該当しない |
| walking-skeleton | 適用しない | greenfield 要素なし（`project.md` § Walking Skeleton） |

## 本ステージで新たに必要な裁定

**なし。**

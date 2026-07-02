# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | 迂回路は skill 本文の前提と auto 判定の記述変更で塞げる。approval evidence の検査は、`state.json.construction.bolts[].taskGeneration` の構造検査として `amadeus-validator` の既存検査枠組みに追加できる。 |
| 運用 | feasible | `ready_for_approval` で停止して承認を待つ型になり、ハーネスによって人間承認と grilling の実行有無が変わらなくなる。承認の妥当性判断は人間に残る。 |
| セキュリティ | feasible | 検査は workspace 内の `state.json` と成果物の読み取りだけで成立する。秘密情報や認証情報を扱わない。 |
| 依存 | feasible | grilling 起動トリガーは Intent 20260701-decision-review-grilling-gate で確定した decision review 契約への追加である。skill 変更 PR はレビュー支援契約（Intent 20260702-skill-change-review-contract）に従い、昇格は promote 手順を使える。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | ゲート契約の強度、scaffold-only 許可条件、Task Generation Gate の承認を行う。 |
| Agent | 実行者 | `ready_for_approval` で停止して承認を待ち、決定論的トリガーに従って grilling を起動する。 |
| Reviewer | 参照者 | skill 変更 PR の挙動差分要約と skill-forge 確認の記録から、ゲート契約の影響を判断する。 |
| Validator | 構造検出者 | `taskGeneration.status: passed` と approval evidence の対応を構造検査する。 |
| Evaluator | 品質評価者 | ゲート契約の記述が既存の判定表や decision review 契約と矛盾しないかを確認する候補になる。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | Bolt 準備が `ready_for_approval` へ到達してから、停止、人間承認、`passed`、実装開始、validator の evidence 検査へ進む流れを示す。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- decision review の決定論的トリガーが読む「前段成果物の未確定事項」の対象範囲と判定形式は Inception で判断する。
- scaffold-only を許可する「確定判断の記録」の種類と確認方法は Inception で判断する。
- approval evidence の構造（`evidence` 配列の位置、`kind: approval` 以外の必須フィールド）は、既存の examples と `.amadeus/intents/**` の実データを分析して Inception で判断する。
- 既存の examples と `.amadeus/intents/**` に approval evidence なしの `passed` が存在する場合の移行方法は Inception で判断する。
- validator の eval の置き場所と実行方法は Inception で判断する。

## 学習候補

- 人間ゲートは「承認済みの場合だけ進む」という肯定形の前提にしないと、中間状態（`ready_for_approval`）を通過できる迂回路が残る。
- skill 契約（振る舞い）と validator 検査（構造）は同じゲート契約の両面であり、片方だけでは決定論性を担保できない。
- auto 判定の「質問不要で進められる」のような主観条件は、確定判断の記録の実在という客観条件に置き換えると、進めたいエージェントの自己判定を防げる。

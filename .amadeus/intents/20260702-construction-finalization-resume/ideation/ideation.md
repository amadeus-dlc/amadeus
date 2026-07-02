# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | 未 finalize の状態は、`state.json`（`construction.status`、`gate`、Bolt の taskGeneration）と Bolt 成果物（`test-results.md` の存在、`pr.md` の有無）から決定論的に判定できる。 |
| 運用 | feasible | 再開規則が入れば、merge 後に `amadeus-construction` を再実行するだけで finalization へ入る型になり、監視できないハーネスでも人間の記憶に頼らない。 |
| セキュリティ | feasible | 検出は workspace 内の成果物と state の読み取りだけで成立させられる。秘密情報や認証情報の保存を前提にしない。 |
| 依存 | feasible | skill 変更 PR はレビュー支援契約（Intent 20260702-skill-change-review-contract）に従い、昇格は promote 手順を使える。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | 再開規則の強度、検出結果の扱い、stage0 採用判断を承認する。 |
| Agent | 実行者 | merge 後の再実行で再開規則に従い、検出スクリプトの結果を入力証拠として使う。 |
| Reviewer | 参照者 | skill 変更 PR の挙動差分要約と skill-forge 確認の記録から、再開規則の影響を判断する。 |
| Validator | 構造検出者 | 更新された Intent 成果物、リンク、状態を検出する。 |
| Evaluator | 品質評価者 | auto 判定の記述が既存の判定表と矛盾しないかを確認する候補になる。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | merge 後に `amadeus-construction` を再実行したとき、検出、再開規則、finalization へ進む流れを示す。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- 実装 PR の merge 済みを、成果物と state だけで判定するか、GitHub への照会を許容するかは Inception で判断する。
- 検出スクリプトの入出力契約（対象 workspace の指定方法、出力形式、終了コード）は Inception で判断する。
- 同梱スクリプトの検証の置き場所を、昇格先に evals を混ぜない制約と両立させる方法は Inception で判断する。
- 検出結果を auto 判定の判定表に置くか、Decision Review の入力証拠に置くかは Inception で判断する。

## 学習候補

- セッション外のイベント（merge）の後に必要な工程は、イベント監視ではなく「再実行時の決定論的な状態検出」で再開できる形にすると、ハーネス差の影響を受けない。
- skill の実行時に使う検出は、repo の開発用スクリプトではなく同梱スクリプトに置く必要がある。
- 完了済みに見える Intent でも、`construction.gate` と Bolt 証拠を突き合わせると未 finalize を機械的に発見できる。

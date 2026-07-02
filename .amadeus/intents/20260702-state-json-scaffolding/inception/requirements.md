# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | phase 遷移単位で valid な `state.json` 雛形を生成、更新でき、生成直後の validator が構造 fail を出さない。 | 採用済み | なし | [R001-transition-scaffold-generation.md](requirements/R001-transition-scaffold-generation.md) |
| R002 | 雛形の更新は、既存 state の値と前 phase の状態ブロックを保持する。 | 採用済み | R001 | [R002-existing-state-preservation.md](requirements/R002-existing-state-preservation.md) |
| R003 | スクリプトは同梱スクリプトとして 1 箇所に置かれ、配布先ユーザー環境で動作する。 | 採用済み | なし | [R003-bundled-placement-distribution.md](requirements/R003-bundled-placement-distribution.md) |
| R004 | 対象 phase skill の state 更新手順から、スクリプトの利用が参照されている。 | 採用済み | R001, R003 | [R004-skill-procedure-reference.md](requirements/R004-skill-procedure-reference.md) |
| R005 | スクリプトの検証は、先に失敗する eval を追加して RED を確認してから実装されている。 | 採用済み | R001 | [R005-eval-first-verification.md](requirements/R005-eval-first-verification.md) |
| R006 | skill 変更は promote 手順で同期され、PR がレビュー支援契約に従う。 | 採用済み | R003, R004 | [R006-promotion-and-review-contract.md](requirements/R006-promotion-and-review-contract.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | 遷移単位の生成契約は他の要求に依存せず定義できるため。 |
| R002 | R001 | 保持規則は R001 の生成、更新の動作に対する制約であるため。 |
| R003 | なし | 配置と配布の制約は他の要求に依存せず定義できるため。 |
| R004 | R001, R003 | 手順が参照するスクリプトの実在と配置が前提になるため。 |
| R005 | R001 | eval は R001 の生成契約を検証対象にするため。 |
| R006 | R003, R004 | 昇格同期は、配置したスクリプトと手順変更を対象にするため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 採用済み | 未登録 |
| R002 | 採用済み | 未登録 |
| R003 | 採用済み | 未登録 |
| R004 | 採用済み | 未登録 |
| R005 | 採用済み | 未登録 |
| R006 | 採用済み | 未登録 |

## Requirements Review Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| Ideation scope との対応 | passed | SC-IN-001 を R001 と R002、SC-IN-002 を R003、SC-IN-003 を R004、SC-IN-004 を R005、SC-IN-005 を R006 に対応付けた。 |
| 対象外の維持 | passed | dev-scripts への配置、成果物 Markdown の自動生成、validator の要求構造の変更を要求に含めていない。 |
| 依存関係 | passed | 生成契約と配置を独立に定義し、参照、検証、昇格同期がそれらに依存する順に整理した。 |
| 検証可能性 | passed | 各要求は生成直後の validator 実行、eval の RED 記録、配布先相当環境での実行、promote 同期の一致から検証できる。 |

## 未確認事項

- なし。

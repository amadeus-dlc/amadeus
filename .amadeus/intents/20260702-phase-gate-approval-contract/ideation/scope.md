# スコープ

## 対象境界

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | `amadeus-construction-implementation-execution` の前提を「`taskGeneration.status` が `passed`（人間承認済み）の場合だけ実装へ進む」に変更する。 | [Issue #306](https://github.com/amadeus-dlc/amadeus/issues/306) | 採用 |
| SC-IN-002 | `amadeus-construction-bolt-preparation` に、`ready_for_approval` へ到達したら停止して人間の承認を待ち、承認を得てから `passed` にする行動を肯定形で明記する。 | [Issue #306](https://github.com/amadeus-dlc/amadeus/issues/306) | 採用 |
| SC-IN-003 | phase skill（ideation、inception、construction）の decision review に、前段成果物の未確定事項に「現在 phase で判断する」と記録された項目が残っている場合は `grill_required` とする決定論的トリガーを追加する。 | [Issue #306](https://github.com/amadeus-dlc/amadeus/issues/306) | 採用 |
| SC-IN-004 | `amadeus-ideation` の auto 判定で scaffold-only を許可する条件を、入力に確定判断の記録（Issue の確定判断、Grilling Decision Trail など）が存在する場合に限定する。 | [Issue #306](https://github.com/amadeus-dlc/amadeus/issues/306) | 採用 |
| SC-IN-005 | `amadeus-validator` に、`taskGeneration.status` が `passed` の場合は `evidence` に `kind: approval` の項目が含まれることの構造検査を追加する。 | [Issue #307](https://github.com/amadeus-dlc/amadeus/issues/307) | 採用 |
| SC-IN-006 | validator 変更は、先に失敗する eval を追加してから実装する。 | [Issue #307](https://github.com/amadeus-dlc/amadeus/issues/307) | 採用 |
| SC-IN-007 | source skill と昇格先成果物を promote 手順で同期する。 | [Intent](../../20260702-phase-gate-approval-contract.md) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | 承認内容の妥当性を機械判断する。人間判断のまま残す。 | [Issue #307](https://github.com/amadeus-dlc/amadeus/issues/307) | 採用 |
| SC-OUT-002 | approval evidence が指す成果物の内容を検査する。 | [Issue #307](https://github.com/amadeus-dlc/amadeus/issues/307) | 採用 |
| SC-OUT-003 | Task Generation 以外の新しい人間ゲートを追加する。 | [Issue #306](https://github.com/amadeus-dlc/amadeus/issues/306) | 採用 |
| SC-OUT-004 | 完了済み Intent 成果物を遡及修正する。 | [Issue #306](https://github.com/amadeus-dlc/amadeus/issues/306) | 採用 |
| SC-OUT-005 | 初期 Ideation で後続 phase の詳細成果物や実装を作る。 | [Intent](../../20260702-phase-gate-approval-contract.md) | 採用 |

## 実行制御

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | refactor | 既存の phase skill 契約と validator を、確定済みのゲート契約へ強化するため。 |
| 省略 stage | なし | ゲート契約の要求と validator 検査の契約を Inception で分解し、Construction で skill 変更と validator 実装を行うため。 |

## 成果物深度

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | 迂回路ごとの契約変更箇所、validator 検査の入力構造、eval の失敗条件を追跡できる粒度が必要であるため。 |

## 検証戦略

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | skill 本文の差分、validator の eval、promote 同期、既存 examples と `.amadeus/intents/**` の pass 維持、標準検証の確認が必要であるため。 |

## Inception への引き継ぎ

- decision review の決定論的トリガーが読む「前段成果物の未確定事項」の対象範囲（`ideation.md` の未確定事項、Discovery の未確認、その他）と判定形式を確定する。
- 「確定判断の記録」として scaffold-only を許可する入力の種類（Issue の確定判断、Grilling Decision Trail、その他）と確認方法を確定する。
- approval evidence の構造（`evidence` 配列の位置、`kind: approval` 以外の必須フィールド）を、既存の examples と `.amadeus/intents/**` の実データから確定する。
- 既存の examples と `.amadeus/intents/**` に approval evidence なしの `passed` が存在するかを調べ、pass 維持の受け入れ条件と両立する移行方法を確定する。
- validator の eval の置き場所と実行方法を確定する。

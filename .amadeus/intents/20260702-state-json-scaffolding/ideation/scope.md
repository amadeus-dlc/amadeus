# スコープ

## 対象境界

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | phase 遷移（Intent Capture、Inception 開始と完了、Construction 開始、Functional Design、Bolt 準備、finalization）ごとに valid な `state.json` 雛形を生成、更新する同梱スクリプトを追加する。 | [Issue #311](https://github.com/amadeus-dlc/amadeus/issues/311) | 採用 |
| SC-IN-002 | スクリプトは対象 skill の同梱スクリプト（`skills/amadeus-*/scripts/**`）として置き、promote で昇格し、配布先ユーザー環境でも実行できるようにする。 | [Issue #311](https://github.com/amadeus-dlc/amadeus/issues/311) | 採用 |
| SC-IN-003 | skill 本文の該当手順から、スクリプトの利用を参照する。 | [Issue #311](https://github.com/amadeus-dlc/amadeus/issues/311) | 採用 |
| SC-IN-004 | スクリプトは、先に失敗する eval または検証を追加してから実装する。 | [Issue #311](https://github.com/amadeus-dlc/amadeus/issues/311) | 採用 |
| SC-IN-005 | source skill と昇格先成果物を promote 手順で同期する。 | [Intent](../../20260702-state-json-scaffolding.md) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | repo root の dev-scripts へ雛形生成スクリプトを配置する。skill の実行時参照にできないため。 | [Issue #311](https://github.com/amadeus-dlc/amadeus/issues/311) | 採用 |
| SC-OUT-002 | 成果物 Markdown を自動生成する。テンプレートと内部 skill の責務のまま残す。 | [Issue #311](https://github.com/amadeus-dlc/amadeus/issues/311) | 採用 |
| SC-OUT-003 | validator の要求構造そのものを変更する。 | [Issue #311](https://github.com/amadeus-dlc/amadeus/issues/311) | 採用 |
| SC-OUT-004 | 初期 Ideation で後続 phase の詳細成果物や実装を作る。 | [Intent](../../20260702-state-json-scaffolding.md) | 採用 |

## 実行制御

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | refactor | 既存の phase skill の state 更新手順を、決定論的な生成手段へ強化するため。 |
| 省略 stage | なし | 雛形の入出力契約とスクリプトの配置先を Inception で分解し、Construction でスクリプト実装と skill 本文の参照追加を行うため。 |

## 成果物深度

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | 対象遷移ごとの雛形の入出力契約、スクリプトの配置先 skill、既存 state 実データとの整合を追跡できる粒度が必要であるため。 |

## 検証戦略

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | スクリプトの eval（RED → GREEN）、各遷移直後の validator pass、promote 同期、標準検証の確認が必要であるため。 |

## Inception への引き継ぎ

- スクリプトの配置先 skill（各 phase skill に分けるか、共有の 1 箇所に置くか）を確定する。
- 対象遷移ごとの入出力契約（引数、既存 state の読み方、更新の冪等性、出力形式）を確定する。
- 雛形が既存 state を上書きしない更新規則（既存値の保持、必須配列の追記）を確定する。
- eval の置き場所と実行方法を、昇格先に evals を混ぜない制約と両立させる形で確定する。
- validator の要求構造の参照方法（生成済み契約 `generated/**` の再利用可否）を確定する。

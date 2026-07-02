# スコープ

## 対象境界

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | `amadeus-construction` の auto 判定に、実装済みかつ検証済みで実装 PR が merge 済みにもかかわらず `construction.gate` が `passed` でない状態を検出して finalization を選ぶ再開規則を追加する。 | [Issue #309](https://github.com/amadeus-dlc/amadeus/issues/309) | 採用 |
| SC-IN-002 | 未 finalize の Intent を機械的に列挙する検出スクリプトを、`amadeus-construction` の同梱スクリプトとして追加する。 | [Issue #309](https://github.com/amadeus-dlc/amadeus/issues/309) | 採用 |
| SC-IN-003 | auto 判定から検出スクリプトの結果を入力証拠として参照できるようにする。 | [Issue #309](https://github.com/amadeus-dlc/amadeus/issues/309) | 採用 |
| SC-IN-004 | 検出スクリプトは、先に失敗する eval または検証を追加してから実装する。 | [Issue #309](https://github.com/amadeus-dlc/amadeus/issues/309) | 採用 |
| SC-IN-005 | source skill と昇格先成果物を promote 手順で同期する。 | [Intent](../../20260702-construction-finalization-resume.md) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | repo root の dev-scripts へ検出スクリプトを配置する。 | [Issue #309](https://github.com/amadeus-dlc/amadeus/issues/309) | 採用 |
| SC-OUT-002 | merge イベントの自動監視や webhook などハーネス側の仕組みを作る。 | [Issue #309](https://github.com/amadeus-dlc/amadeus/issues/309) | 採用 |
| SC-OUT-003 | finalization そのものを自動 merge する。 | [Issue #309](https://github.com/amadeus-dlc/amadeus/issues/309) | 採用 |
| SC-OUT-004 | 完了済み Intent 成果物を遡及修正する。 | [Issue #309](https://github.com/amadeus-dlc/amadeus/issues/309) | 採用 |
| SC-OUT-005 | 初期 Ideation で後続 phase の詳細成果物や実装を作る。 | [Intent](../../20260702-construction-finalization-resume.md) | 採用 |

## 実行制御

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | refactor | 既存の Construction phase skill の auto 判定と同梱資産を、確定済みの再開契約へ強化するため。 |
| 省略 stage | なし | 再開規則と検出スクリプトの契約を Inception で分解し、Construction で skill 変更とスクリプト実装を行うため。 |

## 成果物深度

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | 再開規則の判定証拠、検出スクリプトの入出力契約、skill 本文からの参照方法を追跡できる粒度が必要であるため。 |

## 検証戦略

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | skill 本文の差分、同梱スクリプトの eval、promote 同期、validator、標準検証の確認が必要であるため。 |

## Inception への引き継ぎ

- 再開規則の判定に使う証拠を確定する。実装 PR の merge 済みを、成果物と state だけで判定するか、GitHub への照会を許容するかを含む。
- 検出スクリプトの入出力契約（対象 workspace の指定方法、出力形式、終了コード）を確定する。
- 同梱スクリプトの検証（eval）の置き場所と実行方法を確定する。昇格先に evals を混ぜない制約と両立させる。
- 検出結果を auto 判定のどの位置で読むか（判定表の行として追加するか、Decision Review の入力証拠とするか）を確定する。

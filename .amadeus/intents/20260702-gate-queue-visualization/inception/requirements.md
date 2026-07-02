# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | 承認待ちと判定する条件が、確定済みの `state.json` ゲート語彙契約から導出され、契約と矛盾しない。 | 採用済み | なし | [R001-gate-contract-conformance.md](requirements/R001-gate-contract-conformance.md) |
| R002 | 複数 Intent の `state.json` を横断スキャンし、承認待ちの Intent、phase、ゲート、待ち理由を 1 回の実行で Markdown 表として一覧できる。 | 採用済み | R001 | [R002-approval-queue-listing.md](requirements/R002-approval-queue-listing.md) |
| R003 | 承認待ちが 0 件の場合も、出力からその旨が分かる。 | 採用済み | R002 | [R003-zero-waiting-visibility.md](requirements/R003-zero-waiting-visibility.md) |
| R004 | 一覧の実行入口が配布先ユーザー環境で実行でき、実行手順が利用者向け文書から読める。 | 採用済み | R002 | [R004-distribution-and-procedure.md](requirements/R004-distribution-and-procedure.md) |
| R005 | 承認待ち判定と一覧出力の検証を、実装より先に追加して RED を確認する。 | 採用済み | R001, R002, R003 | [R005-verification-first.md](requirements/R005-verification-first.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | 判定条件は確定済みのゲート語彙契約だけを前提に定義できるため。 |
| R002 | R001 | 一覧は、何を承認待ちと判定するかの条件が確定していることが前提になるため。 |
| R003 | R002 | 0 件時の表示は、一覧の出力契約の一部であるため。 |
| R004 | R002 | 配布と手順の記載は、実行入口の存在が前提になるため。 |
| R005 | R001, R002, R003 | 検証は判定条件と一覧出力（0 件時を含む）を対象にするため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 採用済み | 未登録 |
| R002 | 採用済み | 未登録 |
| R003 | 採用済み | 未登録 |
| R004 | 採用済み | 未登録 |
| R005 | 採用済み | 未登録 |

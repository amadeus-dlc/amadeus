# Business Logic Model

## 目的

provenance 記録の生成と、記録済み値の実測照合による drift 検出の業務ロジックを定義する。

## 対象 Unit

U001 provenance 記録契約。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | 対象 Intent、利用ツール（skill / validator / devScripts）の path 一覧、入力項目（harness 名、target artifacts、stage 判定根拠、stage0 採用判断）を受け取り、git コマンドとファイルハッシュ計算で 9 項目に対応する値を実測する。 | 対象 Intent 識別子、利用ツールの path 一覧、入力項目 | Provenance Record | R001, UC001 |
| BL002 | 実測した Provenance Record を、対象 Intent の `provenance/` 配下の既存ファイルを走査して求めた次番号で `Pnnn-<slug>.json` として出力する。既存ファイルは上書きしない。 | Provenance Record、対象 Intent の `provenance/` の既存ファイル一覧 | Provenance Record File | R001, UC001, D002（記録ファイル命名規則の採用） |
| BL003 | 対象 workspace の `.amadeus/intents/**` を走査し、`provenance/` ディレクトリが存在する Intent だけを検査対象にする（既存 Intent への遡及なし）。 | 対象 workspace の path | 検査対象 Intent の一覧 | R002, GD002 |
| BL004 | 検査対象 Intent の Provenance Record File ごとに、記録された `commit` と `path` の組から `git show <commit>:<path>` で記録時点の内容を取り出し、md5 を再計算して記録値と照合する。 | Provenance Record File | 照合結果（一致 or 不一致） | R002, D001（記録照合セマンティクスの採用） |
| BL005 | 照合結果から drift（md5 不一致、commit 不一致、参照先欠落）を判定し、drift だけを stdout へ1行1件で出力する。 | 照合結果 | Drift Report | R002, UC002 |
| BL006 | `provenance:check` の実行結果を `npm run test:all` chain（`test:it:all` 経由）に組み込み、drift ありまたは入力エラーは exit 1、検出0件を含む正常は exit 0 として標準検証の成否に反映する。 | Drift Report | 標準検証の終了コード | R003, UC002 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| 対象 Intent 識別子 | `provenance:generate` の実測対象を特定する Intent ディレクトリ名。 | R001 |
| 利用ツールの path 一覧 | 利用した昇格済み skill、validator、開発用スクリプトの path。commit と md5 は実測する。 | R001 |
| 入力項目 | harness 名、target artifacts の対象範囲、stage 判定の根拠、人間による次回 stage0 採用判断の有無。 | R001 |
| 対象 workspace の path | `provenance:check` が `.amadeus/intents/**` を走査する起点。 | R002 |
| Provenance Record File | `provenance:check` が照合する記録済みの JSON。 | R002 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| Provenance Record | policies.md の最低記録項目9項目に1:1対応する実測値の集合。 | Provenance Record File |
| Provenance Record File | `provenance/Pnnn-<slug>.json` として累積される記録。 | `provenance:check` の照合対象、Agent のコミット対象 |
| Drift Report | drift（md5 不一致、commit 不一致、参照先欠落）の1行1件出力。 | Agent の修正判断、`npm run test:all` の成否 |
| 標準検証の終了コード | `provenance:check` の exit 0（正常）/ exit 1（drift ありまたは入力エラー）。 | CI（`npm run test:all`） |

## 未確認事項

- eval の置き場所（`dev-scripts/evals/` 配下の具体的なディレクトリ名）と `package.json` の実行入口名（`provenance:generate`、`provenance:check` の npm script 名と `test:all` chain への組み込み位置）は Task Generation で確定する。

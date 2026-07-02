# Business Rules

## 目的

provenance 記録契約の判断規則と Intent Contracts を定義する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | Provenance Record の JSON スキーマは、policies.md の「provenance の最低記録項目」9 項目と1:1対応する。フィールド構成は `domain-entities.md` の「Provenance Record のフィールド構成」による。 | R001, Inception D004（JSON スキーマの項目構成の調査解消） | accepted |
| BR002 | 記録先のファイル名は `provenance/Pnnn-<slug>.json` とする。`Pnnn` は Intent 内の3桁連番で欠番を再利用せず、slug は作業内容を表す小文字英数字とハイフンとする。 | R001, D002（記録ファイル命名規則の採用） | accepted |
| BR003 | `provenance:check` は「現在のファイル」とは比較しない。記録された `commit` と `path` の組から `git show <commit>:<path>` で記録時点の内容を取り出し、md5 を再計算して記録値と照合する。 | R002, D001（記録照合セマンティクスの採用） | accepted |
| BR004 | 検出する drift は3種類とする。(1) md5 不一致、(2) commit 不一致（記録された commit が git 履歴に存在しない）、(3) 参照先欠落（記録された repo 相対 path が記録 commit 時点で存在しない）。スキーマ不適合（9 項目の欠落、JSON 解釈不能）も失敗として扱う。 | R002, D001（記録照合セマンティクスの採用） | accepted |
| BR005 | `provenance:check` の検査対象は `provenance/` ディレクトリが存在する Intent だけとし、既存 Intent へ遡及しない。 | R002, Inception D002（検査対象境界の採用） | accepted |
| BR006 | `provenance:generate` は、対象 Intent、利用ツールの path 一覧、入力項目（harness 名、target artifacts、stage 判定根拠、stage0 採用判断）を入力に受け取り、実測して `provenance/Pnnn-<slug>.json` を出力する。既存ファイルは上書きしない。 | R001, UC001 | accepted |
| BR007 | `provenance:check` は対象 workspace の path を引数に取り、drift を stdout へ1行1件で出力する。exit 0 は正常実行（検出0件を含む）、exit 1 は drift ありまたは入力エラーとする。 | R002, R003, UC002 | accepted |
| BR008 | `provenance:check` の実行は `npm run test:all` chain（`test:it:all` など既存の束ね方）に組み込む。`provenance/` を持つ Intent が存在しない場合は失敗しない。 | R003, UC002 | accepted |
| BR009 | workspace の絶対 path は環境依存のため照合対象にせず、記録だけを行う。 | R002, D001（記録照合セマンティクスの採用） | accepted |

## 例外

| 条件 | 扱い | 根拠 |
|---|---|---|
| 対象 Intent が `provenance/` ディレクトリを持たない。 | `provenance:check` の検査対象から除外し、遡及して失敗させない。 | R002, Inception D002 |
| `provenance/` を持つ Intent が workspace に存在しない。 | `provenance:check` は失敗せず、`npm run test:all` は他の検査結果に従う。 | R003 |
| 記録された commit が git 履歴に存在しない。 | commit 不一致の drift として報告する。 | R002, D001 |
| 対象 Intent ディレクトリが存在しない状態で `provenance:generate` を実行する。 | スクリプトは失敗し、対象 Intent を指定するよう示す。 | R001, UC001 |
| 人間による次回 stage0 採用判断がまだ行われていない。 | `stage0Adoption.present` を `false`、`stage0Adoption.reference` を `null` として出力する（未判断であることを値で示す）。 | R001, UC001 |

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | 対象 Intent のディレクトリが存在する。 | R001, UC001 | accepted |
| PRE002 | 事前条件 | build workspace と target workspace で git コマンドとファイルハッシュ計算が実行できる。 | R001, R002 | accepted |
| POST001 | 事後条件 | `provenance:generate` の出力だけで policies.md の最低記録項目9項目を満たす。 | R001 | accepted |
| POST002 | 事後条件 | `provenance:check` の実行結果が、drift の有無を出力と終了コードで区別できる。 | R002, R003 | accepted |
| INV001 | 不変条件 | 人間は Provenance Record の値を手書きしない。 | R001 | accepted |
| INV002 | 不変条件 | `provenance/` を持たない既存 Intent は検査対象にならない。 | R002, Inception D002 | accepted |

## 未確認事項

- eval の置き場所と `test:all` chain 内の組み込み位置（`test:it:all` 内の順序）は Task Generation で確定する。

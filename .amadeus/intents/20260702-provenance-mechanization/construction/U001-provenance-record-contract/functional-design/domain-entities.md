# Domain Entities

## 目的

provenance 記録契約で扱う概念を Functional Design の Domain Model として整理する。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Provenance Record | `schemaVersion` と `generatedAt` を持ち、policies.md の最低記録項目9項目に1:1対応するフィールドを持つ、実行単位の実測結果を表す。 | DE002, DE003 |
| DE002 | Provenance Record File | Provenance Record を `provenance/Pnnn-<slug>.json` として永続化したファイルを表す。 | DE001, DE003 |
| DE003 | Drift | `provenance:check` が検出する、記録値と記録時点の再実測値との不一致（md5 不一致、commit 不一致、参照先欠落）を表す。 | DE002, DE004 |
| DE004 | Inspection Responsibility Boundary | validator（成果物構造の検証）、`provenance:check`（実測値の照合）、evaluator（意味と接続性の評価）の検査責務の境界を表す。 | DE003 |

## Provenance Record のフィールド構成

Provenance Record（DE001）は、トップレベルに `schemaVersion`（数値、初期値 1）と `generatedAt`（実測 UTC タイムスタンプ）を持つ。9 項目は、policies.md の「provenance の最低記録項目」と次のとおり1:1対応する。各フィールドの値が「実測」（git コマンドやファイルハッシュで機械的に取得する）か「入力」（呼び出し側が指定する）かを区別する。

| policies.md の項目 | フィールド | 実測 / 入力 |
|---|---|---|
| build workspace の path と commit | `buildWorkspace.path`、`buildWorkspace.commit` | path は実測（実行時の解決済み絶対 path）、commit は実測（`git rev-parse HEAD`） |
| target workspace の path と commit | `targetWorkspace.path`、`targetWorkspace.commit` | 同上 |
| host environment の識別情報 | `hostEnvironment.os`、`hostEnvironment.runtime`、`hostEnvironment.harness` | os と runtime（Bun バージョン）は実測、harness 名は入力 |
| target artifacts の対象範囲 | `targetArtifacts[]`（repo 相対 path または glob） | 入力 |
| 利用した昇格済み skill の path、commit、md5 | `skills[].path`、`.commit`、`.md5` | path は入力、commit と md5 は実測 |
| 利用した validator の path、commit、md5、実行結果 | `validator.path`、`.commit`、`.md5`、`.result` | path と result は入力、commit と md5 は実測 |
| 利用した開発用スクリプトの path、commit、md5 | `devScripts[].path`、`.commit`、`.md5` | path は入力、commit と md5 は実測 |
| stage 判定の根拠 | `stageJudgment` | 入力 |
| 人間による次回 stage0 採用判断の有無 | `stage0Adoption.present`（真偽値）、`stage0Adoption.reference`（参照先、無い場合 null） | 入力 |

md5 の対象はファイル単位とする（skill は昇格先の `SKILL.md`、validator は `AmadeusValidator.ts`、devScripts は対象スクリプトファイル）。`examples/skill-provenance.json` と同じ方式である（Inception D003: `examples/skill-provenance.json` との並立）。

## 関係

Provenance Record（DE001）は、`provenance:generate` の実測結果として生成され、Provenance Record File（DE002）として `provenance/` 配下に永続化される。

`provenance:check` は、Provenance Record File に記録された `commit` と `path` の組から `git show <commit>:<path>` で記録時点の内容を取り出して再計算し、記録値と照合する。この照合で一致しない場合を Drift（DE003）として検出する。

Inspection Responsibility Boundary（DE004）は、Drift の検出が `provenance:check` の責務であり、validator の成果物構造検証や evaluator の意味評価とは重複しないことを位置づける。この境界は Inception の decisions（D001: 検査責務境界の採用）で確定済みであり、Construction の Functional Design はこれを参照するだけで再定義しない。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | なし | 新しい Bounded Context やコンテキスト間依存は追加しない。 | Domain Map と Context Map は更新しない。 | U001 は BC001（自己開発運用）内の provenance 記録契約を扱うため。 |

## 未確認事項

なし。

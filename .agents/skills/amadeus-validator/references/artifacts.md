# artifacts validation

## 対象

全体成果物では、少なくとも次を対象にする。

- `.amadeus/README.md`
- `.amadeus/steering.md`
- `.amadeus/steering/objective.md`
- `.amadeus/steering/product.md`
- `.amadeus/steering/tech.md`
- `.amadeus/steering/structure.md`
- `.amadeus/steering/actors.md`
- `.amadeus/steering/external-systems.md`
- `.amadeus/steering/knowledge.md`
- `.amadeus/steering/knowledge/README.md`
- `.amadeus/steering/policies.md`
- `.amadeus/steering/policies/README.md`
- `.amadeus/intents.md`
- `.amadeus/domain-map.md`
- `.amadeus/context-map.md`

対象 Intent ディレクトリ名が指定された場合は、少なくとも次を対象にする。

- `.amadeus/intents/<intent-id>-<slug>.md`
- `.amadeus/intents/<intent-id>-<slug>/state.json`

`state.json` が要求する phase ディレクトリ配下の成果物は、lifecycle 契約（`docs/amadeus/lifecycle/state.md`）の必須成果物として `state.json.stages` と `state.json.bolts` から導出する。

旧契約（schemaVersion 1）の Intent 成果物（`inception/requirements.md`、`inception/acceptance.md`、phase 別 index 群ほか）の検証は #381 で退役した。

## 共通ルール

必須対象のファイルが存在しない場合は `fail` にする。
存在する場合だけ検証するファイルが存在しない場合は、不足として扱わない。

Markdown の相対リンクは、リンクを書いたファイルからの相対パスとして解決する。
対象ファイル内の相対リンクが存在しないファイルを指す場合は `fail` にする。
外部 URL、アンカーだけのリンク、メールアドレスは参照先ファイル存在検査の対象外にする。

表の必須列は、順序ではなく列名で確認する。
必須列が欠けている場合は `fail` にする。
空行、補足文、表以外の説明文は、必須見出しと必須表列を壊さない限り許容する。

`依存` 列を持つ一覧表では、`依存` は `なし` または同じ一覧表に存在する識別子だけを許可する。
複数の依存を書く場合は、カンマ区切りで書く。
依存の意味的な妥当性、循環、階層をまたぐ依存整合性は、この検証では扱わない。

## `.amadeus/intents.md`

必須見出しは次である。

- `一覧`
- `依存関係`

`一覧` の表は、次の列を持つ。

- `識別子`
- `概要`
- `依存`
- `詳細`

`識別子` は Intent ディレクトリ名として扱う。
`識別子` は `YYYYMMDD-<slug>` 形式にする。
`<slug>` は英小文字、数字、ハイフンだけで書く。
同じ表の中で `識別子` を重複させない。
`詳細` は `.amadeus/intents/<intent-id>-<slug>.md` を指す相対リンクにする。
`詳細` のディレクトリ名は同じ行の `識別子` と一致させる。

`依存関係` の表は、次の列を持つ。

- `インテント`
- `依存`
- `理由`

`インテント` は、`一覧` に存在する Intent ディレクトリ名または `なし` にする。
`依存` は `なし` または `一覧` に存在する Intent ディレクトリ名にする。
`理由` は空欄にしない。

`.amadeus/intents.md` は生成物であり、`scripts/IndexGenerate.ts` の導出内容と完全一致することを Index 生成整合として検証する。

## Domain Map と Context Map

Domain Map と Context Map の検証条件は、[Domain Map and Context Map validation](domain-map.md) に従う。

Domain Map は、Subdomain と Bounded Context の現在の索引である。
状態は `adopted` または `retired` にする。

Context Map は、Bounded Context 間の依存の現在の索引である。
Downstream Context、Upstream Context、Organization Pattern、Integration Pattern、状態、根拠を検証する。

## Intent 基本ファイル

`.amadeus/intents/<intent-id>-<slug>.md` の必須見出しは次である。

- `目標プロファイル`
- `目的`
- `成功条件`
- `範囲`

`目標プロファイル` には、`フィールド`、`値`、`説明` の列を持つ表を置く。

`目標プロファイル` の `フィールド` には、`goalType`、`scope`、`labels` を置く。

`goalType` の値は、`business`、`technical`、`mixed`、`未確認` のいずれかである。

`scope` の値は、`enterprise`、`feature`、`mvp`、`poc`、`bugfix`、`refactor`、`infra`、`security-patch`、`workshop`、`未確認` のいずれかである。

`labels` の値は空欄にしない。
未判断の場合は `未確認` と書く。

## `state.json`（schemaVersion 2）

`state.json.schemaVersion` は `2` である。
2 以外の値は fail にする。

schemaVersion 2 の検証条件は次である。

- `scope`、`depth`、`status`、`phase` が既知の値である。
- `intentId` が Intent ディレクトリ名と一致する。
- `stages` のキー集合が scope の実行対象と一致する。
- ステージ状態（`pending`、`active`、`awaiting_approval`、`revising`、`completed`、`skipped`）が既知の値である。
- completed のステージは approval evidence（`approvedAt`、`via`、`via: "pr"` の場合は `reference`）を持つ。
- 先行 phase の `phaseGates` が記録されている（approval evidence または `{"skipped": true}`）。
- `bolts` の状態が既知の値であり、completed の Bolt は PR の gate evidence を持つ。
- completed のステージと Bolt は、lifecycle 契約が定める必須成果物を持つ。

契約の定義元は `docs/amadeus/lifecycle/state.md` と `docs/amadeus/lifecycle/scopes.md` である。

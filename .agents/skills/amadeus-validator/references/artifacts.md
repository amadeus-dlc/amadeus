# artifacts validation

## 対象

`<space>` は `amadeus/active-space`（存在すればその中身、なければ `default`）で解決する。

全体成果物では、少なくとも次を対象にする。

- `aidlc`
- `amadeus/spaces`
- `amadeus/spaces/<space>`
- `amadeus/spaces/<space>/memory`
- `amadeus/spaces/<space>/memory/org.md`
- `amadeus/spaces/<space>/memory/team.md`
- `amadeus/spaces/<space>/memory/project.md`
- `amadeus/spaces/<space>/knowledge`
- `amadeus/spaces/<space>/intents`
- `amadeus/spaces/<space>/intents/intents.json`
- `amadeus/spaces/<space>/knowledge/domain-map.md`
- `amadeus/spaces/<space>/knowledge/context-map.md`

`amadeus/spaces/<space>/memory/phases`、`amadeus/spaces/<space>/memory/templates`、`amadeus/spaces/<space>/codekb`、`amadeus/spaces/<space>/intents/active-intent`、`amadeus/spaces/<space>/knowledge/event-storming` は、存在する場合だけ検証する任意の成果物である。
`amadeus/spaces/<space>/intents/intents.md` は GD009 で廃止された索引であり、存在する場合だけ検証する任意の成果物である。

対象 Intent ディレクトリ名（`<dirName>` = `<YYMMDD>-<label>`）が指定された場合は、少なくとも次を対象にする。

- `amadeus/spaces/<space>/intents/<dirName>/amadeus-state.md`
- `amadeus/spaces/<space>/intents/<dirName>/audit/audit.md`

`amadeus/spaces/<space>/intents/<dirName>.md`（Intent のモジュールファイル）は GD009 で廃止された成果物であり、存在する場合だけ検証する任意の成果物である。

`amadeus-state.md` の Stage Progress が要求する phase ディレクトリ配下の成果物は、lifecycle 契約（`docs/amadeus/lifecycle/state.md`）の必須成果物として、ステージごとの required artifacts から導出する。

旧契約（schemaVersion 1）の Intent 成果物（`inception/requirements.md`、`inception/acceptance.md`、phase 別 index 群ほか）の検証は #381 で退役した。
旧契約（`.amadeus/` と Intent 直下の `state.json` によるスキーマ管理）は #387 で退役した。
Intent 直下に `state.json`、`scope.md`、`ideation.md`、`requirements.md`、`acceptance.md`、`user-stories.md`、`use-cases.md`、`units.md`、`bolts.md`、`traceability.md`、`decisions.md`、`codebase-analysis.md`、`grillings.md` のいずれか、または `mocks/`、`requirements/`、`user-stories/`、`use-cases/`、`units/`、`bolts/`、`decisions/`、`domain/`、`grillings/` のいずれかが残っている場合は fail にする（成果物は phase ディレクトリ配下へ置く）。

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

## `intents.md`（任意、GD009 で廃止）

`intents.md` は GD009（Intent モジュールファイルと `intents.md` 索引の廃止）で廃止された索引であり、存在する場合だけ次の条件を検証する。
存在しない場合は不足として扱わない。
正準台帳は `intents.json` であり、人間向け一覧は必要時に `intents.json` から生成する。

必須見出しは次である。

- `一覧`
- `依存関係`

`一覧` の表は、次の列を持つ。

- `識別子`
- `概要`
- `依存`
- `詳細`

`識別子` は Intent ディレクトリ名として扱う。
`識別子` は `YYMMDD-<label>` 形式にする。
`<label>` は英小文字、数字、ハイフンだけで書く。
同じ表の中で `識別子` を重複させない。
`詳細` は `amadeus/spaces/<space>/intents/<dirName>.md` を指す相対リンクにする。
`詳細` のディレクトリ名は同じ行の `識別子` と一致させる。

`依存関係` の表は、次の列を持つ。

- `インテント`
- `依存`
- `理由`

`インテント` は、`一覧` に存在する Intent ディレクトリ名または `なし` にする。
`依存` は `なし` または `一覧` に存在する Intent ディレクトリ名にする。
`理由` は空欄にしない。

## `intents.json`

`intents.json` は Intent の正準台帳であり、次のフィールドを持つエントリの配列である。

- `uuid`：UUIDv7 形式にする。
- `dirName`：`<YYMMDD>-<label>` 形式にし、record ディレクトリ名と一致させる。
- `slug`：空欄にしない。
- `scope`：scope の許可値のいずれかにする。
- `status`：`in_progress`、`parked`、`completed`、`complete` のいずれかにする（`complete` は AI-DLC エンジンが書く上流語彙）。
- `repos`：配列にする。

record ディレクトリと `intents.json` のエントリは双方向に対応させる。
record ディレクトリがあり `intents.json` に対応するエントリがない場合、または `intents.json` にエントリがあり対応する record ディレクトリがない場合は、どちらも `fail` にする。

`intents/active-intent` は任意のカーソルファイルである。
存在する場合は、`intents.json` に登録された `dirName` のいずれかを指す。

## Domain Map と Context Map

Domain Map と Context Map の検証条件は、[Domain Map and Context Map validation](domain-map.md) に従う。

Domain Map は、Subdomain と Bounded Context の現在の索引である。
状態は `adopted` または `retired` にする。

Context Map は、Bounded Context 間の依存の現在の索引である。
Downstream Context、Upstream Context、Organization Pattern、Integration Pattern、状態、根拠を検証する。

## Intent 基本ファイル（任意、GD009 で廃止）

`amadeus/spaces/<space>/intents/<dirName>.md`（Intent のモジュールファイル）は GD009 で廃止された成果物であり、存在する場合だけ次の条件を検証する。
存在しない場合は不足として扱わない。
概要は `ideation/intent-capture/intent-statement.md` が代替する。

必須見出しは次である。

- `概要`
- `依存`
- `目標プロファイル`

`目標プロファイル` には、`フィールド`、`値`、`説明` の列を持つ表を置く。

`目標プロファイル` の `フィールド` には、`goalType`、`scope`、`labels` を置く。

`goalType` の値は、`business`、`technical`、`mixed`、`未確認` のいずれかである。

`scope` の値は、`enterprise`、`feature`、`mvp`、`poc`、`bugfix`、`refactor`、`infra`、`security-patch`、`workshop`、`未確認` のいずれかである。

`labels` の値は空欄にしない。
未判断の場合は `未確認` と書く。

Intent の目的、成功条件、契機、範囲の定義元は、scope が Stage 1.1 Intent Capture & Framing を実行する場合は `ideation/intent-capture/intent-statement.md`、実行しない場合は `inception/requirements-analysis/requirements.md` である。

## `amadeus-state.md` と `audit/audit.md`

`amadeus-state.md` は v2 state template の構造を持つ。

必須セクションは次である。

- `Project Information`
- `Scope Configuration`
- `Workspace State`
- `Execution Plan Summary`
- `Runtime State`
- `Phase Progress`
- `Stage Progress`
- `Current Status`
- `Session Resume Point`

検証条件は次である。

- `Scope`、`Depth`、`Project Type`、`Status`、`Lifecycle Phase` が既知の値である。
- `State Version` が `7` である。
- `Construction Autonomy Mode` が既知の値（`unset`、`autonomous`、`gated`）である。
- `Stage Progress` の stage slug がすべて既知であり、5 phase 32 ステージ全ての行がある。
- ステージの checkbox（`[ ]` Pending、`[-]` Active、`[?]` AwaitingApproval、`[R]` Revising、`[x]` Completed、`[S]` Skipped）が既知の語彙であり、scope 外のステージは `[S]` である。
- `Phase Progress` の値（`Pending`、`Active`、`Verified`、`Skipped`）が既知であり、先行 phase は `Verified` または `Skipped` である。
- `Current Stage` が scope の実行対象ステージである（`Status` が `Completed` の場合は不問）。
- `audit/audit.md` に `WORKFLOW_STARTED` イベントが記録されている。`Status` が `Completed` の record は `WORKFLOW_COMPLETED` イベントも持つ。
- `Completed`（`[x]`）のステージは `STAGE_COMPLETED` イベントを持つ。
- `Verified` の phase は `PHASE_VERIFIED` イベント、`Skipped` の phase は `PHASE_SKIPPED` イベントを持つ。
- Construction が `Verified` の場合、`Bolt Refs` に列挙された各 Bolt は `BOLT_COMPLETED` イベントを持つ。
- `Completed` のステージと Bolt は、lifecycle 契約が定める必須成果物を持つ。

契約の定義元は `docs/amadeus/lifecycle/state.md` と `docs/amadeus/lifecycle/scopes.md` である。

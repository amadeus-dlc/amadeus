# Application Design の確認事項 — 260723-archived-status-guard

Leader approval evidence: ユーザー承認 2026-07-23T07:15:54Z

## Q1. Transaction journal の配置

archive/unarchive の未完了処理を復旧する journal をどこに置きますか。

A. `amadeus/spaces/<space>/intents/.amadeus-intent-status-transaction.json` にspace単位で1件置く（推奨）
B. 対象intent record内に置く
C. workspace rootのmachine-local runtime領域に置く
D. audit shard自体をjournalとして兼用する
E. registry rowへtransaction状態を埋め込む
X. Other (please specify)

[Answer]: A — spaceの`intents/`配下に単一transaction journalを置く（2026-07-23T07:02:46Z、Mode: guided）

## Q2. Archived audit seal と lifecycle event

`archived` intentへの通常audit追記を封じつつ、archive/unarchive自身の監査イベントをどう通しますか。

A. `INTENT_ARCHIVED` / `INTENT_UNARCHIVED` だけをseal例外として明示する（推奨）
B. 必ずaudit eventを先に書いてからstatusを変更する
C. unarchiveだけstatus変更後にauditを書き、archiveは変更前に書く
D. lifecycle eventを別のworkspace auditへ書く
E. archived intentのaudit seal自体を導入しない
X. Other (please specify)

[Answer]: A — `INTENT_ARCHIVED` / `INTENT_UNARCHIVED`だけをseal例外にする（2026-07-23T07:04:07Z、Mode: guided）

## Q3. Archive / Unarchive のCLI境界

専用verbをどの公開CLIへ配置しますか。

A. `amadeus-state.ts archive <dirName>` / `unarchive <dirName>` とし、utilityから必要に応じて委譲する（推奨）
B. `amadeus-utility.ts intent archive|unarchive <selector>` だけに置く
C. orchestratorの`next archive|unarchive`として置く
D. stateとutilityの両方に独立実装する
E. 新しい専用toolを作る
X. Other (please specify)

[Answer]: A — `amadeus-state.ts`の専用verbを正本とし、utilityは必要時に委譲する（2026-07-23T07:06:13Z、Mode: guided）

## Q4. Archive時のrecord state

registry statusを`archived`へ変更するとき、対象recordの`amadeus-state.md`をどう扱いますか。

A. 変更せず、Current Stageとcheckpointをそのまま保存する（推奨）
B. StatusをArchivedへ変更する
C. StatusをParkedへ変更する
D. archive専用sectionだけを追加する
E. stateをarchive用スナップショットへ移動する
X. Other (please specify)

[Answer]: A — `amadeus-state.md`を変更せず、Current Stageとcheckpointを保存する（2026-07-23T07:06:52Z、Mode: guided）

## Q5. `IntentStatus` 型の所有場所

4値status型と実行時validatorをどこで所有しますか。

A. 既存registry helperのある`amadeus-lib.ts`でexportし、全consumerが共有する（推奨）
B. `amadeus-state.ts`で所有する
C. 新しいintent-lifecycle moduleを作る
D. 各toolが同じunionを個別定義する
E. JSON schemaファイルを正本にする
X. Other (please specify)

[Answer]: A — `amadeus-lib.ts`で型と実行時validatorをexportし、全consumerで共有する（2026-07-23T07:12:04Z、Mode: guided）

## Q6. 設計判断の最終確認

Q1〜Q5の決定内容で設計成果物を生成してよいですか。

A. Confirm — この内容で生成する
B. Request Changes — 回答を修正する
X. Other (please specify)

[Answer]: A — Confirm（2026-07-23T07:15:54Z、Mode: guided）

## Q7. 次回へ残す学び

Application Designの進め方について、次回のために追加したい学びはありますか。

A. No additions
X. Other (please specify)

[Answer]: A — No additions（2026-07-23T07:24:01Z、Mode: guided）

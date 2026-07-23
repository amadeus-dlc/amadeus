# 要件分析の確認事項 — 260723-archived-status-guard

Leader approval evidence: ユーザー承認 2026-07-23T06:45:28Z

## Q1. `archive` を許可する遷移元

`archive` verb は、どの status の intent に対して成功させますか。

A. `in-flight`、`parked`、`complete` のすべてから `archived` へ遷移可能（推奨）
B. `complete` からのみ遷移可能
C. `in-flight` と `complete` から遷移可能だが、`parked` は先に unpark が必要
D. `in-flight` からのみ遷移可能
E. status ごとに別の承認規則を設ける
X. Other (please specify)

[Answer]: A — `in-flight`、`parked`、`complete` のすべてから `archived` へ遷移可能（2026-07-23T06:37:27Z、Mode: guided）

## Q2. `unarchive` 後の status

`archived` intent を明示的に復帰させる場合、復帰先 status をどう決めますか。

A. 常に `in-flight` へ復帰する（推奨）
B. archive 直前の status を保存して復元する
C. 常に `complete` へ復帰し、再開には別操作を要求する
D. `unarchive` 実行時に復帰先を必須指定する
E. `in-flight` または `complete` のみ指定可能にする
X. Other (please specify)

[Answer]: A — 常に `in-flight` へ復帰する（2026-07-23T06:37:57Z、Mode: guided）

## Q3. active cursor が対象 intent を指している状態での archive

現在選択中の intent を archive したとき、active-intent cursor をどう扱いますか。

A. archive と同一原子的操作で cursor を解除し、未選択状態にする（推奨）
B. cursor は残すが、以後の `next` を loud 拒否する
C. 別の `in-flight` intent が一意なら自動選択し、なければ解除する
D. active intent の archive 自体を拒否し、先に別 intent の選択を要求する
E. archive は成功させ、次回起動時に cursor を修復する
X. Other (please specify)

[Answer]: A — archive と同一原子的操作で cursor を解除し、未選択状態にする（2026-07-23T06:38:49Z、Mode: guided）

## Q4. archived intent の選択拒否と明示 override

archived intent に対する cursor 選択要求では、どの操作契約にしますか。

A. 通常の選択は常に拒否し、先に human-presence 必須の `unarchive` を実行させる（推奨）
B. 選択コマンドに `--unarchive` を付けた場合のみ、同一操作で復帰・選択する
C. 選択コマンドに `--force` を付けた場合のみ許可する
D. 読み取り専用の選択は許可し、`next` のみ拒否する
E. 管理者設定で選択可否を切り替える
X. Other (please specify)

[Answer]: A — 通常の選択は常に拒否し、先に human-presence 必須の `unarchive` を実行する（2026-07-23T06:39:59Z、Mode: guided）

## Q5. falling proof と回帰テストの必須範囲（select all that apply）

完成条件として、どの拒否経路を独立に赤→緑で固定しますか。

A. archived intent への cursor 設定拒否
B. cursor が archived intent を指す既存状態での `next` 拒否
C. archived intent に対する `unpark` 拒否
D. human-presence のない `archive` / `unarchive` 拒否
E. `closed` およびその他の不正 status の registry 更新拒否
X. Other (please specify)

[Answer]: A, B, C, D, E — すべての拒否経路を独立に固定する（2026-07-23T06:45:00Z、Mode: guided）

## Q6. 回答内容の最終確認

上記 Q1〜Q5 の決定内容で要件成果物を生成してよいですか。

A. Confirm — この内容で生成する
B. Request Changes — 回答を修正する
X. Other (please specify)

[Answer]: A — Confirm（2026-07-23T06:45:28Z、Mode: guided）

## Q7. 次回へ残す学び

Requirements Analysis の進め方について、次回のために追加したい学びはありますか。

A. No additions
X. Other (please specify)

[Answer]: A — No additions（2026-07-23T06:52:45Z、Mode: guided）

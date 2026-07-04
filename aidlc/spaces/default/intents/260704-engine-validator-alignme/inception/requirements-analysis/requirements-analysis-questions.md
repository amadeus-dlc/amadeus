# Requirements Analysis — 確認事項

Intent: エンジンが書く値と validator の許可値の不整合を解消する（Issue #455 主、#446 包含）

Issue #455 と #446 に記載済みの観測と受け入れ条件は要件の前提として引き継ぐ。
ここでは Issue 側で未確定と明記された判断だけを確認する。

---

## Q1. registry status の正準をどちらに置くか

`intent-birth` は `intents.json` に `status: in-flight` を書くが、validator の許可値は `in_progress / parked / completed / complete` であり一致しない。
どちらを正準とするか。

A. `in-flight` を正準とする。validator の許可値に `in-flight` を追加し、手動補正済みの既存値（`in_progress` など）も後方互換として許容する。エンジンは変更しない。
B. `in_progress` を正準とする。`intent-birth` の書き込みを `in_progress` に修正し、validator は変更しない。既存 record に残る `in-flight` は許容値に残す。
C. 正準は決めない。validator が両表記を恒久的に許容する。
X. Other (please specify)

[Answer]: B

## Q2. `repos` フィールドと `Construction Autonomy Mode` の欠落をどちら側で解消するか

`intent-birth` は registry エントリに `repos` 配列を書かず、`aidlc-state.md` に `Construction Autonomy Mode` を書かないが、validator は両方を要求する。

A. エンジンが既定値を書く。`intent-birth` が `repos` を書き、state 初期化が `Construction Autonomy Mode: unset` を書く。validator は変更しない。
B. validator が未設定を許容する。エンジンは変更しない。
C. 両方を実施する。エンジンは今後の書き込みで既定値を書き、validator は既存 record のために未設定も許容する。
X. Other (please specify)

[Answer]: C

## Q3. phase イベント照合の修正方式

エンジンは per-clone shard に `**Phase**: ideation`（小文字）で記録するが、validator は `Ideation`（大文字始まり）を `body.includes(phase)` で照合する。
org.md は記録済み audit イベントの書き換えを禁止しているため、エンジン側の遡及修正はできない。

A. validator の照合を case-insensitive にする（Issue #446 の推奨案。既存 record の大文字表記も小文字表記も pass する）。
B. validator の許可リストに小文字表記を追加する（両表記の列挙で照合する）。
C. エンジンの今後の記録を大文字始まりに変更し、validator は case-insensitive にする。
X. Other (please specify)

[Answer]: A

## Q4. `amadeus-learnings.ts surface` の memory カウントずれを本 Intent の範囲に含めるか

canonical 見出し配下にエントリがある memory.md に対して `memory_entries_total: 0` を返すケースが 3 ステージで観測されている（record path の phase 解決が `spaces` になる）。
Issue #455 は「同じ突き合わせずれとしてまとめて調査してよい」としている。

A. 範囲に含める。調査と修正、対応するテストまで本 Intent で実施する。
B. 調査のみ本 Intent で実施し、修正は結果を見て別 Issue に切り出す。
C. 範囲外とする。別 Issue として扱い、本 Intent は #455 の 3 不整合に集中する。
X. Other (please specify)

[Answer]: A

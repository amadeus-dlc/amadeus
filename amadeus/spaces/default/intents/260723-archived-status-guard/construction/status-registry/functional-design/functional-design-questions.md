# Functional Design Questions — status-registry

Leader approval evidence: ユーザー承認 2026-07-23T08:11:33Z

## Q0. Interaction mode

Functional Designの質問へどの形式で回答しますか。

A. Guided — 1問ずつ回答する（推奨）
B. All-at-once — 全質問へまとめて回答する
X. Other (please specify)

[Answer]: A — Guided（2026-07-23T08:07:50Z）

## Q1. Legacy migration boundary

`closed`を読む例外経路をどこまで許可しますか。

A. migration専用raw decoderだけに限定し、通常runtimeは常にstrict 4値とする（推奨）
B. registry readerが`closed`を一時的に受理して`archived`へ正規化する
C. `closed`を恒久的な互換aliasとして残す
X. Other (please specify)

[Answer]: A — migration専用raw decoderだけに限定し、通常runtimeは常にstrict 4値とする（2026-07-23T08:08:32Z）

## Q2. Migration execution

対象1件のmigrationをどの実行面に置きますか。

A. versioned one-shot migrationから専用helperを呼び、成功後は通常runtimeをstrictに保つ（推奨）
B. repositoryのregistryデータを直接更新し、helperはtest専用にする
C. registry読取り時に毎回自動migrationする
X. Other (please specify)

[Answer]: A — versioned one-shot migrationから専用helperを呼び、成功後は通常runtimeをstrictに保つ（2026-07-23T08:09:55Z）

## Q3. Migration target API

migration helperの対象指定をどうしますか。

A. `260713-swarm-driver-migration`専用helperとして固定し、汎用status書換えAPIを作らない（推奨）
B. target dirNameを引数にする汎用`closed` migration helperを作る
C. 任意from/to statusを受け取る汎用migration APIを作る
X. Other (please specify)

[Answer]: A — `260713-swarm-driver-migration`専用helperとして固定し、汎用status書換えAPIを作らない（2026-07-23T08:11:02Z）

## Q4. Functional Design plan

次の設計境界で成果物を生成しますか。

- `IntentStatus`は4値のtype+companion parserとして表現する
- 通常registry read/writeはstrict parserを必ず通す
- migrationはversioned one-shotから対象専用raw decoder/helperを呼ぶ
- decision tableを全分岐検証し、失敗時は書込み前に停止する
- 移行後は全行をstrict registryへ昇格し、対象外row bytesを保持する
- frontend/UI成果物は生成しない

A. Approve Plan（推奨）
B. Revise Plan
X. Other (please specify)

[Answer]: A — Approve Plan（2026-07-23T08:11:33Z）

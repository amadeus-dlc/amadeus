# Functional Design Questions — text-mutation-loud-failure

> 上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。U2、FR-04／11／15、NFR-03／05／06／09 と SC-06 を対象にし、既存state document、atomic writer、公開CLI error boundaryを維持する。

## Interaction Mode

- A. Guide me（推奨）— 推奨案と根拠を示し、一問ずつ短く確認する
- B. Grill me — malformed／duplicate／not-found／idempotentの反例を一問ずつ深掘りする
- C. I'll edit the file — この質問ファイルをユーザーが直接編集する
- D. Chat — 自由に議論し、会話から決定事項を抽出する
- X. Other (please specify)

[Answer]: A — Guide me（2026-08-02T04:48:28Z、ユーザー回答「1」）

## Q1. Validated state boundary

setterが受け取るstate documentのpreconditionをどう表しますか。

- A. parse済みopaque `ValidatedStageState` だけを受け取る（推奨）— slugごとのcanonical lineがちょうど1件であることを先に証明し、malformed／duplicateはsetterへ入れない
- B. setterごとにraw stringを部分的に検査する
- C. `String.replace` のmatch件数だけを見る
- D. callerが正しいdocumentを渡す前提にする
- X. Other (please specify)

[Answer]: A — parse済みopaque `ValidatedStageState` だけを受け取る（2026-08-02T04:48:57Z、Guide me、ユーザー回答「1」）

## Q2. Idempotent target semantics

対象が既に期待値の場合、どのoutcomeにしますか。

- A. 同一bytesの `changed`（推奨）— targetは一意に存在しpostconditionも成立しているため成功。対象0件の `not-found` と分離する
- B. `not-found` と同じfailureにする
- C. 第3variant `unchanged` を追加する
- D. warning successとして曖昧に扱う
- X. Other (please specify)

[Answer]: A — 同一bytesの `changed`（2026-08-02T04:49:18Z、Guide me、ユーザー回答「1」）

## Q3. Caller failure boundary

全callsiteは `not-found`／validation failureをどこで停止させますか。

- A. write／audit／success JSONより前に既存typed CLI errorへ昇格（推奨）— retry／暗黙resyncは0回、入力state／audit bytesを不変にする
- B. stateを書いた後にwarningを返す
- C. 一度だけ暗黙resyncして再試行する
- D. success JSONを返しstderrだけ警告する
- X. Other (please specify)

[Answer]: A — write／audit／success JSONより前に既存typed CLI errorへ昇格（2026-08-02T04:49:45Z、Guide me、ユーザー回答「1」）

## Ambiguity Analysis

validation ownership、not-found、idempotent set、postcondition reparse、caller propagation、write-before-successを検査した。raw stateは一度だけ検証してopaque `ValidatedStageState` とし、setterは一意targetのpostconditionを再parseする。既に期待値なら同一bytesの `changed`、対象0件だけを `not-found` とする。全callerはfailureをwrite／audit／success JSONより前に昇格し、retry／暗黙resyncを行わない。不明点は残っていない。

## Functional Design Plan Approval

- A. Approve Plan（推奨）— `business-logic-model.md`、`business-rules.md`、`domain-entities.md` を生成する。UIはないため `frontend-components.md` は生成しない
- B. Revise Plan — 修正内容を指定する
- X. Other (please specify)

[Answer]: A — Approve Plan（2026-08-02T04:50:19Z、Guide me、ユーザー回答「1」）

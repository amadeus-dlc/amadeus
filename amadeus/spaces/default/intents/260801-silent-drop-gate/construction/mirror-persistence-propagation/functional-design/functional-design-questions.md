# Functional Design Questions — mirror-persistence-propagation

> 上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。U3、FR-03／04／10／15、NFR-03／05／06／09、SC-05 と Application Design の R3／R4 を対象にし、既存 public outcome と transactional outbox を維持する。

## Interaction Mode

- A. Guide me（推奨）— 推奨案と根拠を示し、一問ずつ短く確認する
- B. Grill me — commit境界、回復可能性、反例を一問ずつ深掘りする
- C. I'll edit the file — この質問ファイルをユーザーが直接編集する
- D. Chat — 自由に議論し、会話から決定事項を抽出する
- X. Other (please specify)

[Answer]: A — Guide me（2026-08-02T04:15:09Z、ユーザー回答「1」）

## Q1. Internal state result model

state mutation の内部結果をどの状態機械で表しますか。

- A. commit pointを判別する閉じた4状態（推奨）— `failed(pre-commit)`、`failed(durability-unknown)`、`ok(clean)`、`ok(outbox-pending)`。各transitionはcommit markerを一度だけ進め、文字列解析を使わない
- B. `ok | failed` の2状態だけにする
- C. throwだけで表し、callerがmessageを解析する
- D. rollback済み／retry中を含む新しい全域状態機械に拡張する
- X. Other (please specify)

[Answer]: A — commit pointを判別する閉じた4状態（2026-08-02T04:15:55Z、Guide me、ユーザー回答「1」）

## Q2. Public outcome mapping

`persistBlocked` は内部結果を既存 `MirrorOperationOutcome` へどう写像しますか。

- A. 既存warning fieldへ回復可能性別に写像（推奨）— pre-commit=`stateFailure`＋`effect=not-started`、durability unknown=`stateFailure`＋`effect=outcome-unknown`、clean／outbox-pendingはbusiness state committedとして扱い、pendingは既存drainへ渡す
- B. 全failureを同じ`stateFailure` messageへ畳む
- C. 新しいpublic outcome variantを追加する
- D. warning successへ統一する
- X. Other (please specify)

[Answer]: A — 既存warning fieldへ回復可能性別に写像（2026-08-02T04:17:01Z、Guide me、ユーザー回答「1」）

## Q3. Post-commit convergence

audit append／outbox clear failure後の収束契約をどう固定しますか。

- A. operation identity付きtransactional outboxの既存冪等drain（推奨）— state commit後はrollback／同期retryせず、audit append済み判定で重複を防ぎ、stale outboxを最終clearへ収束させる
- B. caller内で即時retryを繰り返す
- C. stateをrollbackして再実行する
- D. audit欠落をwarningだけで許容しoutboxを破棄する
- X. Other (please specify)

[Answer]: A — operation identity付きtransactional outboxの既存冪等drain（2026-08-02T04:17:34Z、Guide me、ユーザー回答「1」）

## Ambiguity Analysis

commit point、public outcome、retry／rollback禁止、bytes invariance、outbox convergenceを検査した。4状態の内部結果から既存public outcomeへの写像は全域であり、commit前とdurability不明を区別できる。commit後はstateをrollback／同期retryせず、operation identity付きtransactional outboxの既存冪等drainへ一本化するため、二重適用との矛盾はない。mirror bytesは成功時に既存canonical stateと一致させ、失敗時に部分更新を公開しない。不明点は残っていない。

## Functional Design Plan Approval

- A. Approve Plan（推奨）— `business-logic-model.md`、`business-rules.md`、`domain-entities.md` を生成する。UIはないため `frontend-components.md` は生成しない
- B. Revise Plan — 修正内容を指定する
- X. Other (please specify)

[Answer]: A — Approve Plan（2026-08-02T04:17:59Z、Guide me、ユーザー回答「1」）

## Revision Cycle 2 — Q4. Prior outbox maintenance boundary

既存outboxがある場合、FR-10の呼出開始時bytes不変と新規transitionをどう両立しますか。

- A. maintenance-only invocationとして分離する（推奨）— 既存outboxを処理した呼出では新規transitionを評価せず、既存typed failureの `not-started`／再実行可能を返す
- B. prior outbox maintenanceの副作用をFR-10 bytes不変の例外として要件承認する
- C. 公開 `MirrorOperationOutcome` にmaintenance専用variantを追加する

[Answer]: A — maintenance-only invocationとして分離する（2026-08-02T06:14:52Z、Revision Cycle 2、ユーザー回答「1」）

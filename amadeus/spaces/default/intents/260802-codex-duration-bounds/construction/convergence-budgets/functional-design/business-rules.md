# Business Rules — convergence-budgets

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## 適用根拠

`unit-of-work`／`unit-of-work-story-map` の #1998 境界、`requirements` FR-02／FR-03／FR-04A、`components` C2／C3、`component-methods` のbudget／retry contract、`services` のrecoverable failureを業務規則化する。

## Budget 不変条件

- BR-CB-01: reserve可能条件は常に`current < cap`である。
- BR-CB-02: counterはatomic reserve時に1増え、開始後の成功／失敗で戻さない。
- BR-CB-03: cap回目は実行可能で、cap到達後の新規開始を拒否する。counterはcapを超えない。
- BR-CB-04: audit noise、retry、compact、resume、別session、別workerで同じsubjectのcounterをresetしない。
- BR-CB-05: 同じidempotency keyの再送は既存receiptを返し、二重消費しない。
- BR-CB-06: capは正の整数かつversioned hard cap以下でなければならない。具体値はNFR Requirementsで決める。
- BR-CB-06A: 初回reserveでeffective cap、config version、config digestを耐久化し、同じBudgetSubjectの存続中は変更しない。
- BR-CB-06B: 後続requestのpolicyが保存済みsnapshotと異なる場合は`budget-policy-mismatch`で拒否し、保存済みcapへ暗黙変換しない。

## Retry 分類規則

- BR-CB-07: retry可否は共有coreのversioned allowlistだけが決定する。
- BR-CB-08: adapterは4 factを正規化するだけで、unknownをretryableへ昇格しない。
- BR-CB-09: `effectStatus=no-effect-confirmed`でない失敗は自動retryしない。
- BR-CB-10: auth、permission、config、validation、canonical audit／state writeは自動retryしない。
- BR-CB-11: 初期allowlistは既決のcause／surface組だけを許可し、追加は独立したreview対象にする。
- BR-CB-12: retry開始ごとに同じoperationの新attemptを消費し、attempt開始前拒否では消費しない。
- BR-CB-12A: v1 allowlistはbusiness-logic-modelの4行だけで、4 field完全一致以外をretryableにしない。
- BR-CB-12B: unknown allowlist versionはfail-closedで、新attemptを開始しない。
- BR-CB-12C: retryableは4行のstable rule IDとversion 1を必須とする。非許可は`{kind:"non-retryable", reasonCode:"retry-not-allowlisted"}`、unknown policy/effectは`{kind:"unsafe-unknown", reasonCode}`として返す。

## 停止と表示の規則

- BR-CB-13: exhausted時は新しいnative処理を開始しない。
- BR-CB-14: `TerminationReasonV1`はreason、`budget: Fact<{consumed,cap}>`、last durable progress、recommended next action、root operation IDを必須とする。
- BR-CB-15: recoverable retryは無言で行わず、attemptとremainingを表示する。
- BR-CB-16: state不整合またはcanonical write失敗はfail-closedで停止する。
- BR-CB-17: 共有termination unionから全harness表示を作り、Codex専用停止gateを設けない。
- BR-CB-17A: termination reasonはversioned closed unionとし、未知codeはraw値を保持して`unknown-termination-reason`へ落とし、新規実行を止める。

## Dispatch Claim 規則

- BR-CB-21: reservation commitとnative dispatchの間に`claimDispatch`を必須とする。
- BR-CB-22: 最初のclaimだけがnative dispatch権を得て、同じclaim replayは再dispatchしない。
- BR-CB-23: `claimed`後のcrashではnative effectを確認し、no-effect-confirmedだけを新retry候補とする。
- BR-CB-24: effect possible／unknownまたは照会不能は`dispatch-effect-unknown`で安全停止する。
- BR-CB-25: reservation commit済みattemptはnative未開始でも消費済みであり、counterを巻き戻さない。
- BR-CB-26: claimはdispatch所有権だけをcommitし、native受付／開始Factは`confirmDispatch`だけがcommitする。claim前にrequired projection receipt由来の`StartPermit`を必須とする。
- BR-CB-27: canonical write失敗は同じcanonical journalへ記録せず、`persisted:false`のtyped refusalとして返す。

## Revision 1 Reconciliation

BR-CB-12C/14/26/27でretry、termination、dispatch、write failureの公開境界をApplication Designと統一した。

## Scope 制約

- BR-CB-18: 自動retryはStop／continuation評価、swarm Unit dispatch、worker起動、結果収集の既存経路だけに適用する。
- BR-CB-19: approval／gate、GitHub mutation、release／publish、任意toolへretry範囲を拡張しない。
- BR-CB-20: `interaction-budgets`と`bounded-unit-pool`はC2／C3のreserveを再利用し、独自counter ownerを持たない。

## 検証規則

cap-1、cap、cap+1要求、idempotent replay、audit noise、resume、allowlist／non-allowlist、unknown effectを決定表testで固定する。control／treatmentは #1602と同じworkloadとID相関を使う。

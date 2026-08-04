# Functional Design Questions — loop-monitor-runtime

- **Mode:** Guide me
- **Depth:** Standard
- **Question budget:** 最大2問（主質問1問とmaterial follow-up最大1問）
- **Question policy:** #2095、requirements、application designで確定済みの内容は問い直さず、外部effectのexactly-once境界だけを確認する。

## Q1. Judge providerの外部effect保証境界

#2095はJudge開始／完了境界のcrash後も「二重実行・二重Eventが起きない」ことを要求するが、providerへrequestが届いた後、receipt保存前にprocessが落ちた場合の外部effect保証までは定めていない。Amadeus CoreとJudge providerの責任境界をどこに置くか。

- A. Amadeusはcanonical invocation / Eventのexactly-onceを保証し、stable invocation IDでproviderを呼ぶ。再開時は保存済みresultを再利用し、未確定effectはprovider照会で`no-effect-confirmed`の場合だけ再送する。`effect-possible / unknown`はparkし、人間または新evidenceを待つ（推奨）: provider非依存かつfail-closedで、物理的exactly-onceを根拠なく主張しない。
- B. providerにstable idempotency keyによる物理的exactly-onceを必須化し、capabilityを持たないproviderはcompile / preflightで拒否する: 強い保証だが、#2095のgeneric Judge SPIを特定provider能力へ狭める。
- C. providerはat-least-onceで呼び得るものとし、Amadeus内のEvent重複だけを抑止する: 実装は単純だが、外部LLM / tool effectの二重実行を許し、#2095の受け入れ文言と利用者期待がずれる。
- X. その他（具体的に指定）

[Answer]: A — Amadeusはcanonical invocation / Eventのexactly-onceを保証する。stable invocation IDでproviderを呼び、保存済みresultは再利用する。未確定effectはprovider照会で`no-effect-confirmed`の場合だけ再送し、`effect-possible / unknown`はparkして人間または新evidenceを待つ。providerの物理的exactly-onceはAmadeus Coreの保証として主張しない。（2026-08-03T11:53:06Z）

## 合意確認

回答は曖昧性・相互矛盾・#2095とのscope mismatchがなく、2026-08-03T11:53:49Zにleaderが`Yes, confirmed`で承認した。

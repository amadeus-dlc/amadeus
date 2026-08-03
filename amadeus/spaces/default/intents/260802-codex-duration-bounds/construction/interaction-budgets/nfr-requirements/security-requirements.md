# Security Requirements — interaction-budgets

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Content Safety と Authorization

`requirements.md` NFR-03、`business-logic-model.md` のsemantic identity、`business-rules.md` BR-IB-07〜15A、`technology-stack.md` の既存redactionを適用する。

- prompt／回答本文をsemantic key、idempotency key、telemetryへ保存しない。catalog ID、ambiguity kind、artifact digestだけを使う。
- answer fingerprintはHMAC-SHA-256を使う。C2がper-intent random 256-bit keyを所有し、domain `amadeus.interaction.answer.v1`、intent UUID、interaction instance ID、canonical answer bytesを入力にする。比較範囲は同じinteraction instance内だけとし、生回答やunkeyed digestをtelemetryへ複製しない。
- adapter／renderer／reviewerはcap、counter、instance IDをmint・上書きしない。
- approval／gate権限は変更せず、budget exhaustionを自動approvalへ変換しない。
- review effect unknownかつdedupe不能なら再dispatchせず`unavailable`へ終端する。
- question表示の重複は同じdeliveryKeyへ集約し、新しい質問やcounter消費へ偽装しない。

## Threat Verification

| Threat | Blocking check |
|---|---|
| secretを含む回答の漏えい | audit／runtime／OTel／summaryでsentinel 0 hit |
| session/message ID変更によるcap回避 | resume／compact／harness message変更後も同じinstance |
| reviewer重複dispatch | claim crashでidempotent keyまたはunavailable、二重実行0 |
| configによるhard cap超過 | mutation前拒否、counter増分0 |
| Codex専用gate追加 | shared termination＋native renderer conformanceで専用semantics 0 |

### HMAC key lifecycle

- keyはC2がintent初回interaction時に生成し、gitignored machine-local runtimeの `amadeus/.amadeus-sessions/interaction-hmac/<intentUuid>.key` へmode `0600`、atomic createで保存する。
- active intent中はrotationせず、resume／compactで同じkeyを再利用する。intent terminal後または明示rekey時だけ新keyを作り、rekeyは新stage revisionを要求する。
- key欠落／読取不能時は既存fingerprintを一致扱いせず`unavailable`で安全停止し、人間再確認へ渡す。
- testは同一回答のidempotency、異回答conflict、raw sentinel 0 hit、同じ回答でも別intent／別interactionでtag不一致を検証する。

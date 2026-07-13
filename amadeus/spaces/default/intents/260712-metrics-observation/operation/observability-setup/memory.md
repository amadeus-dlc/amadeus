# Observability Setup Memory

## Interpretations

- 2026-07-12T14:31:00Z — observability対象をGitHub Actions job statusとrepository snapshotに限定した; runtime/cloud不存在の人間確認に基づく。

## Deviations

- 2026-07-12T14:31:00Z — CloudWatch/SNS/X-Ray/SLO設定をN/Aとした; 架空resourceとverification theaterを避けるため。

## Tradeoffs

- 2026-07-12T14:31:00Z — execution timeoutをservice SLOと呼ばず分離した; 異なる契約を混同しないため。

## Open questions

- 2026-07-12T14:31:00Z — landing後main実run、bot author、queue挙動を観測する。

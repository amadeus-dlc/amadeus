# Memory — u1-runner-relocation nfr-design

## Interpretations
- 2026-07-31T20:39:28Z — reviewer Critical(consumes 契約破綻疑い)は engine directive の実測で却下: 5件は consumes_absent expected:true(scope による設計上の不在)で、fallback は requirements.md の NFR 節。センサーは実在 consumes のみ照合(amadeus-sensor.ts:210-213)— 偽陽性でない。fallback 根拠を questions へ明文化(upstream-coverage-conditional-consumes の同族知識)

## Deviations
- 2026-07-31T20:39:28Z — Major(NFR-2/5 の非明示)を是正: NFR-2 ラベルを2箇所へ、NFR 全数表(NFR-5 の意図的 N/A 宣言含む)を logical-components へ追加。reviewer のスコープ外読取(state/scope/audit/sensor 実装)も記録 — 発見の実質は正当だが check-read 未経由

## Tradeoffs

## Open questions

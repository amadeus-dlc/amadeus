# Application Design Memory

## Interpretations

- 2026-08-10T14:02:00Z — user-visible contractはRequirementsの限定改訂と既存halt protocolで確定済みのため、新規明確化質問は0件とした。
- 2026-08-10T14:02:00Z — parallelismはpure projection Unitとpure fan-out Unitを先行並行し、共有`amadeus-orchestrate.ts`配線を後続Unitへ隔離して実現する。
- 2026-08-10T14:08:00Z — §12a Iteration 1 BLOCKERにより、projection failureを判別union、裁定をUnitKey付きtransition union、監査joinを必須keyとcanonical seqの明文契約へ具体化した。

## Deviations

- 2026-08-10T14:02:00Z — AWS/UI面は新規service/resource/interfaceがないためN/Aとし、不要な成果物拡張を行わない。

## Tradeoffs

- 2026-08-10T14:02:00Z — 単一利用でもpure moduleを分け、並行PR ownershipとテストseamを得る代わりにfile数を2増やす。

## Open questions

- 2026-08-10T14:02:00Z — 既存event fieldだけでattempt/batch相関が完全かはFunctional Designで全writer schemaを照合する。

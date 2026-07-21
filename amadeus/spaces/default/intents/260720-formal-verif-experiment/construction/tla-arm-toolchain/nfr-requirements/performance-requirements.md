# Performance Requirements — tla-arm-toolchain

## 上流境界

`business-logic-model.md` のverified acquisition / finite TLC run、`business-rules.md` のfixed descriptor / profile、`requirements.md` の120秒完全探索、`technology-stack.md` のBun / TypeScriptを前提とする。matrix schedulingとsuite medianはU7が所有する。

## Acquisition budgets

artifact streamは128 MiB hard cap、HTTPS connect 10秒、response headers 30秒、全body 120秒をdeadlineとする。redirectは最大3回かつclosed origin allowlist内だけ許す。deadline / cap超過時はdownloadを停止し、partial hash / length / redirect chainをfailure receiptへ保存してcache publishしない。

temporary fileへsingle-pass stream write + SHA-256を行い、完了後のverification readを1回だけ行う。in-memory bufferは1 MiB以下とし、jar全量をheapへ載せない。

descriptor identityごとにdownload staging slotは1つだけ許し、開始前に128 MiB + metadata 1 MiB + safety reserve 1 GiBのfree spaceをexclusive acquisition lock下で検証する。quarantineはfailed bytes最大1件 / 128 MiBとfailure receiptだけを持ち、次attempt前にhash / length receiptをdurable化してbytesを削除する。

## TLC run budgets

- 1 runはsuite残時間と120秒の小さい方をdeadlineとし、workers=1、`-Xms256m -Xmx1024m`を固定する。
- timeout時はprocess group terminate後5秒、未終了ならkill後5秒まで待ち、partial stdout / stderr、signal、state statsをHARNESS_ERROR evidenceへ渡す。
- stdout / stderrはU3の各16 MiB capを継承し、超過時はprocessを停止してNOT_DETECTED / DETECTEDを生成しない。
- completion判定はexit 0だけでなくqueue=0、EXHAUSTED、generated / distinct states、search depth、warning 0を全て要求する。

## Acceptance

testsはacquisition cap / timeout / redirect、staging競合、free-space reserve -1 / exact / +1、repeated checksum failure、TLC deadline-1 / exact / +1、terminate / kill、heap / workers drift、output cap、queue nonzeroを固定する。合否はrun中network capability 0、workers 1、deadline延長0、partial explorationのNOT_DETECTED 0である。wall-clockはraw保存し、machine間の速度SLAには使わない。

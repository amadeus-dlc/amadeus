# Performance Requirements — execution-evidence

## 上流境界

`business-logic-model.md` のserial cell execution / atomic publish、`business-rules.md` のsuite deadline / closed payload、`requirements.md` のFR-4/FR-5、`technology-stack.md` のBun / TypeScriptを前提とする。arm oracle、benchmark scheduling、eligibilityは本Unitの性能責務に含めない。

## Time budgets

- suite全体を120秒に固定し、各cellへ渡すdeadlineはsuite残時間以下とする。cellごとの120秒resetは0件とする。
- `timing.json`はprocess start / exitから算出する`processDurationMs`と、cell startから5 payload・両ledgerのatomic publish完了までの`cellElapsedThroughPublishMs`を別field / monotonic clock receiptで保持する。suite durationは最初のcell startから最終publishまたはtimeout確定までとし、3値を相互代用しない。
- D-COUNT=7は1 full experiment最大96 cells、D-COUNT=5は最大72 cellsである。arm内 / suite内はserial、同じstore rootのpublish writerは1とする。
- timeout後に未起動cellをspawnせず、missing keyをtyped findingとして記録する。

## I/O and resource bounds

1 cell bundleはindex envelope + `result.json / command.json / stdout.bin / stderr.bin / timing.json`のexactly 5 payloadに閉じる。上限はJSON 3種を各1 MiB、stdout / stderrを各16 MiB、index envelopeを64 KiB、bundle合計を35 MiB + 64 KiBとする。各payloadは1回stream writeしながらSHA-256とbyte lengthを計算し、hash用の全量二重copyを作らない。

stream上限超過時はprocessをterminateし、上限までに読んだbytesのhash / length、discarded-byte-count unknown marker、command / process identityを`OUTPUT_LIMIT_EXCEEDED` partial raw receiptへ保存する。partial receiptはsuccess bundleやDETECTED / NOT_DETECTEDにならずtyped `HARNESS_ERROR`入力へ渡す。

in-memory retained dataはcurrent cell payload chunks、closed manifest、expected ledger headsに限定する。full matrix全bundleをheapへ保持せずidentity indexを使う。writer lock待ちはsuite deadlineを消費し、deadline超過時はspawn / publishを追加しない。

## Acceptance measurements

fixturesは72 / 96 cell key set、各payload上限-1 / 上限 / 上限+1 byte、0 / 1 / 5 payload corruption、lock競合、deadline直前を含める。合否はspawn数がexpected started keysと一致、publish transaction数がstarted cells以下、payload role数=5、上限超過success 0、partial raw hash / length欠損0、per-cell deadline reset 0、shell invocation 0、orphan success 0とする。wall-clock raw値は保存するが異machine間SLAには使わない。

# #1667 Code Generationサマリー

## 結論

`book-pack-verify`の間欠timeoutは、次の2条件が重なった偽赤だった。

1. 子processへ180秒を許可しているのに、外側のBun testが120秒で先に終了するtimeout budgetの矛盾
2. filesystemコピー、pack適用、全checkを行うresource-intensive testが、coverage時のparallel integration帯へ分類されていたこと

`rm: fts_read failed`は、verifier自身が共有一時directoryを削除した証拠ではない。`verify-dummy.sh`は呼び出しごとに`mktemp -d ...XXXXXX`で固有directoryを確保し、同じprocessの`EXIT` trapだけがそのdirectoryを削除する。外側testが子processより先に終了し得る旧budgetでは、削除中のprocess terminationがcleanup noiseとして現れ得た。

## 実装

- test fileを`book-pack-verify.serial.test.ts`へ変更し、既存runnerの`.serial.`契約でcoverage時もparallel integration帯から分離した。
- `VERIFIER_TIMEOUT_MS = 180_000`、`CLEANUP_RESERVE_MS = 30_000`、`TEST_TIMEOUT_MS = 210_000`を同じ場所へ定義した。
- 外側budgetが子process上限とcleanup reserveの合計以上であることを回帰testで固定した。
- 10msの制御timeoutを注入し、`status=null`、`signal=SIGTERM`、`error.code=ETIMEDOUT`を決定的に確認した。
- 実verifierの失敗時だけ、status、signal、error、duration、stdout、stderrを出力するようにした。成功時ログは増やしていない。
- verifier scriptと製品コードは変更していない。共有temp資産や二重cleanupの証拠がなく、仮説だけでcleanup実装を変更しないためである。

## Red → Green

### Red

修正前定数を固定したbudget回帰testは、`180000 + 30000 <= 120000`を満たさず失敗した。これにより、子processのdeadlineより外側testが60秒早く終了し、cleanup用の余裕もないことをwall-clock反復なしで再現した。

### Green

- 対象test: 3 PASS / 0 FAIL / 6 expects
- 制御timeout: `SIGTERM`かつ`ETIMEDOUT`を確認
- 対象runner（非coverage、parallel=4指定）: serial帯で実行され3 PASS / 0 FAIL
- `bun run typecheck`: PASS
- `bun run lint`: PASS（既存baselineのwarningのみ）
- `git diff --check`: PASS
- `bun run test:ci`: 652 files、8,994 assertions中、#1667対象はPASS。全体結果は1件FAILで、旧baseの[#1336](https://github.com/amadeus-dlc/amadeus/issues/1336)安全待機ケースだけが失敗した。#1667変更面とは独立し、#1336 Boltでは対象suite 76 PASS / 0 FAILへ修正済み。
- `bun run coverage:ci`: coverage reportを正常生成し、#1667対象はserial帯で3 PASS / 0 FAIL、#1664のsymlink clone-id対象もPASS。全体結果は652 files、8,994 assertions中、旧baseの#1336安全待機ケース1件だけがFAIL。

coverageを対象fileだけにfilterしたrunnerでは、子processだけを検証するfileからLCOV partが生成されないため、対象test自体は3 PASSだがcoverage集約が「no LCOV reports」で非0になった。この結果を対象test失敗とは扱っていない。全fileを含む`coverage:ci`ではLCOV生成と対象testのGreenを確認した。

## 追跡

- close対象: [#1667](https://github.com/amadeus-dlc/amadeus/issues/1667)
- 変更提案には他Issueの修正を含めない。

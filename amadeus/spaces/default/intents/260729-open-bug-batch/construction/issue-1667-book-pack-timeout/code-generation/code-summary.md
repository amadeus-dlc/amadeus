# #1667 Code Generationサマリー

## 結論

`book-pack-verify`には、子processへ180秒を許可しているのに外側のBun testが120秒で先に終了する、決定的なtimeout budgetの矛盾があった。

CIではcoverage並列実行時に127.55秒で失敗し、単独再実行は65.14秒で成功した。この差はresource contentionが再現条件を増幅した証拠だが、単独の直接原因としては断定しない。修正は、確定したbudget矛盾を除去したうえで、filesystemコピー、pack適用、全checkを行うresource-intensive testを既存runnerのserial帯へ分類する。

`rm: fts_read failed`は、verifier自身が共有一時directoryを削除した証拠ではない。`verify-dummy.sh`は呼び出しごとに`mktemp -d ...XXXXXX`で固有directoryを確保し、同じprocessの`EXIT` trapだけがそのdirectoryを削除する。実verifierの終了後に出力されたworkspace pathが存在しないことも回帰testで確認した。旧外側timeoutによるprocess terminationがcleanup noiseを発生させた可能性はあるが、直接原因とは断定しない。

## 実装

- test fileを`book-pack-verify.serial.test.ts`へ変更し、既存runnerの`.serial.`契約でcoverage時もparallel integration帯から分離した。
- `VERIFIER_TIMEOUT_MS = 180_000`、`CLEANUP_RESERVE_MS = 30_000`、`TEST_TIMEOUT_MS = 210_000`を同じ場所へ定義した。
- 純粋なbudget判定へ旧値`180000 / 30000 / 120000`と新値`180000 / 30000 / 210000`を同時入力し、旧値を不整合、新値を整合と固定した。
- 制御lifecycleで`child-start → child-complete → cleanup-start → cleanup-complete`を同一のms単位で観測し、子deadlineと外側deadlineの内側でcleanupまで完了することを確認した。
- 10msの制御timeoutを注入し、`status=null`、`signal=SIGTERM`、`error.code=ETIMEDOUT`を決定的に確認した。
- 実verifierの失敗時だけ、status、signal、error、duration、stdout、stderrを出力するようにした。成功時ログは増やしていない。
- 実verifierが出力した一時workspace pathがprocess終了後に消えていることを確認した。
- verifier scriptと製品コードは変更していない。共有temp資産や二重cleanupの証拠がなく、仮説だけでcleanup実装を変更しないためである。

## Red → Green

### Red

同じ純粋判定で、旧組合せ`180000 + 30000 <= 120000`は`false`、新組合せ`180000 + 30000 <= 210000`は`true`となる。これにより、子processのdeadlineより外側testが60秒早く終了し、cleanup用の余裕もない旧Redをwall-clock反復なしで固定した。

### Green

- 対象test: 4 PASS / 0 FAIL / 14 expects
- 制御lifecycle: child処理とcleanup完了を同一clockで観測し、outer budget内の完了を確認
- 制御timeout: `SIGTERM`かつ`ETIMEDOUT`を確認
- 実verifier cleanup: 出力された一時workspaceがprocess終了後に不存在
- 対象runner（非coverage、parallel=4指定）: serial帯で実行され4 PASS / 0 FAIL
- `bun run typecheck`: PASS
- `bun run lint`: PASS（既存baselineのwarningのみ）
- `git diff --check`: PASS
- `bun run test:ci`: 652 files、8,994 assertions中、#1667対象はPASS。全体結果は1件FAILで、旧baseの[#1336](https://github.com/amadeus-dlc/amadeus/issues/1336)安全待機ケースだけが失敗した。#1667変更面とは独立し、#1336 Boltでは対象suite 76 PASS / 0 FAILへ修正済み。
- `bun run coverage:ci`: coverage reportを正常生成し、#1667対象はserial帯で3 PASS / 0 FAIL、#1664のsymlink clone-id対象もPASS。全体結果は652 files、8,994 assertions中、旧baseの#1336安全待機ケース1件だけがFAIL。

coverageを対象fileだけにfilterしたrunnerでは、子processだけを検証するfileからLCOV partが生成されないため、対象test自体は3 PASSだがcoverage集約が「no LCOV reports」で非0になった。この結果を対象test失敗とは扱っていない。全fileを含む`coverage:ci`ではLCOV生成と対象testのGreenを確認した。

## 追跡

- close対象: [#1667](https://github.com/amadeus-dlc/amadeus/issues/1667)
- 変更提案には他Issueの修正を含めない。

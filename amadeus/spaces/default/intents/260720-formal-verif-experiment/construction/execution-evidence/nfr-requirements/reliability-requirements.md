# Reliability Requirements — execution-evidence

## Reliability model

`business-logic-model.md` のrunner/store ledger transaction、`business-rules.md` のatomic publish / retry / matrix validation、`requirements.md` のNFR-1/NFR-2、`technology-stack.md` のfilesystem / Bun境界を前提とする。availability SLAではなく、cell evidenceのexactly-once logical publishと再読検証を保証する。

## Commit and recovery

- store-root single-writer lock取得後にexpected runner/store headsを再確認する。
- bundle、runner entry、store entryをsame-filesystem transaction directoryへstagingし、全fileをflushしてstaging directoryをsyncする。全hash検証後、nonexistent successor slotへexclusive atomic renameし、store parent directory sync成功後だけdurable successをacknowledgeする。
- atomic renameをlogical visibility pointとする。rename前のcrashは旧headsだけ、rename後のcrashはnew directoryが存在すれば全hash / chain検証後にvalid候補とする。directory sync前はack未発行であり、再送時はtransaction lookupへ収束する。ack済みtransactionはparent sync完了済みである。
- startup recoveryはstaging orphanを成功ledgerへ採用せず、successor slotのcomplete transactionだけをchainへ接続する。partial files、unknown role、head mismatchはtyped findingにする。

## Failure preservation

timeout、spawn、exit、decode、store I/O、head conflict、lock、corruptionを別discriminatorで保持する。`HARNESS_ERROR`はexpected cell evidenceとして保存できるが、missingやstore failureを`HARNESS_ERROR`へ丸めない。

response喪失時のblind retry、別transactionでの同一cell publish、runner/store片側append、failureからのDETECTED / NOT_DETECTED生成を禁止する。

## Tests and observability

crash injectionはstaging各payload後、各file flush前後、staging directory sync前後、rename直前 / 直後、parent directory sync前後、ack直前で行う。合否はvalid old/new chainのいずれか1つ、sync前ack 0、ack済み消失0、部分bundle採用0、chain branch 0、同一transactionの異receipt 0である。

各cellはinvocation、process、payload manifest、envelope、runner/store entries、transaction、publish receipt identityを双方向に辿れる。suite incomplete findingはmissing keysとcauseを全数保持する。

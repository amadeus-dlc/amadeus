# Security Design — cursor-live-closure

## 上流契約と境界

本設計は`business-logic-model.md:7-18`を入力とし、Cursor Agent capability probeをgreen adapter materializationまたはevidence-backed unsupported closureへ排他的に接続する。NFR Requirementsはscope上skipされたため、不存在のsecurity requirementsやtech-stack decisionsは補作しない。

C2はGHA hard deny→`AMADEUS_CURSOR_LIVE === "1"`を最初に評価し、deny時はPhase guard、probe、model callを0回にする（`business-logic-model.md:7`）。許可後にU10所有`CursorPhaseGuard`がC7/C8/C9のPhase 2 closure一致をread-only検証し、不成立ならC4を呼ばない（同:8）。成功後の拘束順序はC4 registrar→0700 scratch HOME/TMPDIR/XDG/workspace→isolated preflight→dist/hook materialize→model callである。preflight不成立もregistrar cleanupへ入る。

child envは`PATH`,`HOME`,`TMPDIR`,`XDG_CONFIG_HOME`,`XDG_CACHE_HOME`,`LANG`,`LC_ALL`,`NO_COLOR`,`AMADEUS_CURSOR_PROBE_NONCE`とoptional `CURSOR_API_KEY`のexact setとする。source HOME/`.cursor`/account/AWS/ambient envを渡さない。API key leaseはC4 brokerだけがsecretを所有し、spawn env構築直前にprocess-local bufferへ1回射影、spawn直後にbuffer zeroize、group reap後にlease destroyする。brokerはAPI key original UTF-8 bytes（native auth時はなし）と、source HOME/`.cursor`/credential locatorの正規化絶対pathおよびJSON-escaped/percent-encoded pathを重複排除したopaque `CursorLeakMatcher`へ封入する。argv/result/log/ledgerへsecret/locator/patternを出さない（同:9-13）。

## Safe spawn and process containment

argvは`cursor agent --print --output-format text --mode ask --sandbox enabled --workspace <scratch> --trust "/amadeus --status"`のtyped builderだけで作る。`--force`,`--yolo`,`--auto-review`,`--approve-mcps`,`--add-dir`,`--plugin-dir`,`--worktree`、追加prompt/dir、sandbox disabledを拒否する（`business-logic-model.md:14`）。workspace/profile/configはregistrar receiptのrealpath/inode identityへ固定する。

C5所有`CursorContainmentPort`はmodel call前にfilesystem-write deny self-testとatomic `spawnIntoJob` capabilityを検証する。child/jobはworkspaceをread-only、HOME/TMPDIR/XDGだけをwrite可、source HOME/repository外をread/write不可とし、arbitrary subprocessを拒否する。status utilityとproject hook shimだけをexact digest/argvでowner-bound brokerへ委譲する。Linuxは`CLONE_INTO_CGROUP`またはjob内pre-exec launcher、他platformは同等のspawn-before-first-instruction jobを必須とし、未成立は`environment-unavailable`でU10未完了、Issue代替禁止とする。

120秒でjobへTERM 10秒→KILL 5秒→membership emptyを確認する。leader PID/start identity/PGIDも再検証するが、PID不一致時もowner-bound job handleで全descendantを回収し、無関係groupへsignalしない。job/leader/credential/scratch残存0をcleanup receiptへ記録する（同:16-17）。

## Unforgeable hook receipt

existing hook wiringを保持し、test-only scriptはmode 0555、content SHA-256固定、symlink/hardlink禁止で追加する（`business-logic-model.md:11-12`）。Cursor childのPATH先頭に`CursorHookBrokerShim`を`bun`名で置き、real Bunをchildから不可視にする。shimはparent-owned brokerへexact argv/cwd/peer PID-start/run nonceを送るだけで、shellやBunを起動しない。

brokerは次のsingle-use state machineを所有する: `armed`→exact status utility argvをjob peerから受理→restricted read-only workerを副作用前にregistrar登録して60秒以内に実行・reap→`status-completed(exit=0)`→exact afterShell hook argvとdocumented stdin command/hashを受理→test hook worker実行→receipt commit→`consumed`。順序違反、追加引数、shell chaining、duplicate/foreign peerは拒否する。status workerとhook workerは別のowner-bound jobとして副作用前にregistrar登録し、各60秒deadline、TERM 5秒、KILL 5秒、membership empty/reapを必須にする。

機能設計どおりreceipt writerはtest-only `amadeus-live-probe-receipt.ts`自身とする。brokerが起動するhook workerだけに、workspace read-only policyの例外としてexact temp pathとfinal receipt pathへのcreate/write/fsync/no-replace-rename権限を1回与える。他path、既存file open、unlink、追加process/networkはdenyする。scriptはO_EXCL tempへwrite/fsyncし、no-replace renameで`.cursor/.amadeus-live-probe-receipt.json`へcommitする。Cursor child jobとstatus workerはworkspace write不可なのでpreseed/偽造できない。schemaは`{schemaVersion:1,nonce,event:"afterShellExecution",commandId:"cursor-status-utility",commandSha256:<fixed>}`のexact keys、mode 0600、owner/inode一致とする。nonceは128-bit random hexでreceipt検証後にzeroizeし、他へ永続化しない。

## Output, anchors, and closure

stdoutは1,048,576 bytes、stderr 262,144 bytes、combined 1,310,720 bytesをraw byte計測し、incremental SHA-256、case-insensitive auxiliary matcher、broker-owned `CursorLeakMatcher`を両streamへ同時適用する。leak matcherは全patternをchunk境界越し・複数一致で照合し、最初の一致で`FAIL:ASSERTION_FAILED/secret-leak`を固定する。結果はbooleanだけで、pattern/offset/matched bytesを永続化しない。overflow/leak後もjob reapまでdigest/count/leak stateだけのdiscard-drainを続け、最後にmatcher automatonをzeroizeする。raw output、prompt response、account/path/secretを保存しない。

successはexit 0、current nonce/event/command ID/hashのreceipt、補助`No active AI-DLC workflow`、state/intents不存在、leak 0のANDである（`business-logic-model.md:15`）。receiptが唯一の正本で、prose-only/stale/duplicateはgreenにしない。model call後はPASS/TIMEOUT/FAIL/CAPABILITY_UNSUPPORTEDをC8へappendし、ledger failureだけhard errorとする。

supported materializationはall anchors時だけ、unsupportedは取得済みversion/helpとstable capability codeが具体的なflag/hook/sandbox欠如を再現した場合だけ許可する。binary/auth/containment environment不足、timeout、transient/protocol/assertion failureをIssueで代替しない。同:20-30,41-43のC7/C8/C9決定表を再定義しない。

## Verification

`cursor-agent-contract`でunsafe flag、ambient env/source config、API-key/source pathのstdout/stderr・chunk分割・複数漏洩、workspace write、receipt直書き、hook workerのpath権限逸脱、hook順序/peer/nonce/hash/duplicate、broker worker hang、output上限、spawn前fork escape、PID reuse、timeout/cleanup/ledger failure、unsupported誤分類をmutant redにする（`business-logic-model.md:32-39`）。cache、database、AWS scalingは単発CLI probeに非適用である。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:29:01Z
- **Iteration:** 1
- **Scope decision:** none

capability分岐、atomic containment、hook brokerは具体化されているが、API key/source-path漏洩を判定する実装契約がなく、receipt生成主体も機能設計とNFR設計で矛盾する。

### Findings

- BLOCKER | API keyとsource pathのleak=0を判定する仕組みがない | security-design.mdはsuccess条件にleak 0を含め、verificationでAPI-key漏洩をredにするとするが、BoundedCursorOutputはdigestとNo active補助matcherしか定義せず、credential brokerからsecret patternを受け取るinterface、chunk境界照合、source path pattern、zeroize、receiptへの非露出がない。fake childがCURSOR_API_KEYをstdoutへ出しても、設計どおりのcollectorでは検出できずexit/receipt/state anchorsが揃えばgreenになり得る。 | broker-owned secret/source-path streaming matcherをbounded outputへ接続し、stdout/stderr双方・chunk分割・複数一致を検出してgreenを禁止し、patternとoffsetを永続化しない契約を定義する。
- BLOCKER | hook receiptの生成主体が機能設計とNFR設計で両立しない | business-logic-model.mdはtest-only amadeus-live-probe-receipt.ts自身がO_EXCL/atomicでworkspace内receiptを書くと定める。一方security-design.mdはCursor child jobのworkspace writeを禁止し、scriptをshim経由でbrokerへ転送した後、parent brokerだけがreceiptを書くと定める。同じ実行でscript自身のwriteとchild write禁止を同時に満たせず、Code Generationはどちらを正本にするか判断できない。 | 機能設計をbroker-authoritative receiptへ同期し、test-only hookは副作用なしの固定signalだけを送るものとして、receipt schema・writer・atomicity・sandbox例外を一意にする。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:30:57Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の2件のBLOCKERは解消された。API keyとsource pathはbroker-owned streaming matcherによりstdout/stderr、チャンク境界、複数一致まで検査される。receipt writerも機能設計どおりtest-only scriptに統一され、限定的な一時書き込み権限とworker job cleanupが定義された。新たなBLOCKERはない。

### Findings

- None

# Security Design — kiro-tui-live

## 上流契約と境界

本設計は`business-logic-model.md:7-20`を入力とし、Kiro tmux TUIをC4 lifecycleへ接続する。NFR Requirementsはscope上skipされたため、不存在のsecurity requirementsやtech-stack decisionsは補作しない。

C2はGHA hard deny→strict opt-inを最初に評価し、deny時はPhase guard、probe、tmuxを0回にする（`business-logic-model.md:7`）。許可後にU08所有`KiroTuiPhaseGuard`を実行し、不成立ならC4を呼ばない（同:8）。成功後の拘束順序はC4 registrar→minimal 0700 workspace/HOME/TMPDIR→isolated preflight→dist materialize→tmux startとする。同:9-10のpreflightとfresh homeは、空scratchを先に確保し、probe後にproject内容を配置する二段階として具体化する。preflight不成立もregistrar cleanupへ入る。

preflight/server/child envは`PATH`,`HOME`,`TMPDIR`,`LANG`,`LC_ALL`,`TERM`,`NO_COLOR`のexact setとし、`TERM=xterm-256color`、scratch pathだけを使う。source HOME/profile/config、AWS/ambient envを渡さない。同じenvの`whoami`成功だけをmachine-auth capabilityとし、secret/account/pathを取得・記録しない（同:9,12）。

## Private tmux and command controls

socket label/sessionはrun nonceから`^[A-Za-z0-9_-]{1,64}$`で生成し、全tmux argvを`tmux -f /dev/null -L <label> ...`のtyped builderだけで作る。default socket/env override、user config、既存sessionへのattachを拒否する。socket/session/server/paneは副作用前にplanned登録し、private socket inode/owner/mode、session名、pane ID/PID/start commandをcreated receiptへ束縛する（`business-logic-model.md:11,17`）。

sessionは200x50、scratch cwd、fixed `/bin/bash --noprofile --norc -c`で開始する。shell payloadはliteral `exec kiro-cli chat --agent amadeus --trust-tools= --agent-engine v2`だけで、追加引数、shell interpolation、`--trust-all-tools`、非空trust listを拒否する（同:13）。model tool request/permission requestを観測した時点でassertion failureとし、empty trustにより実行0をfixtureで確認する。

## Bounded pane and terminal classification

captureはprivate pane IDへ限定し、1回65,536 bytes、全run 2,097,152 bytes、4,096 capturesを上限にする。ANSI CSI/OSCをbounded streaming parserで除去し、UTF-8不正、上限超過をexecution failureにする。raw pane、ANSI、socket/session/PID、account情報は保存せず、capture count/digestとmatched pattern IDだけをreceiptへ出す（`business-logic-model.md:14-16`）。

terminal classificationはcase-fold後のexact closed pattern IDで行う。`terms-consent`=`yes, i accept`、`sign-in-required`=`sign in required`、`unsupported-terminal`=`unsupported terminal`だけをCAPABILITY_UNSUPPORTEDとし、自動入力しない。chat readinessは`ask a question or describe a task`が600ms連続して同じpane/contextに現れた場合だけ成立する。known patternなしで60秒を越えた場合だけJOURNEY_TIMEOUTとし、2 branchを排他的にする。

prompt前にworkspace root identityを固定し、latch不存在、counter `c0`をno-followで確認する。不在=0、存在時はowner一致/mode 0600/non-negative safe integerだけを受理する。literal `/amadeus --status`とEnter 1回の後、case-insensitive `No active AI-DLC workflow`を240秒以内に検出し、latchの`flag="status"`,`source="read-only-flag"`,`turn=c0+1`、counter=`c0+1`、state/intents不存在をANDする。pane-only/preseed/symlink/foreign owner/非増分をgreenにしない。

## Owner-bound process containment

C5はtmux開始前に`ProcessContainmentPort.probe()`を行う。portは`createJob(runNonce)`、`spawnIntoJob(job,spec)`、`signal(job,signal)`、`kill(job)`、`waitEmpty(job)`だけを公開し、起動後`attach`を公開しない。supported backendは、Linux cgroup v2の`clone3(CLONE_INTO_CGROUP)`またはjob内pre-exec launcher+`cgroup.kill`、Darwinのspawn-authorization backend（全spawnを最初のuser instruction前にjobへ登録し、job外`setsid`/reparentをdeny）だけである。probeはbackend kind/versionと、spawn直後fork/setsidする実childを含むatomic-membership/kill/empty self-test receiptを返す。どちらも成立しない環境はstart前CAPABILITY_UNSUPPORTEDとしてC7 alternative closureへ送り、spawn-then-attachやbest-effort pollingでliveを開始しない。

C5は`RunProcessJob{runNonce,jobId}`を副作用前にregistrarへplanned登録し、`spawnIntoJob(job, privateTmuxForegroundSpec)`でprivate tmux serverを最初の命令実行前からjob所属として起動する。server PID/start identity/PGID/socket inodeを保持し、server/pane/helper/`setsid`後のdescendantはOS job継承またはspawn authorizationにより同じjobから離脱できない。session作成直後にpane ID/PID/start identity/start command/PGIDを取得し、run nonce/session/command一致、PGID>1、runner/server groupと相違を検証する（`business-logic-model.md:17-18`）。C5はjob handleを含む`KiroTuiCleanupTarget`をC4 registrarへ登録し、tmux protocolとprocess identityを所有する。C4は全体cleanup順序だけを所有し、targetをC5へ返して`KiroTuiCleanupReceipt`を受ける。

signal前にsocketがある場合は同じpane/session/PIDを再検証し、常にPID start identity/PGIDをOSから再検証する。成立時だけpane groupへTERM 5秒→KILL 5秒→ESRCHを確認する。socket/server/leader先行消失やidentity不一致では無関係groupへのsignalを拒否するが、owner-bound jobへTERM→`job.kill`を適用し、job membership emptyを確認する。別PGID/`setsid` descendantもjob内に残るため、pane identityに依存せず回収できる。その後session/server/socketを停止し、server identity/socket/group不在とjob emptyを5秒で確認してjobを破棄する。C4はreceipt後にscratch/leak scanを続け、全対象を試行する。

## Deadline and evidence

300秒journey、15秒teardown、330秒outer timeout、retry 0、serialを固定する（`business-logic-model.md:19`）。tmux start後はPASS/SKIP/TIMEOUT/FAILをsanitized C8 receiptへappendし、start前unsupportedだけreceipt absent、ledger failureだけtyped hard errorとする。同:20,46-48のC7/C8/C9責務を再定義しない。

## Verification

`kiro-tui-contract`でdefault socket/config、implicit opt-in、ambient env、non-empty tool trust、consent自動操作、terminal pattern競合、pane byte/capture上限、preseed/symlink latch、containment backend self-test不成立、spawn直後fork/setsid逃避、spawn-then-attach実装、PID再利用/誤PGID、socket/server/pane leader先行消失、別PGID/`setsid` descendant、TERM無視、pane/server/job残存、job emptyとOS descendant 0の不一致、cleanup/C8/C9 failureをmutant redにする（`business-logic-model.md:37-44`）。cache、database、AWS scalingはdesktop TUI journeyに非適用である。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:24:14Z
- **Iteration:** 1
- **Scope decision:** none

tmux隔離、結果分類、bounded capture、owner検証は具体化されているが、pane leader消失または別group離脱後のrun-owned childを安全に終了できない。

### Findings

- BLOCKER | pane leaderが先に消失すると残存child groupを停止できない | security-design.mdはsignal直前にpane PIDのstart identity/PGID再検証を必須とし、不一致・所有不明ではgroup signalを拒否して一致するowner PIDだけを停止する。しかしpane leaderが同一groupのchildを残して終了し、tmux socket/serverも消失したケースではowner PIDを再検証できず、残存groupへsignalできない。さらにchildがsetsidで別PGIDへ移ればPrivateTmuxOwnerReceiptにも登録されない。cleanup failureにはできても課金可能なKiro processを残すため、失敗時安全性を満たさない。 | run-owned job/cgroup相当で全descendantを生成時から束縛するか、PID/start identityを持つ全descendant・離脱groupをregistrarへ登録し、leader先行終了と別PGID離脱の双方で残存0を検証する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:26:05Z
- **Iteration:** 2
- **Scope decision:** none

前回のleader消失・別PGID離脱はrun-owned jobで扱う設計になったが、tmux serverをjobへ所属させる操作がspawnと原子的でなく、containment開始前にchildが逃げる競合が残る。

### Findings

- BLOCKER | tmux processをjobへattachする前のfork逃避を防げない | security-design.mdはserverをjobへattachしてから起動すると記述するが、未起動processにはPIDがなくattachできない。logical-components.mdのProcessContainmentPortもcreate/attach/kill/emptyだけでatomic spawn操作を持たない。通常のspawn後にPIDをcgroup/jobへattachする実装では、tmuxまたはfake executableがattach前にdaemon/helperをfork・setsidすれば、そのchildはjob外に残り、job.killとjob emptyが成功しても課金processが生存する。 | spawnIntoJobをclosed portとして定義し、LinuxではCLONE_INTO_CGROUPまたはjob内pre-exec launcher等で最初の命令実行前に所属を確定する。spawn直後にforkするmutantがjob外process 0になることをself-testとcontract testへ追加する。

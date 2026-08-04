# Business Logic Model — kiro-tui-live

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。U08は既存Kiro tmux TUI driverを共通C1〜C4/C7〜C9へ接続するC5/C6 sliceである。

## Execution Workflow

1. C2は`GITHUB_ACTIONS === "true"`を最優先し、次に`AMADEUS_KIRO_TUI_LIVE === "1"`を評価する。runnerの`--all`/`--release --debug`はopt-inを自動設定しない。deny時はPhase guard、probe、tmux serverを0回にする。
2. gate許可後、U08所有の`KiroTuiPhaseGuard`がU04/U05のPhase 1 closureをread-only検証する。不成立はC4を呼ばず`Result.err(contract-invalid/phase-prerequisite-unmet)`とする。
3. C5 preflightは隔離envでtmux `>=3.2`、`kiro-cli >=2.6.1`（実測`tmux 3.7b`、`kiro-cli 2.13.0`）、`chat --help`の`--agent`、`--trust-tools`、`--agent-engine`、isolated `whoami`、`dist/kiro`を検査する。
4. C4がregistrarを作った後、fresh workspace/HOME/TMPDIRを作り、`dist/kiro`の`.kiro`、`amadeus`、`AGENTS.md`だけを配置する。
5. C5はrun nonceから`^[A-Za-z0-9_-]{1,64}$`を満たすprivate tmux socket labelとsession名を作る。`tmux -f /dev/null -L <socket>`を全操作へ必須とし、default serverを参照しない。socket/sessionは作成前にregistrarへplanned登録する。
6. private tmux serverとchild envは`PATH`,`HOME`(scratch),`TMPDIR`(scratch),`LANG`,`LC_ALL`,`TERM=xterm-256color`,`NO_COLOR`だけ。ambient env、source HOME/profile/config、AWS envを渡さない。同一envの`kiro-cli whoami`成功だけをmachine-auth supportedとする。
7. C5は200x50 sessionをscratch cwdで開始し、`/bin/bash --noprofile --norc -c 'exec kiro-cli chat --agent amadeus --trust-tools= --agent-engine v2'`を実行する。model tool権限は空で、`--trust-all-tools`を使わない。
8. TUIに`Yes, I accept`等のterms/consent、sign-in required、unsupported terminalの既知terminal patternが現れた場合だけ`CAPABILITY_UNSUPPORTED`として自動操作しない。terminal patternなしでchat readiness `ask a question or describe a task`が60秒/600ms stable以内に現れない場合は`JOURNEY_TIMEOUT`とする。この2 branchは相互排他である。
9. C6はprompt直前に`amadeus/.amadeus-readonly-latch`不存在とturn-counter `c0`（不存在は0）を確認する。`/amadeus --status`をliteral sendしEnterを1回送る。
10. 最大240秒、stable 0でpaneの`No active AI-DLC workflow`を待つ。disk anchorsはlatch `flag=status`、`source=read-only-flag`、`turn=c0+1`、counter `c0+1`、state/intents不存在である。pane全文、ANSI、token counter、prose全文は保存・比較しない。
11. session作成前にrun nonce、socket label、session名を含むowner-bound process-tree resourceをregistrarへplanned登録する。作成直後、同じprivate socketから`session_name`、`pane_id`、`pane_pid`、`pane_start_command`を取得し、`ps`からPID start identityとPGID、runner自身とtmux serverのPGIDを取得する。session/command/nonce一致、PID正整数、PGID>1、PGIDがrunner/server groupと異なることを検証してcreatedへ遷移する。これらはprocess-localでledgerへ出さない。
12. signal直前に同じprivate socketの同じpane IDが同じsession/PIDを示し、`ps`のPID start identity/PGIDがowner receiptと完全一致することを再検証する。成立時だけowner PGIDへTERM 5秒→KILL 5秒→`kill(-pgid,0)`が`ESRCH`になるまでpollする。PID再利用、pane不一致、PGID不正/変化、runner/server group一致、所有不明ではgroup signalを拒否し、owner PIDだけをstart identity再検証後に停止してcleanup failureを返す。その後session/server kill→socket/server PID不在を5秒で確認する。
13. 総budget 300秒、teardown 15秒、outer Bun timeout 330秒、retry 0、live直列実行とする。cleanup/leak failureは`FAIL:EXECUTION_FAILED`、ledger failureは`Result.err(ledger-write-failed)`。
14. gate/preflightで外部実行前にunsupportedとなる場合だけC8 receiptはない。tmux start後のsuccess、timeout、execution/assertion/cleanup failureはすべてsanitized receiptをC8へatomic appendする。unsupported時またはpost-start blocker時のIssue URL/stateはC7、表示はC9が所有する。

## Result Mapping

| Observation | Result |
|---|---|
| CI / opt-in deny | canonical skip、external call 0 |
| Phase 1 closure不成立 | `Result.err(contract-invalid/phase-prerequisite-unmet)` |
| tmux/CLI/version/help/auth/dist不成立（start前） | canonical skip。C7 Issue確定まで未完了、C8 receiptなし |
| consent/sign-in/unsupported-terminal pattern検出（start後） | `SKIP:CAPABILITY_UNSUPPORTED`、C8 skip receipt + C7 Issue候補 |
| start/send/capture/child early exit | `FAIL:EXECUTION_FAILED` |
| known terminal patternなしのreadiness期限 / status期限 | `TIMEOUT:JOURNEY_TIMEOUT`、C8 timeout receipt |
| pane/latch/counter/state anchor不成立 | `FAIL:ASSERTION_FAILED` |
| cleanup/leak failure | `FAIL:EXECUTION_FAILED`、C8 failure receipt、green禁止 |
| ledger failure | `Result.err(ledger-write-failed)` |
| all anchors + durable receipt | `PASS:SUCCESS` |

## Verification

- fake tmux runnerで全commandの`-f /dev/null -L <socket>`、private session、fixed shell、exact child argv/envを検証する。
- default server access、ambient env、implicit opt-in、consent自動承認、`--trust-all-tools`をmutant redにする。
- timeout/early-exitでowner再検証、pane process group TERM/KILL/`ESRCH`、session/server/socket残存0、HOME削除、debug workspace分離を検証する。PID再利用、誤PGID、runner/server PGID、pane/session不一致、tmux server消滅後もfake childが残るmutantをredにする。
- prompt前preseeded latch、counter非増分、paneだけの偽greenをredにする。

U02 suite bindingは`kiro-tui-contract`。stable assertionsは`TMUX_DEFAULT_SERVER_FORBIDDEN`,`TUI_ENV_ALLOWLIST_EXACT`,`TUI_EXPLICIT_OPT_IN`,`CONSENT_AUTOMATION_FORBIDDEN`,`READINESS_TIMEOUT_UNAMBIGUOUS`,`MODEL_TOOL_TRUST_EMPTY`,`PROCESS_GROUP_OWNER_MATCH`,`PANE_PROCESS_GROUP_EMPTY`,`TMUX_SERVER_REAP_REQUIRED`,`NON_GREEN_RECEIPT_REQUIRED`,`OFFBAND_STATUS_FRESHNESS_REQUIRED`とする。

## Alternative Closure Contract

後続Issueはtested tmux/CLI version、OS/arch、help/auth/readiness probe、sanitized pane anchor結果、阻害要因、推奨seam、受入条件、sanitized command、親Issue/U08 artifact linkを必須とする。pane全文、PID/PGID、session/socket path、source home/profile/account情報を含めない。start前unsupportedはC8 receipt absent、start後timeout/failure/unsupportedは対応C8 receiptを持ち、C7 Issue/stateとC9 projectionが一致した時だけPhase 2 closureへ渡す。

## Human Adjudication

- **Date:** 2026-08-03T15:18:31Z
- **Decision:** reviewer上限到達後の選択肢1「process group所有者検証を追加し、人間裁定でREADYとして続行」
- **Resolution:** run nonce、private socket/session/pane、PID start identity、PGIDをowner-bound resourceとして登録する。signal前に同じprivate pane所属とstart identity/PGIDを再検証し、PGID>1かつrunner/tmux server groupと異なる場合だけgroup signalを許可する。
- **Resolution:** PID再利用、誤PGID、pane/session不一致、所有不明ではgroup signalを拒否し、identity一致したowner PIDだけを停止してcleanup failureとする。mutant testsで誤ったdeveloper process groupへsignalしないことを固定する。
- **Review record:** `Review — Iteration 2`は当時の検出結果として変更しない。追加review iterationは実施せず、この人間裁定をBLOCKER解消根拠とする。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:13:15Z
- **Iteration:** 1
- **Scope decision:** none

依存循環や参照切れは認められないが、readiness失敗の結果分類、非green実行の台帳記録、Kiro child processの完全な終了保証が閉じていない。

### Findings

- BLOCKER | readiness不成立の結果分類が一意でない | business-logic-model.mdのResult Mappingはreadiness不成立をcanonical skipとしてalternative closureへ進める一方、同じreadiness deadlineを`TIMEOUT:JOURNEY_TIMEOUT`にも割り当てる。60秒以内にreadiness文字列が現れず、consent画面も検出されないケースは両方に該当し、C7 unsupported+Issueとruntime timeoutのどちらへ進むか実装者が決められない。 | consent画面・required capabilityの決定的欠如だけを`CAPABILITY_UNSUPPORTED`へ割り当て、単なるreadiness期限超過は`JOURNEY_TIMEOUT`へ固定するなど、相互排他的な決定表を定義する。
- BLOCKER | failure・timeout実行がC8台帳から失われる | business-logic-model.mdは「green時だけC8へreceiptを追記」と定めるが、requirements.md FR-11 AC2はlive journeyの結果を日時・SHA・adapter・version・result付きで台帳へ残すことを要求し、component-methods.mdの共通lifecycleもcleanup後にfailure/timeoutを含むreceiptを生成してatomic appendする。現設計ではstart後のexecution failure、timeout、assertion failure、cleanup failureが記録されず、共通C4/C8契約をadapter固有に弱体化する。 | 外部実行開始後のsuccess・timeout・failureはsanitized receiptをC8へ追記し、ledger失敗だけをtyped hard errorにする。probe段階のunsupported alternative closureのみreceipt absentとする境界を明記する。
- BLOCKER | tmux終了確認だけではKiro child processのreapを保証できない | cleanupはsession/server killとsocket・server PID不在だけを確認し、PrivateTmuxHandleとTmuxTerminationReceiptにもKiro child PIDまたはprocess-groupの追跡・不在確認がない。childがSIGHUPを無視する、またはdescendantを残すfailure injectionではtmux server消滅後も課金可能な`kiro-cli`が生存し得て、FR-5の失敗時cleanupとNFR-3のコスト境界を満たせない。 | pane childのPID/PGIDをregistrarへ副作用前に登録し、timeout/cleanup時にTERM→KILL→reapを行ってprocess tree不在を検証する。tmux server消滅後もchildが残るfake fixtureをmutant redへ追加する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:15:37Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の3 BLOCKERは解消された。ただし、新設したprocess-group強制終了に所有者検証がなく、無関係なprocess groupを停止し得る安全欠陥が残る。

### Findings

- BLOCKER | pane process groupの所有者を検証せず負のPGIDへsignalしている | business-logic-model.mdはtmuxのpane_pidから`ps`でPGIDを取得し、`kill(-pgid, …)`を実行するが、PID start time、private sessionとの親子関係、PGIDの正値・非1・runner自身のgroupではないことを検証する契約がない。pane終了と`ps`の間にPIDが再利用された場合、またはPGID解決が誤った場合、無関係なdeveloper process groupへTERM/KILLを送信できる。PrivateTmuxHandleとTmuxTerminationReceiptにも所有者tokenや検証結果がない。 | pane起動時にrun nonce、PID、process start identity、PGIDをowner-bound resourceとして記録し、signal前にprivate tmux paneとの所属とstart identityを再検証する。PGIDが不正、再利用済み、runner自身または所有不明ならgroup signalを拒否してcleanup failureとし、PID再利用・誤PGIDのmutant testを追加する。

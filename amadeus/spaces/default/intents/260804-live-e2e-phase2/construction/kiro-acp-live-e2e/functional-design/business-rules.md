# Business Rules — kiro-acp-live-e2e

## 入力と適用範囲

本規則は [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md) に基づき、Kiro ACPだけへ適用する。

## Policy and protocol rules

- **BR-ACP-01:** CI denyとexact opt-inは全side effectより前に評価する。
- **BR-ACP-02:** child envはallowlistから新規構築し、ambient secretとsource auth/config pathを除外する。
- **BR-ACP-03:** request IDはattempt内で一意とし、response ID mismatch、duplicate terminal response、unknown response shapeを拒否する。
- **BR-ACP-04:** PASS anchorはallowlisted tool IDとvalidated result schemaを必須とし、自然文一致だけを認めない。
- **BR-ACP-05:** raw JSON-RPC frame、prompt、response、credentialをledger、Issue、diagnosticへ保存しない。

## Cancellation and cleanup rules

- **BR-ACP-06:** timeout/abort時はcancelを試みるが、acknowledgementをresource closureの証明にしない。
- **BR-ACP-07:** cleanupはsession/request close → cancel → root process wait/kill → descendant reap → binding/scratch除去の順で冪等に行う。
- **BR-ACP-08:** root exit後もdescendantが残ればcleanup failureであり、PASS receiptを禁止する。
- **BR-ACP-09:** cleanup二重実行は既closed resourceに成功し、別runのprocessをkillしない。
- **BR-ACP-09a:** direct pathはspawn前に強いOS containment境界を確立し、rootと全descendantをその非離脱境界へ所属させる。通常の親PID追跡・process groupだけをstrongとみなさない。
- **BR-ACP-09b:** containment memberはPID単独でなくOS boundary membershipとprocess start identityで識別し、PID再利用を別processとして扱う。
- **BR-ACP-09c:** cleanup成功には境界全体のTERM/KILL後、OS primitiveによるmember集合emptyの証明が必要である。emptyを確認不能、列挙失敗、期限超過、離脱可能なprimitiveしかない場合は`cleanup-barrier-failed`とする。
- **BR-ACP-09d:** strong containment capabilityが利用できないplatformではdirectを禁止し、sanitized evidenceを持つfollow-up branchへ進む。
- **BR-ACP-09e:** cancelはbest-effortで、ackはclosure proofではない。cancel grace満了または送信失敗を境にcontainment-wide terminationへ進み、transport応答を追加で待たない。
- **BR-ACP-09f:** boundary member emptyとPOSIX child reapを同一視しない。runner所有の直接子とsubreaper等でadoptしたwaitable childを全件`wait`/`waitpid`相当で回収し、exit statusとstable identityを持つreap receiptを得る。
- **BR-ACP-09g:** `ProcessClosureReceipt`は`BoundaryEmptyProof`と`DirectChildReapReceipt`の両方を必須とする。boundaryがemptyでもzombie、wait failure、identity mismatch、wait deadlineがあれば`cleanup-barrier-failed`である。

## Retry and outcome rules

- **BR-ACP-10:** retryable closed setは`acp-startup-capacity`、`acp-process-start-collision`、`provider-throttled-before-anchor`だけである。
- **BR-ACP-11:** retryはattempt 1、anchor前、全resource closedの組で最大1回だけ許可する。
- **BR-ACP-12:** protocol/schema/ID violation、timeout、abort、auth/config error、policy violation、anchor後failureはretryしない。
- **BR-ACP-13:** retryは新しいattempt/request namespace/process leaseを使い、中間PASS receiptを生成しない。
- **BR-ACP-14:** cleanup failure時の外側Resultはexecution outcomeにかかわらず`cleanup-barrier-failed`とし、元execution outcomeは`originalOutcome`としてerror payloadに保持する。
- **BR-ACP-15:** cleanup failure runはPASS、non-PASSのいずれのledger行も生成せず、green SHA、connected evidenceへ投影しない。
- **BR-ACP-16:** cleanup closedのfinal ledgerは1 run 1行で、attempt履歴はphase、code、bounded digest、cleanup statusだけを含む。

## Completion rules

- **BR-ACP-17:** direct connectedにはACP自身のcontract、integration、local live greenが必要である。
- **BR-ACP-18:** structural blockerだけがfollow-up branchを許可し、一時的なred testを自動でIssue完了へ変換しない。
- **BR-ACP-19:** follow-up Issueはblocker、sanitized evidence、recommended seam、re-entry conditions、verifiable AC、Issue #1717 linkを必須とする。
- **BR-ACP-20:** Issue URLがregistry/matrixへ結合されるまでfollow-up-linkedとしない。
- **BR-ACP-21:** TUIまたはKimiの証拠をACPのdirect/follow-up dispositionへ流用しない。

## Rejection matrix

| Input/event | Required result |
|---|---|
| opt-inなし、CI deny | spawn/scratch/lease 0、canonical SKIP |
| response ID mismatch | protocol failure、retry 0 |
| cancel ack後にdescendant残存 | cleanup failure、PASS 0 |
| descendantが`setsid`/再親化で通常PGIDを離脱 | strong containment test失敗、direct禁止 |
| member列挙またはempty確認不能 | cleanup failureまたはpreflight follow-up、PASS 0 |
| boundary emptyだが直接子のwait未実行 | cleanup failure、closure/PASS 0 |
| subreaperへ再親化された子のwait漏れ | cleanup failure、closure/PASS 0 |
| transient start failure後cleanup残存 | retry禁止、cleanup override |
| attempt 2 success、cleanup closed | final PASS receipt 1行、attempt 1はbounded summaryのみ |
| direct不成立だがIssueなし | Unit未完了 |

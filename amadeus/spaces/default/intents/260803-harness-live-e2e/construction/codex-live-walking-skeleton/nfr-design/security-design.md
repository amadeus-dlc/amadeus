# Security Design — codex-live-walking-skeleton

## 上流入力と保護対象

本設計は`business-logic-model`を入力とし、U01のC1〜C9 production kernelとCodex live walking skeletonを保護する。保護対象はcredential material、source HOME/config path、scratch trust boundary、child process ownership、canonical `LiveOutcome`、run receipt、atomic ledger、capability matrixである。

## Trust Boundaries

| 境界 | 信頼する入力 | 拒否する入力 | 制御 |
|---|---|---|---|
| C2 Gate | closed environment snapshot | ambient mutation、implicit opt-in | `GITHUB_ACTIONS=true`最優先、strict `"1"` |
| C5 Credential | host-injected opaque lease | source auth path/file、raw secret API | typed key declaration、non-serializable handle |
| C4 Scratch | registrarが作成したowner-bound path | symlink escape、workspace root、source HOME | canonical containment、planned→created receipt |
| C5 Child | exact allow-list env/argv/cwd | `process.env` spread、untrusted config | fresh HOME、project-local dist、env key equality |
| C6 Evidence | structured exit/schema/file/state anchors | prose-only success、stale receipt | run ID/nonce/digest binding |
| C8 Ledger | sanitized typed receipt | raw stdout/stderr、secret/path | lock、idempotency key、atomic replace、fsync |

## Security Controls

- Gate判定は副作用より前に完了し、deny時はbinary/auth probe、scratch、spawn、ledgerを0回にする。
- Credential leaseはC5 prepareだけが取得し、value/source pathをserialize・compare・logできない。registrarへ副作用前にplanned登録し、全終了経路でdestroyする。
- Scratch allocatorはrealpath containment、O_EXCL、owner-only permissionを使い、source credential/config/hooksをcopy・symlink・mountしない。debug保持時もcredential-bearing resourceは必ず削除する。
- Codex child envは明示allow-listから新規構築し、argvにはsecretを置かない。project trustはscratch git rootだけに限定する。
- Process ownershipはcredentialを持たないrun-owned supervisorをprocess-group leaderとして維持し、run nonce、supervisor PID/start identity/PGID、Codex child identityを`ProcessGroupLease`へ結合する。Codex leaderが先に終了してもgroup member残存0までsupervisorを生存させる。supervisorがcrash/SIGKILLで先に終了した場合、runnerは自身の未reap childとしてzombieを保持し、supervisor PIDすなわちPGIDのOS再利用を防ぐ。記録済みnegative PGIDへTERM→KILLを送り、group `ESRCH`を確認してからだけsupervisorをwait/reapする。この順序によりsupervisor消失後も別process groupを誤停止せず、credential-bearing descendant残存0を保証する。runner外group、非child supervisor、reap済みleaseは拒否し、capabilityをcredential lease前にfixture検証する。
- Successはexit 0だけで決めず、current-run構造化anchor、state/audit anchor、leak scanを全て要求する。自然言語substringは補助診断に限定する。
- Ledgerはreceipt IDをidempotency keyにし、lock取得後に重複判定する。開始前probeでdurability modeを`file-and-directory`または`file-only`へ確定し、不明は拒否する。前者はtemp write、file fsync、rename、directory fsync、pending marker除去までをcommit条件とする。後者はdirectory fsync非対応環境だけに許可し、file fsync+rename+final parseをcommit条件とするが、directory durabilityを主張せずreceiptへ`durabilityMode:"file-only"`を必須記録する。matrixは両modeをgreenとして扱えるが保証差を表示し、modeの暗黙fallbackを禁止する。
- Child stdoutは1,048,576 bytes、stderrは262,144 bytes、合計1,310,720 bytesを上限とする。C4のbounded collectorが両streamを継続drainしながらincremental SHA-256、byte count、上限内のstructured parser bufferだけを保持する。どれかの上限超過時はraw chunkを破棄し、process groupを停止して`FAIL:EXECUTION_FAILED/output-limit-exceeded`へ正規化し、reap完了までpipeをdrainする。receiptにはdigest、byte count、limit-exceeded booleanだけを残す。
- Result、receipt、Issue、debug logへcredential、source path、absolute HOME、prompt全文、stdout/stderr全文を入れない。leak findingは成功結果を`FAIL:EXECUTION_FAILED`へ昇格する。

## Threat and Failure Matrix

| Threat / failure | Detection | Containment | Required test |
|---|---|---|---|
| CI上の誤live起動 | C2 precedence | probe/spawn 0 | GHA+opt-in mutant |
| ambient secret混入 | env key equality | spawn前拒否 | poison env fixture |
| source path漏えい | recursive leak scan | failure + credential cleanup | source sentinel |
| stale/forged evidence | run ID/nonce/digest不一致 | assertion failure | replay/forgery mutant |
| PID reuse/誤PGID | start identity/owner mismatch | group signal拒否、bounded cleanup | reuse fixture |
| timeout後process残存 | group ESRCH/descendant count | TERM→KILL→reap | stubborn child fixture |
| leader先行終了 | supervisor/child identity、group member count | supervisorをgroup leaderとして維持 | descendant fixture |
| stdout/stderr flood | stream/combined byte counter | group停止、raw破棄、bounded drain | flood fixture |
| ledger重複/部分行 | lock内ID照合、parse/fsync | hard error、matrix非更新 | crash/retry injection |
| debug保持によるsecret残置 | resource classification | secret資源だけ強制削除 | keep-temp fixture |

## Authorization and Audit

本Unitは外部user identityやrole-based authorizationを追加しない。権限はmodule capabilityで分離し、C2だけがgate policy、C5だけがcredential/transport、C4だけがlifecycle orchestration、C8だけがledger writer、C9だけがgenerated projectionを所有する。C3/C6はfilesystem writerやcredential sourceへ直接アクセスできない。

監査対象はgate decision、preflight classification、model-call開始/終了、cleanup outcome、ledger commitである。監査payloadはclosed code、adapter ID、run/receipt ID、duration、anchor boolean、sanitized failure classだけを持つ。

## 非適用境界

新しいHTTP endpoint、database、cloud service、AWS account/IAM、network listener、persistent daemonは追加しないため、TLS、CSRF/XSS、data-at-rest encryption、VPC、multi-AZ、cloud autoscalingは本library Unitに非適用である。

## Verification

- baseline greenと、gate/env/credential/path/process/evidence/ledger各mutant redを同じU02 contract kitで検証する。
- secret-bearing fixtureはtest専用sentinelを使い、実credentialをsnapshotやfailure messageへ出さない。
- package/projectionテストでcanonical sourceと全harness生成面のsecurity contract driftを検出する。
- 1 byte手前、exact limit、1 byte超過、片stream/combined超過を検証し、collector memoryが上限を超えず、超過後もprocess/credential残存0になることを固定する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:44:49Z
- **Iteration:** 1
- **Scope decision:** none

Component分離と主要なcredential・scratch・ledger境界は具体的だが、process containment、ledger durability保証、child出力制限に実装不能または安全上の矛盾が残る。

### Findings

- BLOCKER | owner不明時のprocess containmentを保証できない | security-designはowner mismatch時にgroup signalを拒否する一方、child/group残存0をcleanup anchorとし、logical-componentsもCodex processをisolated process group内へ封じ込める。fake leaderがcredential-bearing descendantをspawnして先に終了すれば、owner再検証不能によりgroupを停止できず、残存0とbounded cleanupを同時に満たせない | run-owned supervisorをgroup leaderとしてreap完了まで維持するか、descendantごとのowner identityを登録して有界停止する。leader先行終了・PID reuse fixtureでもcredential-bearing process残存0を必須にする
- BLOCKER | ledger commitのdurability契約が上流と矛盾する | security-designはrename後のdirectory fsync完了までcommit扱いにしないと規定するが、business-logic-modelはdirectory fsync非対応時のfile-only modeでfile fsync+rename後の成功を許す。同じappendがsecurity上commit可能か不可能か一意に決まらない | file-onlyを許すなら低いdurability保証、適用条件、receipt表示、完了判定をsecurity-designへ明記する。directory durabilityが必須なら非対応環境をcapability failureとして開始前に拒否し、file-only成功経路を削除する
- BLOCKER | child出力上限が実装可能な契約になっていない | logical-componentsは出力量上限をC4/C6の性能境界とするが、security-designとbusiness-logic-modelにbyte上限、streaming/backpressure、超過時の停止・分類がない。childがtimeoutまでstdout/stderrを連続出力すれば、raw全文を永続化しなくてもparentのmemoryまたはpipeを枯渇させ、cleanupへ到達できない | stdout/stderrをincremental digestへ流す方式、stream別・合計byte上限、超過時のprocess停止とFAIL分類、raw data破棄を定義し、flood fixtureでmemory boundとcleanupを検証する

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:47:05Z
- **Iteration:** 2
- **Scope decision:** none

file-only durabilityとbounded outputは解消された。supervisorによりCodex leader先行終了は扱えるが、supervisor自身の消失時の封じ込めとC4/C5 spawn所有権、後続Unitへの新component継承に未解決の矛盾が残る。

### Findings

- BLOCKER | supervisor自身の異常終了で元のcontainment欠陥が再発する | security-designはCodex leader先行終了時もRunOwnedSupervisorを維持すると定めるが、supervisorのcrash/SIGKILL後の契約がない。既存のowner mismatch規則はgroup signalを拒否するため、fake supervisorがcredential-bearing child起動後に終了すればdescendant残存0を保証できない | supervisor消失後も親が安全に停止できるOS所有境界または登録済みdescendant identityを定義し、supervisor crash/SIGKILL、PID reuse、子残存fixtureでgroup ESRCHとcredential-bearing process 0を検証する
- BLOCKER | Codex child spawnのcomponent ownershipが矛盾する | Component InventoryはC5 CodexExecAdapterにprepare/spawn/normalizeを割り当て、C4はtransport argv/authを所有しない。一方Execution Sequence Step 4はC4がCodex childを起動すると定め、Resource OwnershipではC5がprocess handleを所有する。実装者はargv/env/handleをC4とC5のどちらに置くか決められず、credential境界を跨ぐ | C4がsupervisor capabilityを生成してopaque handleをC5へ渡し、C5がclosed SpawnSpecで起動を要求する等、argv/envをC5内に保った明示interfaceとhandle・cleanup所有権を一意に定義する
- BLOCKER | 後続Unit handoffが新しい安全componentを除外する | logical-componentsはLC-LIVE-13 RunOwnedSupervisorとLC-LIVE-14 BoundedOutputCollectorを追加したが、Handoffは後続NFR Design UnitにLC-LIVE-01〜12だけを再利用させる。後続transportが今回追加したcontainmentと出力上限を継承しない設計になり、共通production kernelの安全保証が分岐する | Handoff範囲をLC-LIVE-01〜14へ更新し、後続C5/C6がLC-LIVE-13/14を再定義せず必須利用する依存契約を明記する

## Human Adjudication

- **Date:** 2026-08-03T15:48:00Z
- **Decision:** reviewer上限到達後の選択肢1「3件を修正し、人間裁定で解消扱いとして続行」
- **Resolution:** supervisor異常終了後もrunnerが未reap zombieを保持してPID/PGID再利用を防ぎ、group ESRCH後にだけreapするOS所有境界を追加した。
- **Resolution:** C4がsupervisor capabilityとunderlying process handleを所有し、C5はclosed SpawnSpecを構築してborrowed execution viewだけを使う一意なownershipへ統一した。
- **Resolution:** 後続Unitの必須再利用範囲をLC-LIVE-01〜14へ拡張し、supervisorとbounded collectorの再定義を禁止した。
- **Review record:** `Review — Iteration 2`は当時の検出結果として変更しない。追加review iterationは実施せず、この人間裁定を3 BLOCKERの解消根拠とする。

# Business Logic Model — tla-invalid-timestamp-skeleton

## 上流契約と依存状態

本Unitは、`unit-of-work.md` のU5 integration slice、`unit-of-work-story-map.md` のS-2/S-4/S-8、`requirements.md` のFR-3/FR-8・NFR-1/NFR-2、`components.md` のCoordinator / Registry / Arm T / Runner / Evidence境界、`component-methods.md` のfreeze / reveal / run / append methods、`services.md` の中央orchestration順を専用integration harnessへ落とす。final CLI root、Arm S開始、残fixture fan-out、manifest promotion、eligibilityを所有しない。

U5はU1〜U4のpublic contractをconsumeする。U3はE-FVEU3FD1、U4はE-FVEU4FD1によりreviewer max-exhausted後是正の第三review未実施で、READYではない。このFunctional Designは結線手順を定義するだけであり、U3/U4の最終FD人間裁定前にintegration readiness、walking-skeleton completion、code-generation可を主張しない。

## Dedicated composition boundary

専用harnessはU1 generic dispatcherへ次のconcrete test-slice handlersだけをconstructor injectionする。

- `fixture-reveal`: U2 Registryのevent-bound disclosure grant / materialization。
- `run`: U4 frozen TLA model / verified TLCをU3 arm-neutral execution/evidence portで実行。
- `record-skeleton`: 2 runのverified evidenceをfoldしてU1へpass / fail event batchを要求。

`fixture-seal`、Arm S `start/freeze`、残fixture `benchmark`、promotion、evaluate、report handlerは登録しない。U1のfull dispatcher completenessを偽装せず、専用`SkeletonCommand` unionとhandler registryを持つintegration harnessとして隔離する。U8 final rootへimportされない。

## Preconditions and reveal

開始時に次を全て再検証する。

1. healthy baseline、Arm T freeze SHA、public input hash、actual input manifest / forbidden path receiptがU1 `T_FROZEN` stateと一致する。
2. U2に#1252 opaque aliasのindependent falling proof、single fixture branch、injection SHA、payload manifest / zero-finding scan / sealed identityがある。
3. U4のmodel / cfg / TLA+ tools 1.7.4 jar / OpenJDK 26.0.1 / run profileがfreeze receiptに一致する。
4. U3 evidence rootが空の新しいskeleton run identityを持ち、既存bundleを上書きしない。

precondition snapshotはCompositionHead ID / resulting commit SHAを含めてcanonical hashし、run中のdriftを拒否する。Registry revealはArm T frozen event、target worktree、#1252 aliasへ限定し、DisclosureEventとgrantをatomic commitする。materialization receiptのcontent identityがsealed payloadと一致して初めてTLCへsubjectを渡す。freeze前copy、別worktree grant、残fixture開示を拒否する。

専用integration worktreeはhealthy baseline SHAをbaseとして新規作成し、まずArm T freeze commitのowned-path diffをexact hashでoverlayし、次にU2 sealed #1252 patchをallowed hunk検証付きで適用する。各step後にtree hashを記録し、conflict、allowlist外変更、base driftを拒否する。最終treeをmainへmergeしない専用composition commitとして固定し、`CompositionHead`はbase SHA、Arm T freeze SHA / diff identity、#1252 injection SHA / patch identity、適用順、intermediate / resulting tree hashes、resulting commit SHAを持つ。local 2 runとCIはこのresulting commitだけをcheckoutする。

## Deterministic execution and evidence

同じCompositionHead ID / resulting commit SHA、Arm T freeze SHA、model / jar / JDK identities、#1252 injection SHA、subject identity、TLC profile、workers=1、deadline=120秒で2回serial実行する。各run起動直前にdedicated worktreeの`HEAD == resultingCommitSha`とtree hash一致、clean statusを再検証し、command / process receiptへCompositionHead ID、HEAD、tree hashを記録する。各runは別run numberとevidence bundleを持つが、入力manifest identityは同じである。

U4 parserがnamed `InvalidTimestampRejected` invariant violationと完全traceを返し、U3が両runを`DETECTED`としてatomic evidenceへ保存することを要求する。2 bundleのverdict、counterexample identity、model / subject / tool identitiesが一致しなければ非決定failureとする。exit codeだけ、既存regression failure、partial traceを検出根拠にしない。`NOT_DETECTED`、`HARNESS_ERROR`、timeout、store / chain errorはいずれもpassへ昇格させない。

raw evidence indexは各runのcomposition / HEAD / tree-bound process receipt、argv、stdout / stderr、exit、duration、CellResult、bundle / runner-store ledger identitiesを参照する。CI前の`SkeletonExecutionManifest`はcomposition head、freeze event、disclosure event / materialization receipt、fixture branch / injection SHA、local 2 evidence bundles / semantic tuple、CI command、expected CI attempt keys `{1,2}`、artifact schema identityをcontent-addressed linkで結ぶ。このidentityはCI receiptを含まない。

## CI receipt and state transition

CI jobはmachine-readable `SkeletonCiArtifact`を生成する。artifactはschema version、execution manifest identity、CompositionHead ID / resulting commit SHA、input identity、exactly two attempt rowsを持つ。各rowはrunNo、`DETECTED` verdict、counterexample identity、CellResult identity、bundle / raw stream identities、command / process receipt identityを必須とする。validatorはexpected attempt keys `{1,2}`とのbijection、row identity重複0件、両counterexample一致、composition / input / semantic tupleのlocal manifest一致、全bundle再hashを検査する。

CI receiptは専用composition resulting commitをcheckoutした既存CI実験jobについて、provider run ID / URL、workflow / job name、head SHA、command identity、exit、started / finished、artifact identity、検証済みartifact proof、`SkeletonExecutionManifest` identityを必須とする。local successをCI successへ代用せず、別SHA / rerun / artifact欠損・row mismatchを拒否する。production required checkや新workflowは追加しない。CI検証後のfinal `SkeletonSummary`だけがexecution manifestとCI receiptを含むため、identityは循環しない。

pass判定は、2回の決定論的`DETECTED`、全raw evidence、valid CI receipt、全trace linkが揃う場合だけ行う。U1 `record-skeleton` handlerはexpected ledger head、final summary identity、outcomeを含むcanonical payloadからtransaction IDを生成し、atomic appendする。同じtransaction ID / bytesの再送は既commit eventを再照合して同じreceiptへ収束し、head競合は最新ledger fold後に再評価する。

append応答喪失またはcommit不明時は`findTransaction(transactionId)`で既commit outcomeを照合するまで別outcomeを生成しない。pass transactionがcommit済みならpass receiptを返し、未commitが確認できた場合だけ同じpass transactionを再送する。transport failure、head conflict、lookup / corruption errorは全て外部`SkeletonCommitError`であり、domain failure eventをmintしない。pass / fail両eventの二重commitを禁止し、precondition / disclosure / verdict / determinism / evidence / CI / traceの確定的不成立だけがfailure transactionを生成できる。

failure後はstateをterminal `SKELETON_FAILED`へfoldし、Arm S start、残fixture reveal、promotion、benchmark commandが0件であることをledger suffix検査で証明する。pass後も本UnitはArm S startやfan-outを自動実行せず、次command permissionを返すだけとする。

## Failure flowとtest境界

precondition、reveal、execution、evidence、determinism、CI、transition errorはclosed discriminatorとartifact identityを保持する。cleanupはtemporary materializationだけを対象とし、sealed record、raw evidence、ledger eventを削除しない。

integration testsはwrong freeze / injection SHA、overlay順序 / resulting tree drift、pre-freeze reveal、別worktree grant、残fixture開示、1回目/2回目verdict・counterexample drift、NOT_DETECTED / HARNESS_ERROR、partial evidence、CI composition head / artifact mismatch、CI-summary identity循環禁止、pass append応答喪失 / transaction lookup / 再送、pass-fail二重outcome拒否、failure後Arm S / promotion commandを検証する。U3/U4未READYの間はtest planとして保持し、完成を主張しない。

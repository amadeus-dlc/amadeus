# Unit of Work — ハーネス横断 live E2E

入力参照: `components`、`component-methods`、`services`、`component-dependency`、`decisions`、`requirements`。`stories`は本scopeで生成されていないため、FR-1〜FR-11をstory相当のtrace正本とする。

## Decomposition Contract

Application Design C1〜C9のcomponent境界は維持しつつ、最初の1 Unitだけで共通production kernelからCodex transport、実journey、cleanup barrier、ledger commit、matrixまでを通すvertical walking skeletonへ再分割する。これは`project.md`のself-feature walking-skeleton要件と、`team.md`の1 Unit / 1 Bolt / 1 PR規律を同時に満たすための変更である。

| ID | Canonical name | kind | 複雑度 | 直接依存 | 主trace |
|---|---|---|---|---|---|
| U01 | `codex-live-walking-skeleton` | `library` | L | なし | FR-1〜7, FR-10/11 |
| U02 | `live-e2e-common-hardening` | `library` | M | U01 | FR-1〜6, FR-10/11 |
| U03 | `claude-print-live` | `library` | M | U01, U02 | FR-1, FR-3〜7, FR-10/11 |
| U04 | `claude-sdk-live` | `library` | M | U01, U02, U03 | FR-1, FR-3〜7, FR-10/11 |
| U05 | `claude-tui-live` | `library` | M | U01, U02, U03 | FR-1, FR-3〜7, FR-10/11 |
| U06 | `kimi-print-live` | `library` | M | U01, U02, U04, U05 | FR-1, FR-3〜6, FR-8, FR-10/11 |
| U07 | `kiro-acp-live` | `library` | M | U01, U02, U04, U05 | FR-1, FR-3〜6, FR-8, FR-10/11 |
| U08 | `kiro-tui-live` | `library` | M | U01, U02, U04, U05 | FR-1, FR-3〜6, FR-8, FR-10/11 |
| U09 | `kiro-ide-live` | `library` | L | U01, U02, U04, U05 | FR-1, FR-3〜6, FR-8, FR-10/11 |
| U10 | `cursor-live-closure` | `library` | M | U01, U02, U06, U07, U08, U09 | FR-1, FR-3〜6, FR-9〜11 |
| U11 | `opencode-live-closure` | `library` | M | U01, U02, U06, U07, U08, U09 | FR-1, FR-3〜6, FR-9〜11 |

全Unitの主deliverableはstandalone runtimeを持たずBun test processからimportされる再利用コードなので、canonical `kind`は`library`で統一する。Cursor/OpenCodeが実測でunsupportedの場合も空成果物にはせず、再実行可能なprobe/test、typed registry entry、matrix verification、evidence付きIssueを生成する。

## Walking-Skeleton Unit

### U01 `codex-live-walking-skeleton`

- **目的:** 1 Unitだけでpolicy判定から実Codex journey、cleanup barrier、sanitized receipt、ledger commit、generated matrixまでを通し、全integration pointを最初の人間ゲートで検証する。
- **所有:** C1 `LiveCode`と結果contract、C2 gate precedence/child env allow-list、C3 `LiveAdapter` port、C4 transport非依存runner/executorを含む最小production lifecycle、C7 typed registry、C8 owner-stamped JSONL ledger、C9 projectorのpublic contractとproduction実装。C5はCodex adapter、C6はCodex journey specificationを所有する。
- **deliverable:** `tests/harness/live-e2e/{contract,policy,adapter,lifecycle,registry,ledger,projector,journey}.ts`相当、改訂した`tests/harness/codex-exec-live.ts`、Codex用baseline unit/integration/live tests、`docs/harness-engineering/live-e2e.md`の運用runbookとgenerated matrix block。
- **完了:** `GITHUB_ACTIONS=true` hard deny、strict opt-in、scratch/env isolation、Codex preflight/execute/assertion後の`cleanup-barrier-closed → ledger-appended|already-present → closure-committed`、matrix projectionを1本の実journeyでgreenにする。cleanup/leak failureはC8を呼ばない`LiveRunError.cleanup-barrier-failed`とし、ledger失敗はgreenを返さない。sanitized receiptにadapter/version/SHA/time/resultを残す。runbookは`dist/<harness>`、driver、installer変更Intentの完了前に該当journeyをローカル実行し、そのreceiptを台帳へ残す条件・コマンド・opt-in・確認方法を文書化し、doc contract testで必須節とregistry ID参照を検証する。
- **境界外:** Codex以外のconcrete adapter、網羅的property/failure-injection suite、release/publish/CI live job。
- **制約:** 最小とはcontract省略ではなく、1 transportでC1〜C9のpublic boundaryを完成させる意味である。後続Unitがpublic contractを再定義しなくても接続できる形に固定する。
- **deployment:** Bun test processと短命record projectorへembedded。

## Common Hardening Unit

### U02 `live-e2e-common-hardening`

- **目的:** U01で確立したpublic contractを変えずに、共通基盤をadversarial verificationで固める。
- **所有:** fake adapter/fake journey、negative/property tests、secret/source-pointer leak corpus、timeout/abort/retry/cleanup fault injection、ledger crash/stale-lock競合fixture、matrix drift fixture。
- **deliverable:** `tests/harness/live-e2e/testing/`配下のtransport非依存reusable test kitとfailure-injection suite。U01 production file/APIは変更せず、契約違反を再現した場合はU01 ownerへBLOCKERとして返す。
- **完了:** GHA/opt-in/env/secret/timeout/cleanup/ledger failureを注入すると期待どおりredになり、正常fake journeyはgreenになる。cleanup/leak failureではC8 appendが0回で`cleanup-barrier-failed`となり、barrier成功後のledger永続化失敗では`closure-committed`へ遷移せず、いずれもgreen扱いしない。
- **境界外:** concrete CLI/SDK/TUI/ACP/CDPの起動詳細、transport固有prompt/anchor/assertion。
- **deployment:** Bun test processへembedded。

## Transport-wide Completion Contract

U03〜U11は各Unit固有の完了条件に加えて、FR-1の同一contractを必ず満たす。各adapterは専用opt-in変数をtyped registryで宣言し、値が厳密に`"1"`のときだけ起動可能とする。`GITHUB_ACTIONS=true`はopt-inより優先してdenyし、binary/version/auth/capability probeとprocess起動の両方が0回であるnegative testを持つ。実行後はU01の共通runnerがcleanup barrierを閉じた場合だけC8を呼び、append成功または同一receiptのalready-present後だけ`closure-committed`を返す。U02のtest kitを直接importしてこのcontractを検証し、U01のpolicy/adapter/lifecycle production APIも直接importする。

Issue #1717の段階展開をmachine-readable DAGでも保証するため、Phase 2のU06〜U09はU04/U05がcleanup barrierとledger commitを経て`closure-committed`になったPhase 1完了証跡を入力とし、Phase 3のU10/U11はU06〜U09が同じ契約で確定したPhase 2完了証跡を入力とする。これは架空のコードimportではなく、後続phaseのcapability判断を前phaseの検証結果へ結び付けるartifact/evidence dependencyである。

## Claude Transport Units

### U03 `claude-print-live`

- **目的:** `claude -p --setting-sources project`のheadless経路を共通portへ接続する。
- **所有:** Claude print C5/C6、`AMADEUS_CLAUDE_PRINT_LIVE`、binary/version/auth preflight、project-only settings、result normalization、Claude family config seam。
- **完了:** 暗黙settings混入のnegative testと実Claude print journeyがgreenになり、ledger receiptを生成する。
- **deployment:** Bun test processへembedded。

### U04 `claude-sdk-live`

- **目的:** 既存Agent SDK driverをU03のClaude family seamと共通portへ接続する。
- **所有:** Claude SDK C5/C6、専用opt-in、SDK auth/config/env、AbortController/partial result normalization、構造化anchor/assertion。
- **完了:** fake contract greenと、接続可能ならminimal live green。不成立なら阻害要因・推奨seam・受入条件を持つ後続Issueを生成する。
- **deployment:** Bun test processへembedded。

### U05 `claude-tui-live`

- **目的:** 既存tmux TUI driverを共通portへ接続し、runnerの暗黙opt-inを廃止する。
- **所有:** Claude TUI C5/C6、`AMADEUS_TUI_LIVE`、private tmux socket、project settings、exit/timeout normalization、sanitized debug retention。
- **完了:** `--all/--release --debug`による自動`=1`設定を削除し、fake contractと接続可能なminimal liveをgreenにする。不成立時はevidence付きIssueを生成する。
- **deployment:** Bun test processへembedded。

## Kimi / Kiro Transport Units

### U06 `kimi-print-live`

- **目的:** 既存Kimi print driverを共通portへ接続し、実greenを得る。
- **所有:** Kimi print C5/C6、専用opt-in、binary/version/auth/config preflight、`kimi -p` normalization、credential-safe isolation。
- **完了:** fake/negative testsと実Kimi journeyがgreenになり、ledger receiptを生成する。
- **入力証跡:** U04/U05までのPhase 1 capability matrixとledger closureが確定していること。
- **deployment:** Bun test processへembedded。

### U07 `kiro-acp-live`

- **目的:** Kiro ACPのcancel/tool-output終了モデルをadapter内へ閉じ込める。
- **所有:** Kiro ACP C5/C6、専用opt-in、`kiro-cli acp` preflight、ACP event/result normalization、timeout cancel cleanup。
- **完了:** fake ACP contractと、接続可能ならminimal liveがgreen。不成立ならevidence付きIssueを生成する。
- **入力証跡:** U04/U05までのPhase 1 capability matrixとledger closureが確定していること。
- **deployment:** Bun test processへembedded。

### U08 `kiro-tui-live`

- **目的:** Kiro tmux TUI driverを共通portへ接続する。
- **所有:** Kiro TUI C5/C6、専用opt-in、private tmux/session、readiness/exit normalization、credential-safe cleanup。
- **完了:** fake TUI contractと、接続可能ならminimal liveがgreen。不成立ならevidence付きIssueを生成する。
- **入力証跡:** U04/U05までのPhase 1 capability matrixとledger closureが確定していること。
- **deployment:** Bun test processへembedded。

### U09 `kiro-ide-live`

- **目的:** Kiro IDE/CDPのmachine-authとGUI lifecycleをadapter内へ隔離する。
- **所有:** Kiro IDE C5/C6、専用opt-in、generated scratch profile、CDP readiness/anchor/assertion、app終了とdebug保持。
- **完了:** fake/profile contractと、接続可能ならminimal liveがgreen。不成立ならevidence付きIssueを生成する。
- **入力証跡:** U04/U05までのPhase 1 capability matrixとledger closureが確定していること。
- **deployment:** Bun test processへembedded。

## Capability Closure Units

### U10 `cursor-live-closure`

- **目的:** Cursorの非対話transport、設定隔離、認証、決定的終了条件を実測で閉じる。
- **所有:** capability probe、成立時のCursor C5/C6・専用opt-in・fake integration・minimal live、非成立時のfollow-up Issueとregistry/matrix更新。
- **完了:** adapter+green receipt、または再実行可能probe/test・`unsupported` registry entry・Issue body/link・matrix verificationを生成する。unsupported時にadapter export/fileを生成しない。
- **入力証跡:** U06〜U09の全transportについてPhase 2 capability matrixとledger closureが確定していること。
- **deployment:** Bun test processへembedded。

### U11 `opencode-live-closure`

- **目的:** OpenCodeの非対話transport、plugin接続、設定隔離、認証、決定的終了条件を実測で閉じる。
- **所有:** capability probe、成立時のOpenCode C5/C6・専用opt-in・fake integration・minimal live、非成立時のfollow-up Issueとregistry/matrix更新。
- **完了:** adapter+green receipt、または再実行可能probe/test・`unsupported` registry entry・Issue body/link・matrix verificationを生成する。unsupported時にadapter export/fileを生成しない。
- **入力証跡:** U06〜U09の全transportについてPhase 2 capability matrixとledger closureが確定していること。
- **deployment:** Bun test processへembedded。

## Component Ownership Map

| Application Design component | Unit owner | Ownership boundary |
|---|---|---|
| C1 Contract / C2 Policy / C3 Adapter Port / C4 Lifecycle | U01 | public contract、production kernel、cleanup barrierからC8 appendとclosure commitまでの編成。U02はtest fixtureだけを所有しproduction file/APIを変更しない |
| C7 Registry / C8 Ledger / C9 Projector | U01 | typed正本、atomic append、generated projection |
| C4 transport非依存runner/executor | U01 | lifecycle編成とproduction executor |
| C5 Codex adapter + C6 Codex journey | U01 | 最初のvertical end-to-end slice |
| 共通adversarial fixture/test kit | U02 | `tests/harness/live-e2e/testing/`のfake journeyとfailure injection。production ownershipなし |
| C5/C6 Claude print〜OpenCode | U03〜U11の対応Unit | transport固有preflight、execute、prompt、anchor、assertion、cleanup |

U02はU01のAPIを消費する独立test libraryであり、どの実transportにも依存しない。各transport UnitはU01のC3 adapter port、C4 production runner/executor、C6 journey specification contractとU02のtest kitへ直接依存し、共通policy/lifecycle/ledgerを複製しない。さらにU06〜U09はU04/U05のPhase 1完了証跡、U10/U11はU06〜U09のPhase 2完了証跡を消費する。

## Construction Applicability

全Unitは`library`なのでFunctional Design、NFR Design、Code Generation、Build and Testの対象になる。Infrastructure DesignはscopeでSKIPされ、新しいAWS/network/database資源は追加しない。Stage 2.8はこのtopologyを消費してBoltを計画する。Issue #1717のPhase順序は検証証跡の実依存として本DAGに含まれるため、Stage 2.8はphaseを跨いで並行化しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:34:32Z
- **Iteration:** 1
- **Scope decision:** none

11 UnitのDAGはcycle-freeで意図した6 batchとなり、Phase証跡依存、FR/NFR trace、walking skeletonも概ね整合している。ただしC4/C6のownershipがApplication DesignとUnits Generationで矛盾する。

### Findings

- BLOCKER | unit-of-work.mdはU01についてC6 transport非依存journey executorを所有すると定義しているが、Application DesignではC4が共通Lifecycle Runner、C6がJourney Specificationsである。共通executorの配置と依存方向が実装者にとって一意でないため、U01のownershipをC4＝transport非依存runner/executor、C6＝Codex journey specificationへ修正する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:36:29Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1のC4/C6 ownership不整合は解消された。11 Unit DAGはcycle-freeで意図した6 batchとなり、Phase証跡依存、FR/NFR/component trace、1 Unit / 1 Bolt / 1 PR walking skeletonは整合している。

### Findings

- None

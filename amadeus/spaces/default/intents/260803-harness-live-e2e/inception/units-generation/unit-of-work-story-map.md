# Unit of Work Story Map — ハーネス横断 live E2E

入力参照: `components`、`component-methods`、`services`、`component-dependency`、`decisions`、`requirements`。`stories`は本scopeで生成されていないため、user storyを捏造せずFR-1〜FR-11を実装sliceのtrace正本として用いる。

## Requirement-to-Unit Map

| Requirement | Implementing units | Coverage anchor |
|---|---|---|
| FR-1 共通起動policy | U01, U02, U03〜U11 | GHA hard deny、adapter別strict opt-in、probe/process起動ゼロの共通negative contract |
| FR-2 canonical result | U01, U02, U03〜U11 | closed `LiveCode`、fault injection、transport normalization |
| FR-3 preflight/capability | U01, U03〜U11 | typed registry、binary/version/auth/capability probe |
| FR-4 auth/config/env隔離 | U01, U02, U03〜U11 | allow-list env、scratch、source pointer/secret negative test |
| FR-5 lifecycle/cleanup | U01, U02, U03〜U11 | production lifecycle、cleanup barrier fault injection、失敗時C8 append 0回、transport cleanup宣言 |
| FR-6 timeout/anchor/retry/serial | U01, U02, U03〜U11 | executor、fault injection、transport固有anchor/assertion |
| FR-7 Codex/Claude Phase 1 | U01, U03, U04, U05 | Codex/Claude print実green、SDK/TUI greenまたはIssue |
| FR-8 Kimi/Kiro Phase 2 | U06, U07, U08, U09 | Kimi実green、Kiro各transport greenまたはIssue |
| FR-9 Cursor/OpenCode Phase 3 | U10, U11 | supportedならadapter+green、unsupportedならprobe/test+Issue |
| FR-10 contract test/落ちる実証 | U01, U02, U03〜U11 | baseline integration、negative/PBT/failure injection、adapter contract |
| FR-11 matrix/ledger/trigger | U01, U02, U03〜U11 | typed registry、barrier成功後だけのatomic ledger、`closure-committed`後だけのgenerated matrix、runbook、変更面→adapter triggerのdoc contract test |

## NFR and Cross-cutting Map

| NFR | Primary owner | Consuming units | Verification |
|---|---|---|---|
| NFR-1 Safety | U01/U02 | U03〜U11 | hard deny、env allow-list、credential deletion、cleanup failure時C8未記録、stale-lock回復 |
| NFR-2 Diagnostics/Reliability | U01/U02 | U03〜U11 | closed code、sanitized evidence、cleanup barrierとledger commitを分離した終端状態、fault classification |
| NFR-3 Time/Cost | U01/U02 | U03〜U11 | short prompt、explicit timeout、serial、retry default 0 |
| NFR-4 Maintainability | U01 | U02〜U11 | deep production kernel、thin adapters、typed registry |
| NFR-5 Testability/Distribution | U01/U02 | U03〜U11 | fake executable、violation injection、generated matrix drift |
| NFR-6 Compatibility | U01 | U03〜U11 | measured version、capability truth、unsupported follow-up contract |

横断関心はU01のproduction正本とU02のadversarial verificationへ分離し、各transport Unitが同じacceptance contractを消費する。U02はpublic contractを再定義せず、安全性をtransportごとの任意実装にしない。

## Phase Closure Evidence Map

| Barrier | Producers | Consumers | Required evidence |
|---|---|---|---|
| Phase 1 closure | U04, U05 | U06〜U09 | U01/U03のmust-green receiptに加え、Claude SDK/TUIそれぞれのgreen receiptまたは受入条件付きIssue、typed registry、ledger、generated matrixが整合する |
| Phase 2 closure | U06〜U09 | U10, U11 | Kimiのmust-green receiptに加え、Kiro ACP/TUI/IDEそれぞれのgreen receiptまたは受入条件付きIssue、typed registry、ledger、generated matrixが整合する |

後続Unitは前Phaseの実装コードへ架空のimportを持たず、この完了証跡をcapability probeの前提入力として消費する。これによりIssue #1717のPhase 1→2→3をengineのtopological batchへ保持する。

## Per-Unit Slice Map

`stories`がないため、各Unit内では次のverification sliceをUnit内Red→Green順序として用いる。Unit間ではIssue #1717のPhase証跡依存だけを定め、Phase内の経済的順序はDelivery Planningへ委ねる。

| Unit | Slice 1 | Slice 2 | Slice 3 | Terminal evidence |
|---|---|---|---|---|
| U01 | baseline contract/policy/lifecycleをred | Codex adapter/journey接続 | ledger/matrix/runbookを含むend-to-end green | real Codex green receipt + runbook contract green |
| U02 | GHA/env/secret/timeout/cleanup/ledger failureを注入 | fake adapter/journeyをgreen | property/drift/crash casesをgreen | offline hardening suite green + injected red evidence |
| U03 | Claude print isolationをred | headless adapter + family seam | minimal journey | real green receipt |
| U04 | SDK env/result contractをred | existing driver wrap | minimal journey | green receiptまたはfollow-up Issue + Phase 1 closure入力 |
| U05 | implicit opt-in regressionをred | TUI adapter + cleanup | minimal journey | green receiptまたはfollow-up Issue + Phase 1 closure入力 |
| U06 | Phase 1 closureを検証後、Kimi credential/result contractをred | print adapter接続 | minimal journey | real green receipt + Phase 2 closure入力 |
| U07 | Phase 1 closureを検証後、ACP cancel/timeout contractをred | ACP adapter接続 | minimal journey | green receiptまたはfollow-up Issue + Phase 2 closure入力 |
| U08 | Phase 1 closureを検証後、TUI session/cleanup contractをred | Kiro TUI adapter接続 | minimal journey | green receiptまたはfollow-up Issue + Phase 2 closure入力 |
| U09 | Phase 1 closureを検証後、IDE profile/CDP cleanupをred | IDE adapter接続 | minimal journey | green receiptまたはfollow-up Issue + Phase 2 closure入力 |
| U10 | Phase 2 closureを検証後、Cursor capability probe/test | supportedならC5/C6、unsupportedならregistry+Issue | liveまたはunsupported matrix検証 | green receiptまたはevidence Issue。空成果物禁止 |
| U11 | Phase 2 closureを検証後、OpenCode capability probe/test | supportedならC5/C6、unsupportedならregistry+Issue | liveまたはunsupported matrix検証 | green receiptまたはevidence Issue。空成果物禁止 |

## Acceptance Coverage

- FR-1〜FR-11はすべて1つ以上のUnitへ割当済みで、unassigned requirementはない。
- U03〜U11は専用opt-in、GHA precedence、probe/process起動ゼロのFR-1共通受入条件を持ち、U01 production APIとU02 test kitへ直接依存する。
- U01〜U11はすべてFR/NFR、test slice、terminal evidenceを持ち、orphan Unitはない。
- Must greenのCodex、Claude print、KimiはU01/U03/U06でalternative completionを許さない。
- Claude SDK/TUI、Kiro各transport、Cursor/OpenCodeはgreenまたはevidence付き後続Issueの二択で閉じ、silent skip/dormant stub/TBDを許さない。
- Application Design C1〜C9はU01または対応transport Unitへ割当済みで、U02は独立したverification ownershipを持つ。新AWS resource、daemon、database、CI live jobは追加しない。
- U01単独でC1〜C9とCodex C5/C6のproduction sliceを通すため、walking-skeleton Boltを複数Unitへ束ねる必要がない。
- U04/U05のPhase 1 closure evidenceをU06〜U09が消費し、U06〜U09のPhase 2 closure evidenceをU10/U11が消費するため、Phase間のsilent overlapを許さない。
- FR-11 AC3はU01が`docs/harness-engineering/live-e2e.md`の運用runbookとdoc contract testを所有し、`dist/<harness>`・driver・installer変更面から該当registry adapter ID、実行コマンド、opt-in、ledger receipt確認へtraceする。
- U10/U11のunsupported branchもprobe/test、typed registry entry、Issue、matrix verificationを生成し、Code Generation/Build and Testで検証可能なnon-empty completionになる。

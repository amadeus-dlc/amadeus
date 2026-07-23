# Performance Design — lifecycle-transaction

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`を、単一lock callback内の固定数O(n)処理へ写像する。

## Critical path

- preflightはjournal read/recovery、registry/audit/cursor整合確認を一度ずつ行い、callbackへ検証済みcontextを渡す。
- preflight audit passは全shardを一度読み、最新resolution event、未消費HUMAN_TURN候補、既存lifecycle eventの消費identity、operationId一致eventを同じO(n)集約器で算出する。
- journal recoveryまたは新規commandは、commit後にimmutable payloadと最終件数を確認する第二のO(n) audit passを行う。registryはprecondition時とfinal verification時の最大2回strict readし、cursor/journalは各step前後の固定回数だけ読む。
- したがって500 ms budgetはaudit最大2 full passes、registry最大2 full passes、cursor/journal固定I/Oを含む。stepごとの追加全再走査を禁止する。
- cache、daemon、database、queueは追加せず、操作ごとに最新bytesを読む。

## Budgets

- 10,000 audit rows・10,000 registry entriesでlock取得後のarchive/unarchive p95を500 ms以下とする。
- `FFF`からaudit、registry、cursorを全て進めるrecovery p95を750 ms以下とする。
- warm-up 10回後、100 independent child processを実行し、全correctness成功後にnearest-rank p95を算出する。
- peak incremental RSSはnoop childとの差分100組のp95を96 MiB以下とする。

## Measurement isolation

- lock待機時間は別測定としtransaction budgetへ含めない。
- fixture SHA-256、Git SHA、Bun version、runner image、CPU modelを保存し、標準4 vCPU/16 GiB class不一致では合否を出さない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T09:32:18Z
- **Iteration:** 1
- **Scope decision:** none

opaque lock authority、journal topology、forward-only recovery、audit payload照合、性能・RSS・observabilityの主要設計は上流NFRと概ね整合している。しかし、recovery state machineがjournalなしのread-only preflightでもtransactionを生成し得る形になっており、journal durability、8-process成功fixture、commit済みmarker未更新crashの検証にも実装上の曖昧さが残る。

### Findings

- BLOCKER — no journal preflightとcommand FFF作成を分離する。
- MAJOR — JournalStore crash durability port contractを定義する。
- MAJOR — 8-process fixtureのintent/turn/期待結果を固定する。
- MAJOR — durable commit後marker失敗subcaseを定義する。
- MAJOR — audit scan passと500ms budgetのI/O回数を確定する。
- MINOR — operation identity/clock ownerをinventoryへ追加する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T09:33:58Z
- **Iteration:** 2
- **Scope decision:** none

前回6指摘は解消された。read-only preflight/recoveryと新規command開始が分離され、JournalStoreには各flag更新・削除を含むcrash-durable commit contractが定義された。8-process fixture、failure subcase、pass budget、identity/clock ownershipも閉じた。

### Findings

- RESOLVED — no-journal preflightとcommand FFF作成を分離。
- RESOLVED — JournalStore durability contract確定。
- RESOLVED — 8-process fixtures確定。
- RESOLVED — durable commit subcases確定。
- RESOLVED — audit/registry pass budget確定。
- RESOLVED — identity/clock owner確定。

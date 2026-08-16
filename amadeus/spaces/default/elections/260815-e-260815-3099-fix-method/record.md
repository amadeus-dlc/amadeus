# Election Record
Election ID: E-260815-3099-FIX-METHOD
Run ID: run-1
Lifecycle: tallied
Established questions: 1
Hold questions: 0
Held question IDs: none

## Question q-3099-method: Issue #3099: units-generation EXECUTE スコープで per-unit run-stage 経路により完走した Construction が、build-and-test の per-unit consume fanout で producer-outcome-pending となり構造的に到達不能になる(fanout の outcome 母集団が swarm pool イベント UNIT_POOL_EVENT_SET_COMMITTED のみ由来のため)。修正方式を選定する。制約: batch 所属フィルタ(orchestrate.ts:2461-2463)の意味論保存 / swarm 経路の無退行 / 監査 append-only(pool 捏造禁止)/ 最小修正(RFC-0001 実装に踏み込まない)。
Established: C: emit 追加 — per-unit run-stage の unit 完了時に engine 自身が unit outcome 監査イベントを記録し、fanout の既存読み口(pool events)で読めるようにする (choice 3)
Choice counts:
- Choice 1 A: 読み口統一 — readPerUnitConsumePopulation の outcome 源を canonical projection(normalizeConstructionOutcomeAudit + projectConstructionOutcomes、5 イベント受理)へ寄せ、fanout だけが 1 イベントしか見ない非対称を解消する: 0
- Choice 2 B: dispatch 是正 — 幅1 batch でも swarm 経路(invoke-swarm)へ回るよう plan-integrity guard / dispatch 分岐を是正し、pool イベントが常に emit される構造にする: 0
- Choice 3 C: emit 追加 — per-unit run-stage の unit 完了時に engine 自身が unit outcome 監査イベントを記録し、fanout の既存読み口(pool events)で読めるようにする: 2
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x1 3x1 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-15T08:45:13Z] GoA 2: C は既存の pool writer(amadeus-unit-pool-runtime.ts:143-168 createAuditUnitPoolRepository、orchestrate.ts:6586 に既存の 2 番目の呼出点あり)を再利用して unit-settled terminal を commit する形に限定すべきで、新規監査イベント型を mint する形(event-registry regen + CONSTRUCTION_AUDIT_EVENTS 拡張 + fanout 読み口変更が連鎖し FR-6 台帳同期の面が増える)は避けること。commit の時点は engine が unit の covered(unitCovered)+ reviewer verdict を観測した瞬間に限り、過去時刻の後付け生成(pool 捏造 / append-only 違反)を行わない。idempotencyKey は (batchId, unitId, attempt) で固定し、`next` の再実行で terminal が重複しない(producer-outcome-ambiguous に落ちない)ことをテストで固定する。outcome=succeeded の根拠が coverage 述語 + reviewer verdict で足りないと実装時に判断される場合は、その場で緩めず再裁定へ戻すこと。なお A(読み口統一)は本欠陥の修正としては不成立だが、2 読み口の非対称自体は独立の技術負債として別 intent で解消する価値がある。
- Reservation subagent-2 [original:2026-08-15T08:45:44Z] GoA 3: C を採るが実装形は3点で縛る。(1) pool の単一 writer 契約(amadeus-unit-pool-runtime.ts:143-168 が UNIT_POOL_EVENT_SET_COMMITTED の唯一の変異源)を壊さないこと — per-unit 経路から pool event set を合成する形は codekb architecture.md:5443 が指摘する所有境界の希薄化かつ『pool 捏造禁止』制約に触れるため、amadeus-execution-lifecycle.ts:336-389 の event-set リポジトリ様式(digest 束縛・idempotencyKey・append-only・重複 eventSetId の無視)を写した別イベントとして発行し、fanout 側の読み口をそのイベントへ拡張する(A の読み口統一を C の内側で最小限だけ使う)。(2) 発行は冪等でなければならない — emitPerUnitRunStage は next のたびに再入するため、intent+stage+unit+batch を鍵に既存イベントを読んでから発行し、重複が producer-outcome-ambiguous(amadeus-per-unit-consume-fanout.ts:207-212)を誘発しないこと。発行点は unit の coverage 成立境界(unitCovered が true へ遷移する時点)に固定する。(3) 発行イベントは数値 batch id を載せ、readPerUnitConsumePopulation:2459-2463 の currentUnits 所属フィルタを逐語のまま残すこと(solo:<n>:<unit> 形式の非数値 id を持ち込むと batch join が退化する)。加えて FR-6 のとおり event registry(packages/framework/core/otel/event-registry.ts, amadeus-audit.ts の canonical list)、model-map 実装ハッシュピン、coverage-registry の resync を同一変更へ含める。
Late responses:
- None
Run lineage: run-1

## Timeline
- tallied at=2026-08-15T08:46:45Z run=run-1
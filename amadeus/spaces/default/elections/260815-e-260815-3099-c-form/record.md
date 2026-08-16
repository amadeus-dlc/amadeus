# Election Record
Election ID: E-260815-3099-C-FORM
Run ID: run-1
Lifecycle: tallied
Established questions: 1
Hold questions: 0
Held question IDs: none

## Question q-3099-c-form: E-260815-3099-FIX-METHOD で方式 C(per-unit run-stage の unit 完了時に engine が unit outcome を監査へ記録し fanout が読めるようにする)が 2-0 成立したが、両票の留保が実装形で矛盾した。実装形を選定する。共通制約(両票合意分・拘束): 発行は冪等(intent+stage+unit+batch 鍵、next 再入で重複せず producer-outcome-ambiguous を誘発しない)/ 発行点は unit の coverage 成立境界(unitCovered true 遷移時)/ 過去時刻の後付け生成禁止(append-only)/ readPerUnitConsumePopulation:2459-2463 の currentUnits 所属フィルタ(数値 batch id join)を逐語保存 / FR-6 台帳同期。
Established: C2: 別イベント新設 — event-set リポジトリ様式(digest 束縛・idempotencyKey・重複無視)を写した新監査イベントを per-unit 経路が発行し、readPerUnitConsumePopulation の読み口をそのイベントへ最小拡張する。pool の単一 writer 契約は不変。トレードオフ: event registry regen・読み口変更・台帳同期面が増える (choice 2)
Choice counts:
- Choice 1 C1: 既存 pool writer 再利用 — createAuditUnitPoolRepository(amadeus-unit-pool-runtime.ts:143-168)を per-unit 経路からも呼び、UNIT_POOL_EVENT_SET_COMMITTED として unit-settled terminal を commit する。新規イベント型なし(event-registry / CONSTRUCTION_AUDIT_EVENTS / fanout 読み口は不変)。トレードオフ: pool の『swarm ライフサイクル単一 writer』という現行の所有境界コメント(amadeus-audit.ts:198-203)の意味が変わる: 0
- Choice 2 C2: 別イベント新設 — event-set リポジトリ様式(digest 束縛・idempotencyKey・重複無視)を写した新監査イベントを per-unit 経路が発行し、readPerUnitConsumePopulation の読み口をそのイベントへ最小拡張する。pool の単一 writer 契約は不変。トレードオフ: event registry regen・読み口変更・台帳同期面が増える: 2
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-15T08:50:21Z] GoA 2: C2 採用の条件: (1) FR-6 台帳同期面を同一変更で全列挙・実行する — packages/framework/core/otel/event-registry.ts:951-960 の様式に沿う新エントリ / amadeus-audit.ts の CANONICAL_AUDIT_EVENTS + EVENT_HEADINGS / knowledge/amadeus-shared/audit-format.md の Event Registry 表と見出しの件数 / tests/unit/t28-audit-event-sync.test.ts の pinned baseline(同ファイルが『Bump WITH the source when an event is added』と明記する設計済み拡張点)/ docs/reference/12-state-machine.md と ja ミラー / tests/.coverage-registry.json regen。(2) 新イベントを pool の batchId 名前空間へ fold させない(readUnitPoolEventSetsFromAudit の入力集合を汚さない別イベント型として読む)。(3) readPerUnitConsumePopulation:2455-2470 の拡張は、currentUnits 所属フィルタ(数値 batch id join)を逐語保存したうえで、同一 unit に pool 由来 terminal と新イベント由来 outcome が両立した場合の precedence を定義して 1 行に畳む — 素朴に push を並べると amadeus-per-unit-consume-fanout.ts:207-211 の outcomeRows.get(unit).length > 1 判定で producer-outcome-ambiguous を誘発し、共通制約に反する。
- Reservation subagent-2 [original:2026-08-15T08:51:12Z] GoA 2: C2 は読み口に unit outcome の供給源を2つ持ち込む。amadeus-per-unit-consume-fanout.ts:207-212 は同一 unit に outcome 行が2行以上あると producer-outcome-ambiguous を throw するため、swarm の pool terminal と per-unit settle イベントが同一 unit に併存する断面(per-unit 反復の途中で autonomy が flip し swarm が同 batch を走らせる等)で共通制約『producer-outcome-ambiguous を誘発しない』に構造的に抵触する。実装は readPerUnitConsumePopulation:2459-2463 の既存ループを逐語保存したうえで、新イベント由来の outcome を『pool terminal が既に存在する unit には積まない』(pool 優先の単一化)形で追加し、その de-dup を落ちる実証付きのテストで固定することを採用条件とする。あわせて新イベント追加時の面(event-registry.ts / amadeus-audit.ts VALID_EVENT_TYPES + EVENT_HEADINGS / audit-format.md / docs/reference/12-state-machine{,.ja}.md / t28 の count pin / EXPECTED_CANONICAL_COUNT / 新規テストファイル追加時は tests/.coverage-registry.json regen)を同一変更で同期すること。
Late responses:
- None
Run lineage: run-1

## Timeline
- tallied at=2026-08-15T08:51:44Z run=run-1
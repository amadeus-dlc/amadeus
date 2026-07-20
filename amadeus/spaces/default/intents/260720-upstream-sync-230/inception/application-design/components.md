# Components — upstream-sync-230

> 上流入力(consumes 全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。`stories.md` は本 scope で SKIP 済み。

本 intent は既存の repository-local modular monolith を維持し、24 ADOPT/ADAPT 項目を変更理由ごとの7コンポーネントへ配置する。新規 network service、database、AWS resource、user-facing UI は追加しない。正本は `packages/framework/` と `plugins/`、`dist/` は生成物である。

## C1: Stage Contract Kernel

- 所有: stage frontmatter、Unit kind、`produces_kinds`、`bundle`、`when`、`required_sections` の型・正規化・検証（FR-2 item 7、FR-6 item 18）。
- 既存再利用: `amadeus-stage-schema.ts`（526行）、`amadeus-graph.ts`（2,003行）、directive/sensor の既存 artifact 解決 seam。
- 公開面: closed vocabulary と判別可能な validation result、canonical graph export。未知 kind/不正型は mutation 前に拒否する。
- 境界: `when` は保存だけを担い評価しない。plugin 専用の第二 parser を持たない。
- 手書き変更見積り: 220–380行、テスト 260–420行。

## C2: Workflow Runtime Correctness

- 所有: Bolt DAG 自己修復、gate revision backstop、batch advance、help routing、compose marker freshness、recompose autonomy guard、unit-major iteration、scope cost preview、next-stage naming（FR-1 items 1–6、FR-2 items 8–10）。
- 既存再利用: `amadeus-orchestrate.ts`（3,215行）、`amadeus-state.ts`（3,562行）、`amadeus-swarm.ts`、`amadeus-utility.ts`、compiled scope grid と audit emitter。
- 公開面: state/graph を入力にする純粋な判定 seam と既存 CLI subcommand。state mutation は既存 lock/audit transaction 内だけで行う。
- 境界: FR-0 の4項目は characterization test が同等性を否定した場合だけ実装差分を持つ。巨大fileの一般refactorは行わない。
- 手書き変更見積り: 420–760行、テスト 650–1,050行。

## C3: Workspace Inspection

- 所有: depth-1 nested root と `.gitmodules`/submodule の決定的検出、birth/detect/doctor/JSON summary への投影（FR-3 items 11–12）。
- 既存再利用: `amadeus-utility.ts`、workspace detector、intent birth、doctor の既存出力契約。
- 公開面: read-only scan result。複数候補・読取不能・未初期化は advisory として返し、自動選択しない。
- 境界: depth>1探索、submodule初期化、filesystem修復は担わない。
- 手書き変更見積り: 130–240行、fixture/tests 240–390行。

## C4: Plugin Composition

- 所有: plugin discovery/manifest validation、no-clobber stage copy、宣言 seam merge、fragment splice、compile/self-heal、doctor、drop record、reference `test-pro` plugin（FR-6 items 20–21）。
- 既存再利用: C1 schema、C2 graph compiler、既存 `amadeus compose`/doctor/state/audit primitives。
- 公開面: `inspect → plan → apply/drop` の判別 union と CLI。計画を temp tree で検証してから atomic commit する。
- 境界: marketplace、lockfile、managed settings、agents/scopes/memory/knowledge projection、`when`評価は担わない。
- 手書き変更見積り: 520–850行、integration tests 650–1,000行、reference plugin 70–130行。

## C5: Distribution Projection

- 所有: `plugins/<name>/` discovery、source→host projection→`dist/plugins/`、6 harness package、4 harness self-install の所有境界と drift/orphan check（FR-6 item 19）。
- 既存再利用: `scripts/package.ts`（788行）の discover/build/check、`scripts/promote-self.ts`（375行）の closed list、各 harness manifest。
- 公開面: deterministic build tree と check result。plugin 0件では現行生成 bytes を変えない。
- 境界: `dist/`を正本にしない。Kiro/Kiro IDEを self-install の4面へ暗黙追加しない。
- 手書き変更見積り: 260–470行、tests 350–620行、generated dist は手書き0行。

## C6: Harness and Reviewer Adapters

- 所有: `process.execPath` spawn、Kiro IDE hook context、Claude project-dir quoting、reviewer runtime date/persona/read-scope（FR-4 items 13–15、FR-5 items 16–17）。
- 既存再利用: 6 harness adapter source、11 hook wiring、reviewer personas/stage protocol、package projection。
- 公開面: host hook payload→canonical context の薄い adapter。reviewer read allow-list は directive.consumes と対象Unit成果物から導出する。
- 境界: core toolへ harness 固有ロジックを入れず、adapter単独の dormant 公開面を先行着地しない。
- 手書き変更見積り: 180–340行、tests 330–560行、generated projection は手書き0行。

## C7: Verification, Documentation, and Ledger

- 所有: plugin reference/authoring guide（no-clobber、deferred面、6 package/4 self-install差を含む）、upstream t188/t199–t219 の Amadeus 再著作、24 item trace、英語正本/日本語pair docs、最終 CI/coverage、ledger 遷移（FR-0、FR-6 item 22、FR-7 items 23–24、FR-8）。
- 既存再利用: 461 test files、`tests/run-tests.sh --ci`、coverage registry、package/promote drift guard、upstream-sync ledger。
- 公開面: item ID→test/docs/evidence mapping と deterministic verification commands。
- 境界: SKIP 6項目のテスト、upstream README/CHANGELOGコピー、手書き roadmap は追加しない。
- 手書き変更見積り: tests 1,100–1,750行、docs 420–720行、ledger/trace 40–90行。

## 所有権と総規模

| 正本/生成物 | 所有コンポーネント | 書込規則 |
|---|---|---|
| core schema/graph/runtime | C1/C2 | 既存 choke point の最小変更 |
| workspace inspection | C3 | read-only scan、修復なし |
| plugin authoring source | C4 | `plugins/<name>/` が正本 |
| package/self-install projection | C5 | generator のみが書く |
| harness/reviewer source | C6 | core と host固有面を分離 |
| tests/docs/ledger | C7 | 実装と同じ Bolt で同乗 |
| `dist/` | C5生成物 | 手編集禁止 |

総手書き見積りは実装 1,800–3,170行（C1–C6の1,730–3,040行+reference plugin 70–130行）、tests 3,580–5,790行、docs/trace 460–810行。24項目を独立に積み上げた上限であり、FR-0の EQUIVALENT 判定と共有fixture再利用により縮小しうる。Units Generation はこのcomponent境界を壊さず、walking skeleton と並行可能Boltへ分割する。

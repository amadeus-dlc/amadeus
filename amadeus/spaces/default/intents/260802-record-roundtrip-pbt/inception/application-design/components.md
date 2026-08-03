# Components — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): requirements.md(FR-1〜FR-7 / NFR-1〜5 / C-1〜C-5 / A-1〜A-4 の分割根拠)、architecture.md(4境界 seam ペア表と読み側3層の硬さ分布 — U1/U3 の対象選定)、component-inventory.md(本 intent の対象3グループ = コーデック正本 / テスト側 / 静的ガードの棚卸し — 下記ユニット分割の母体)

測定 ref: 本書の file:line と件数はすべて **worktree HEAD `5a6f79727`** の実測。RE observed `9750f8aea` から HEAD までの `git diff --stat 9750f8aea..HEAD -- packages/framework/core/tools/ tests/ .github/workflows/` は**空**(exit 0、差分ゼロ)であり、requirements.md / architecture.md / re-scans が observed で確定した file:line はすべて HEAD でそのまま成立する。新規に本ステージで測った値には測定コマンドを併記する。

## コンポーネント分割の方針

component-inventory.md 現在節の判断(「本 intent での実質変更なし — 新規コンポーネントの新設は見通しにない。対象は既存3グループ」)を設計でも維持する。すなわち**新規プロダクションコンポーネントはゼロ**で、追加されるのは (a) 既存 core モジュール内の関数1本(読み側パーサ)、(b) テスト資産(PBT ファイル + arbitrary)、(c) テスト層のガードツール1本、(d) CI ジョブ1本、(e) 文書1本である。

architecture.md 現在節の「4境界とも既に `packages/framework/core/tools/` にあるため移設ではなく一本化、適用単位は境界ごと」に従い、境界横断の汎用バリデータ層は作らない(requirements.md C-4)。

## U1: election 読取一本化(core 改修)

- **所在**: `packages/framework/core/tools/amadeus-election-store.ts`
- **責務**: `election.json` の読み戻しを、発行側と同一のバリデータ(`Election.parse`)を必ず通す単一の関数に閉じる。読み側 fail-closed 化(FR-1a / FR-1b)。
- **公開面**: モジュール内 private 関数 `parseElectionFile` を新設し、`Store.load`(`:503`)と `Store.setState`(`:512`)の2つの読み口だけがそれを使う。`Store` の公開シグネチャは不変(戻り型 `Result<{election, state}, StoreError>` を維持 — `StoreError` に既存の `"corrupt"`(`:49`)がある)。
- **境界**: 汎用 `readJson<T>`(`:71`)自体は変更しない。requirements.md A-3 のとおり `readJson` は ledger / pending / timeline / tally も読むため、election 特化の検証を汎用形へ押し込まない。
- **推定規模**: 新規 **45〜60 行**(パーサ関数 + 説明コメント)、既存行の変更 **6 行以内**(`:504-509` と `:515-517` の読み口2箇所)。プロダクション改修は本 intent 全体でこの1ユニットのみ。
- **投影コスト**: NFR-1 により dist 7 ハーネス再生成 + `dist:check` / `promote:self:check`、NFR-2 により coverage patch 母集団入り、NFR-3 により `t258-boundary-guard`。

## U2: election 境界の PBT(round-trip + fail-closed)

- **所在**: `tests/unit/`(純関数層 = `Election.parse` の round-trip)+ `tests/integration/`(実 FS 経由 = `Store.create → Store.load` の往復と fail-closed)。層分けは requirements.md FR-4b(`cid:code-generation:fs-tests-integration-first`)に従う。既存の同領域テスト `tests/unit/t234-election-model.test.ts`(ヘッダ実文 `// Layer: unit (no fs, no clock — fs-tests-integration-first).`)/ `tests/integration/t235-election-store.integration.test.ts`(`// Layer: integration (touches a tmp elections root — fs-tests-integration-first).`)と同じ層規約に揃える。
- **責務**: (1) 妥当 Election 上の `Election.parse ∘ JSON round-trip = id`、(2) 非適合入力が `Store.load` で必ず棄却される fail-closed プロパティ、(3) FR-4d の #1459 反例(重複 internalNo / 空 choices / 重複 voter)の読取経路でのピン。
- **推定規模**: unit **90〜120 行** + integration **90〜120 行**(計 180〜240 行)。
- **依存**: U1(fail-closed プロパティは U1 の改修後でなければ構造的に緑にできない — 現行は無検査キャストで素通りするため)。

## U3: state 境界の PBT(構造フィールド層 + テキストフィールド層)

- **所在**: `tests/unit/`(両層とも純関数 — `parseMirrorBoundaryReceipts` / `serializeMirrorBoundaryReceipts` / `getField` / `setField` はいずれも文字列入出力で fs を触らない)。
- **責務**: FR-2a の「正規化後の同値」round-trip、FR-2c の5 throw 分岐の否定側プロパティ、FR-2b の trim 込み・フィールド存在前提の条件付き round-trip。
- **境界**: `setField` のサイレント no-op は仕様として維持(requirements.md A-2)。プロパティの受理ドメインを「フィールドが実在する content」に限定することで表現し、**挙動の変更提案は行わない**。
- **推定規模**: **140〜190 行**。
- **依存**: なし(読み側が既に fail-closed = architecture.md の層 (a) のため、プロダクション改修を伴わない純追加)。

## U4: 無検査キャストの静的ガード(allowlist ratchet)

- **所在**: `tests/`(新規 `tests/unchecked-cast-guard.ts` + allowlist `tests/.unchecked-cast-allowlist.json` + そのガード自身のテスト)。
- **責務**: 「共有バリデータを経由しない読み戻し経路」= `JSON.parse(...) as T` 型の無検査キャストを走査し、(file, kind) 単位のカウント台帳に対して **shrink-only** で判定する(FR-3a)。新規追加のみ fail、既存は allowlist 固定、縮小方向のみ許容。
- **述語**: AST 走査(ADR-2)。初期母集団の実測値は下記「reuse inventory / 実測」節。
- **推定規模**: ガード本体 **220〜280 行**(`tests/callsite-guard.ts` = 全 383 行と同オーダー、走査部を AST に差し替えるぶん短くなる見込み)、allowlist JSON **25〜40 行**、ガード自身のテスト **120〜160 行**(`tests/unit/t367-callsite-guard.test.ts` + `tests/integration/t367-callsite-guard-cli.test.ts` の2分割様式に倣う)。
- **依存**: U1(U1 の `parseElectionFile` 新設が SCAN_ROOTS 内の走査対象行を増減させうるため、U1 着地後に初期 allowlist を採ると台帳を書き直す往復が要らない。なお `amadeus-election-store.ts:80` は `readJson<T>` 本体の構文で U1 後も検出され続ける — 初期値 33/18 は不変)。

## U5: 深掘り実行面(CI)

- **所在**: `.github/workflows/ci.yml`(ジョブ追加)+ `tests/fixtures/formal-verif-ci-baseline.sha256`(再 baseline)。
- **責務**: FR-5a の `workflow_dispatch` 手動トリガで `AMADEUS_PBT_DEEP=1` 階層を走らせ、失敗 seed をジョブログへ出す。FR-5b によりブロッキング集合(`ci-success` の `needs`、`.github/workflows/ci.yml:615-623`)には**入れない**。
- **推定規模**: ci.yml **+35〜50 行**、fixture **1 行**、`tests/integration/t-formal-verif-ci-workflow.integration.test.ts` の再 baseline 注記 **+5〜10 行**。
- **依存**: U2 / U3(走らせる対象の PBT が存在してはじめて意味を持つ)。

## U6: 軽量台帳(文書)

- **所在**: `amadeus/spaces/default/intents/260802-record-roundtrip-pbt/bug-scope-ledger.md`(requirements.md FR-6a が指定するパス)。
- **責務**: 直接根拠9件の Issue 番号 + 各件の射程判定1行。
- **推定規模**: **40〜60 行**。依存なし。

## U7: mirror property 化(Could)

- **所在**: `tests/unit/t274-amadeus-mirror-state-codec.test.ts`(既存ファイルへの追記)+ `tests/helpers/arbitraries/`。
- **責務**: FR-7a — `:58` の example-based round-trip(実文 `  test("round-trip: render -> parse -> equal snapshot", () => {`)の property 版と妥当 snapshot の arbitrary。
- **推定規模**: **60〜90 行**。未実施でも intent は完了(FR-7a)。

## U8: arbitrary ヘルパ群

- **所在**: `tests/helpers/arbitraries/`(既存の `manifest.ts` / `semver.ts` の隣)。
- **責務**: U2 / U3 / U7 が共有する生成器。election 定義・非適合 election 断片・receipts オブジェクト・state ファイル content の4系統。
- **推定規模**: **180〜250 行**(election 系 120〜160、state 系 60〜90)。
- **依存**: なし(被依存側)。

## 規模合計(数値)

| ユニット | 種別 | 推定行数 |
| --- | --- | --- |
| U1 | production(core) | 45〜60(+ 既存6行変更) |
| U2 | test | 180〜240 |
| U3 | test | 140〜190 |
| U4 | test tooling | 365〜480 |
| U5 | CI | 41〜61 |
| U6 | doc | 40〜60 |
| U7 (Could) | test | 60〜90 |
| U8 | test helper | 180〜250 |
| **合計** | | **1,051〜1,431 行** |

プロダクションコード比率は 45〜60 行 / 1,051〜1,431 行 = **約 3〜6%**(機械再計算: 45/1431 ≈ 3.1% 〜 60/1051 ≈ 5.7%)。requirements.md の Intent analysis が置く「機能追加ではなく再発様式の根絶」という性格と整合する。

## Reuse inventory(既存インフラの再利用棚卸し)

inception ガードレールの要求により、新規機構を導入する前に既存で代替できるかを列挙する。**新設は U4 のガード本体1本のみ**で、他はすべて既存資産の再利用または既存ファイルへの追記である。

| 再利用対象 | 所在(HEAD `5a6f79727` 実測) | 使うユニット | 再利用の理由 |
| --- | --- | --- | --- |
| ratchet 様式(shrink-only allowlist) | `tests/callsite-guard.ts` — `Census`(`:133`)/ `buildCensus`(`:142`)/ `diffAgainstAllowlist`(`:201`)/ `parseAllowlist`(`:248`)/ `CheckOptions`(`:318`)/ `runCheck`(`:330`) | U4 | 判定・台帳・CLI 契約が既に確立。行ピンを避ける設計理由も同ファイルに明記(`:21-22` 実文 `// WHY COUNTS AND NOT LINE PINS. An allowlist of file:line identifiers goes` / `// stale the moment an unrelated edit shifts a file, and every later PR then`) |
| 走査スコープ定数 | `tests/callsite-guard.ts:61` 実文 `export const SCAN_ROOTS = ["packages/framework/core", "scripts"] as const;` | U4 | dist は core の投影のため除外という判断がそのまま流用できる |
| AST 走査基盤 | `tests/lib/typescript-source.ts` — `unwrapExpression`(`:19`)/ `visitNodes`(`:54`)、`tests/lib/guard-corpus-ast.ts` — `callNames`(`:25`、`:26` で `ts.createSourceFile`) | U4 | **AST ガードは既存**。`typescript` は devDependency(`package.json:42` `"typescript": "^6.0.3"`)で、新規外部依存はゼロ |
| PBT 基盤 | `fast-check`(`package.json:40` `"fast-check": "^4.9.0"`) | U2/U3/U7 | #697 で導入済み。追加依存なし |
| PBT 規約ヘッダ(canonical) | `tests/unit/t204-audit-escape.pbt.test.ts:16-28`(4項の規約)、`:38` `const PBT_SEED = 0xa0_d17;`、`:39` DEEP 判定、`:41` `const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };` | U2/U3/U7 | FR-4c が canonical と指定。新規分は4項全充足で書く |
| arbitrary ヘルパの配置様式 | `tests/helpers/arbitraries/semver.ts` / `manifest.ts` | U8 | 「生成器はパーサの入力境界で止め、ブランド型を直接作らない」という既存方針(semver.ts 冒頭コメント)をそのまま踏襲 |
| 実行 tier | `tests/run-tests.ts:117`(`--ci` = smoke + unit + integration) | U2/U3 | FR-4b の実行到達要件は既存 tier に載るだけで満たせる。新規ランナー不要 |
| 既存 ElectionState 検証 | `packages/framework/core/tools/amadeus-election-store.ts:254` `const VALID_STATES: ReadonlySet<string> = new Set<ElectionState>([` | U1 | `state` フィールドの妥当性検査は**新設不要** — 同一ファイル内の既存集合を再利用する(不在主張の反証確認済み: `grep -rn "isElectionState\|ELECTION_STATES" packages/framework/core/tools/*.ts` → 該当なし、代わりに `VALID_STATES` が実在) |
| 既存 fail-closed エラー語彙 | `amadeus-election-store.ts:49` `\| "corrupt"`、`:82` `return err("corrupt");` | U1 | FR-1b の「既存の `err("corrupt")` 系の loud な失敗経路へ落とす」は新規エラー種別を要さない |
| 既存 fail-closed 特性化テスト | `tests/integration/t235-election-store.integration.test.ts:91`(`fail-closed load: a corrupt election.json rejects with corrupt, never re-initializes`) | U1/U2 | U1 の Red→Green で壊してはならない既存契約。U2 の property はこの example の一般化として書く |
| CI 非ブロッキングジョブ様式 | `.github/workflows/ci.yml:509` `formal-model-check:` / `:511` `if: github.event_name == 'workflow_dispatch'`、`ci-success` の `needs`(`:615-623`)に不在 | U5 | 「workflow_dispatch 限定 + ブロッキング集合外」の先例が同一ファイル内に実在。新規 workflow ファイルは不要(ADR-3) |
| CI 形状のピン | `tests/integration/t-formal-verif-ci-workflow.integration.test.ts` + `tests/fixtures/formal-verif-ci-baseline.sha256` | U5 | ci.yml 編集の sanctioned 化手順(再 baseline + 注記追記)が既に3例記録済み |

## U4 初期母集団の実測(本ステージで新規測定)

ADR-2 の判断根拠であり、U4 の allowlist 初期値の見積りでもある。

| 述語 | 走査範囲 | 検出数 | 測定手段 |
| --- | --- | --- | --- |
| 単一行 regex `JSON\.parse\([^)]*\) as ` | `packages/framework/core/tools/*.ts`(非再帰) | **8** | re-scans/260802-record-roundtrip-pbt.md の実測(observed = HEAD で不変) |
| 単一行 regex(同上) | `packages/framework/core` + `scripts`(再帰) | **9** | `grep -rnE --include='*.ts' "JSON\.parse\([^)]*\) as " packages/framework/core scripts \| wc -l` |
| AST(`as unknown` を除く typed cast) | `packages/framework/core/tools/*.ts`(非再帰) | **21 サイト / 12 ファイル**(うち多行 0) | scratch AST スクリプト(TypeScript 6.0.3、`ts.isAsExpression` × `JSON.parse` callee) |
| AST(同上) | `packages/framework/core` + `scripts`(再帰、`node_modules`/`vendor` 除外) | **33 サイト / 18 ファイル**(うち多行 5) | 同上、SCAN_ROOTS 相当 |
| AST(`as unknown` = 安全側) | 同上 | **8**(母集団から除外する) | 同上 |

含意: 単一行 regex は SCAN_ROOTS 上で 9 件しか拾わず、AST 実測 33 件に対し**再現率およそ 27%**。しかも regex の 9 件には `amadeus-lib.ts:849` の `JSON.parse(output) as unknown`(型 `unknown` へのキャスト = parse-don't-validate と両立する安全形)が混ざる。ガードの見逃し率がこの水準では「新規違反のみ fail」という ratchet の契約自体が成立しない。詳細な裁定は decisions.md ADR-2。

## スコープ外(明示)

- 新規 adapter・外部契約(登録スロット・インターフェース面)の先行着地はしない。U1 の `parseElectionFile` は同一ファイル内 private で、実装と配線が同一 intent に揃う(inception ガードレール N3)。
- 4境界を貫く汎用バリデータ層は作らない(requirements.md C-4)。
- `readJson<T>` の汎用形の意味変更はしない(requirements.md A-3)。
- `setField` の意味論変更はしない(requirements.md A-2)。
- crash-consistency(`writeStoreFile` `:60` の tmp→rename に対する読み側耐性)は requirements.md Out of scope のとおり記録のみ。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T17:36:50Z
- **Iteration:** 1
- **Scope decision:** none

設計の大半は高品質だが、AST ガードの初期母集団が「U1 着地後に 33→32 へ減る」と4箇所で断定されており、確定済み AST 述語(型引数非依存・readJson 本体不変)と自己矛盾する Major 1件で REVISE。

### Findings

- [Major] decisions.md ADR-2 Consequences — 「U1 後 33/18→32/17」は AST 述語(as T は TypeReference であり UnknownKeyword でない)と ADR-4(readJson 本体不変)に矛盾。:80 は U1 後も検出され続け初期値は 33/18 のまま。同型前提が component-methods.md/components.md/component-dependency.md の計4箇所に伝播
- [Minor] components.md — プロダクション比率「約4〜6%」は機械再計算では 3.1%〜5.7%(下限誤り)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T17:38:38Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major(33/18→32/17 自己矛盾)は全4箇所で「初期値 33/18 不変(AST 述語は型引数非依存、readJson 本体不変)」へ統一済み、Minor(比率下限)も機械再計算どおり訂正済み。是正 diff に新規誤りなし。READY(GoA 1-2 相当)。

### Findings

- None

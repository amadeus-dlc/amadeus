# Components — 260731-perf-ci-separation

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、stories(N/A — user-stories は本 scope(self-feature)の EXECUTE 集合で SKIP のため成果物不存在。ユーザー価値の導出は intent-statement 経由で requirements.md に固定済み)、team-practices(N/A — practices-discovery SKIP のため不存在。プラクティスは memory 層が ambient 適用 — requirements.md line 3 と同判断)

requirements.md の FR-1〜FR-6 を実現するコンポーネント分割。codekb architecture.md / component-inventory.md の 260731-perf-ci-separation 節(RE 実測)を接地根拠とする。測定 ref = observed `da51af375`。

## C-1: perf tier(run-tests ランナー拡張)

- 対象: `tests/run-tests.ts`(`Level` 型 :71、`parseArgs` :184-282、`levelFiles` :839、`runFilesPartitioned` :875、main フロー :1161-1207)
- 変更: `"perf"` を Level へ追加、`--perf` フラグ新設、`--all`/`--release` の full profile へ perf を包含、summary の tier 表示へ perf 追加
- 規模見積り: 約 60〜90 行(型・parseArgs case・main フローの perf 分岐・usage 文 :125 周辺)
- 再利用: `levelFiles`/`runFilesPartitioned` は既存シグネチャのまま perf ディレクトリに適用(新機構なし)。e2e の既存分岐(:1186-1207)が実装パターンの canonical
- テスト: t05 既存契約 byte-identical(FR-1d)+ 新規 unit テスト(perf tier の選択・除外の Red→Green — NFR-3)

## C-2: perf テスト移設(分割方式)

FR-1e の選定基準を per-test 粒度で適用した最終目録(OQ-2 の解決 — 実測: 各ファイルの describe/test 構造 grep、2026-07-31):

| 現行ファイル | 実時間 perf 部分(移設) | 機能部分(integration に残置) |
|---|---|---|
| `tests/integration/t258-lifecycle-transaction.test.ts` | describe「performance contract」内の benchmark テスト(:495-529、330 spawn)→ `tests/perf/t258-lifecycle-transaction-perf.test.ts` | CLI 機能 describe(:144-490 — 直列化・HUMAN_TURN・lock 等)+ 落ちる実証(:535-540、純合成 — FR-1f 準拠で blocking 残置) |
| `tests/integration/t257-status-registry-migration.test.ts` | describe「performance contract」(:203-260、220 spawn)→ `tests/perf/t257-status-registry-migration-perf.test.ts` | migration/atomic writer describe(:59-201) |
| `tests/integration/t259-guard-corpus.test.ts` | 「AST traversal grows linearly」(:70-121、interleaved spawn)→ `tests/perf/t259-guard-corpus-perf.test.ts` | 「every owned sink file reaches the required guard」(:52-69 — ガード実在検証、blocking 価値) |
| `tests/integration/t269-...-performance.integration.test.ts` | **ファイル全体移設** → `tests/perf/t269-amadeus-mirror-contract-policy-performance.test.ts`(1ms/50ms 予算が主目的。決定性・zero-writes テストは同一ハーネス依存のため同乗) | なし |
| `tests/integration/t292-mirror-distribution-performance.integration.test.ts` | 実時間テスト2件(:75-98 — 20-run envelope と in-process 駆動)→ `tests/perf/t292-mirror-distribution-performance-perf.test.ts` | 純 aggregator 契約テスト群(:62-74、:99-300 — dispersion/mismatch/spike 判定は合成 fixture の純ロジック) |
| `tests/integration/t-plugin-stage-discovery-performance.integration.test.ts` | **ファイル全体移設** → `tests/perf/t-plugin-stage-discovery-performance.test.ts`(compile 実測が本体) | なし |

- 分割ファイルの `covers:` claim: 分割両側に元 claim を保持(registry は複数 claim を許容 — RE 実測 gen-coverage-registry `:770-791`)
- `// @test-size medium` の無効注釈(t258/t259 — size: regex 不一致の RE 実測)は移設時に正規 `// size:` へ是正(perf 側は `// size: large`)
- 規模見積り: 移設・分割で正味新規 約 120 行(import 複製・ハーネス分離)、削除相当は移動

## C-3: perf.yml(新 workflow)

- 新規: `.github/workflows/perf.yml`
- トリガー: `schedule: cron "47 17 * * *"`(UTC 17:47 = JST 02:47 — 0分/30分回避の off-peak、OQ-1 解決)+ `workflow_dispatch`
- jobs: (1) `perf-tests` — `bash tests/run-tests.sh --perf`、timeout-minutes 25、test-size-report artifact upload(OQ-6 解決 / R-2) (2) `distribution-benchmark` matrix 3 replicas — 現行 ci.yml :224-253 の移植+timeout-minutes 5 付与 (3) `distribution-benchmark-aggregate` — 現行 :255-277 の移植+timeout-minutes 5 (4) 各 job 失敗時 GITHUB_STEP_SUMMARY へ要約(FR-2d)。timeout 3値の実測導出は component-methods.md C-3 表(NFR-2)
- 規模見積り: 約 120〜150 行(ci.yml からの移植 60 行+新規 60〜90 行)
- 再利用: setup-bun/checkout/install の既存 step パターン、mirror-distribution-benchmark(-aggregate).ts は無変更

## C-4: ci.yml 縮約

- 削除: `distribution-benchmark`(:224-253)、`distribution-benchmark-aggregate`(:255-277)、`distribution-release-gate`(:279-291 — OQ-5 解決: PERFORMANCE_RESULT を失うと contract 検査の重複ラッパーになるため job ごと削除。`distribution-contract` は既に ci-success needs :651-659 に含まれ blocking 継続)
- 不変: `tests` / `coverage-head` / `coverage-base` / `ci-success` needs 集合(FR-3c / AC-3)
- 規模見積り: 約 −70 行

## C-5: t258 timeout 是正(perf 側)

- 対象: 移設後の `tests/perf/t258-lifecycle-transaction-perf.test.ts` の per-test timeout
- 変更: `120_000` → `250_000`。導出式: `ceil(2 × max(観測分布) / 10_000) × 10_000 = ceil(2 × 122_147.12ms / 10^4) × 10^4 = 250_000ms`(headroom = 250_000/122_147 ≈ 2.05倍。根拠データ = #1835 クロスレビューの22断面分布、実装コメントに式と出典を記載 — FR-4a)
- t257 波及(FR-4d / OQ-3): **波及させない** — t257 perf は実測 28.6s = 予算の 24% で分布が予算線から十分遠い(#1835 実測)。判断根拠を実装コメントに記載
- サンプル数・タイミングシームは不採用(ADR-3 参照)。規模見積り: 約 10 行(定数+コメント)

## C-6: coverage 整合

- `tests/gen-coverage-registry.ts:600-605` の `TEST_TIERS` へ `"perf"` を追加(FR-5a)+ registry 再生成
- `.coverage-project-baseline.json` の再カット(FR-5b、同一 PR 内・PR 本文で申告)
- `.coverage-patch-allowlist.json` の移設対象パスのエントリを機械 remap(FR-5c、E-FSPBTS13 直読照合併用)
- 規模見積り: コード 約 5 行+データ再生成

## C-7: docs 同期

対象棚卸し表(FR-6a / AC-6 — dual-key grep の出力転記。キー: `test:ci` / `coverage:ci` / `distribution:benchmark` / `smoke + unit + integration` / `Intent Mirror benchmark` / `run-tests.sh --ci`。実行 2026-07-31、測定 ref = observed `da51af375`):

| ファイル | hit 数 | 更新対象 |
|---|---|---|
| `docs/reference/09-testing.md` | 5 | ✅(tier 一覧・--ci 構成の主記述) |
| `docs/reference/09-testing.ja.md` | 5 | ✅(対訳同期) |
| `README.md` | 3 | ✅(CI 概要) |
| `README.ja.md` | 3 | ✅(対訳同期 — iteration 後の独立再 grep で検出、初回棚卸しのパス列挙漏れを是正 2026-07-31) |
| `docs/guide/publishing-setup.md` | 1 | ✅ |
| `docs/guide/publishing-setup.ja.md` | 1 | ✅(対訳同期) |
| `docs/reference/01-architecture.md` | 1 | ✅ |
| `docs/reference/01-architecture.ja.md` | 1 | ✅(対訳同期) |
| `docs/reference/11-contributing.md` | 1 | ✅ |
| `docs/reference/11-contributing.ja.md` | 1 | ✅(対訳同期) |
| `docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md` | 3 | ❌(履歴研究レポート — 記録面、更新しない。cid:requirements-analysis:c1-ac-grep-surface-scope の記録面除外) |
| `docs/research/upstream-sync/ledger.json` | — | ❌(同上、機械台帳の履歴) |

上記に加えコード内文書面: `tests/run-tests.ts` usage 文(C-1 で更新)、`.github/workflows/` 内コメント(C-3/C-4 で更新)。実装 Bolt 冒頭で同一キーの grep を再実行して鮮度を再確認する(cid:functional-design:inventory-from-grep-each-time — 本表が design 実在の正、再 grep は陳腐化検査)。

- 規模見積り: 約 30〜60 行の文書更新(更新対象 10 ファイル — 上表の ✅ 列挙より)

## CI-residency ガード(OQ-4 解決)

`t257-ci-residency-marker-guard` は**無変更**。perf tier は CI_SCOPES(smoke/unit/integration)外であり、perf 内で将来 `CI-resident` を主張すればガードが loud に落ちる — これは望ましい挙動(perf は --ci 非実行のため CI-resident 主張は虚偽)。この意味論を perf.yml のヘッダコメントに文書化する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T10:21:57Z
- **Iteration:** 1
- **Scope decision:** none

コンポーネント分割・ADR・C-3→C-4 順序は健全だが、FR-3d 対照表と AC-6 棚卸し表の不在(承認済み AC からの無申告逸脱)、consumes 2件の N/A 欠落、NFR-2 の導出欠落で NOT-READY。

### Findings

- [Major] decisions.md: FR-3d の移設前後検証項目対照表が design 成果物に実在しないまま充足引用。C-2 表はテスト6ファイルのみで ci.yml 削除3 job の対照を欠く。
- [Major] components.md: AC-6 は grep 出力転記の棚卸し表が design 成果物に実在することを要求するが、C-7 は実装 Bolt 冒頭へ先送り(無申告逸脱)。
- [Major] components.md ほか5成果物: stage 宣言 consumes の stories / team-practices が参照も N/A 明記もなし(requirements.md で同型指摘済みの再発)。
- [Minor] component-methods.md: perf.yml の timeout-minutes 30/15/5 に NFR-2 の要求する実測導出がない(ADR-3 は導出式ありの対照)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T10:26:25Z
- **Iteration:** 2
- **Scope decision:** none

iteration-1 の4指摘は全件閉包を live repo 照合で確認(FR-3d 対照表 V-1..V-8、AC-6 grep 棚卸し表、consumes N/A 全5成果物、NFR-2 実測導出3値)。引用 spot-check 全解決。依存 DAG 健全・C-3→C-4 順序の検証喪失窓封鎖を確認。実装可能。

### Findings

- None

# Code Summary — verification-and-ledger-closure (U12)

> 上流入力: `unit-of-work.md`(U12)、`functional-design/{business-logic-model,business-rules,domain-entities}.md`、`nfr-design/{logical-components,reliability-design,security-design}.md`、`requirements.md`(FR-0 / FR-7 items 23–24 / FR-8 / NFR-5/6)、`docs/research/upstream-sync/ledger.json`、U01–U11 の `construction/*/code-generation/code-summary.md`。
> 測定 ref: worktree `bolt-verification-and-ledger-closure`、base HEAD `6faabc19b`(U01–U11 マージ済み)。数値はすべて集計コマンド出力からの転記。

## 結論

C7 closure を実装した。U01–U11 の code-summary から全 24 item(30 − SKIP 6)の test/docs/evidence を **実測 trace** し、正準 3 seam(`traceCoverage` / `assertPhaseVerification` / `planLedgerTransition`)+ 内部 helper(`classifyDisposition` / `resolveEvidence`)を fail-closed の判別 union で実装した。ledger を `PLANNED → INTENT_IN_PROGRESS` へ進め、`APPLIED` は三条件ゲート越しに build-and-test 完了後へ委譲(先取りしない)。機能実装・新 runtime dependency・gh 依存・DB/network/UI はなし。

## 24 item trace 集約(item → primary evidence の全数表)

全 24 traced item の primary evidence path は**実 FS sweep で 0 missing**(t255 `resolveEvidence` × `existsSync`、`resolution.missing === []`)。

| # | item | disp | unit | verdict | primary evidence(実在確認済) |
|---|---|---|---|---|---|
| 1 | bolt-dag-selfheal | ADAPT | U02 | PORTED | tests/unit/t247-runtime-recovery.test.ts, tests/integration/t247-runtime-recovery.test.ts |
| 2 | gate-revision-backstop | ADAPT | U02 | PORTED | t247 unit+integration |
| 3 | swarm-batch-advance | ADAPT | U03 | **EQUIVALENT** | tests/integration/t251-swarm-and-next-stage.test.ts(回帰、production 無変更) |
| 4 | help-routing | ADAPT | U04 | PORTED | tests/unit/t246-routing-and-autonomy-guards.test.ts, tests/integration/t246-... |
| 5 | compose-pending-freshness | ADOPT | U04 | PORTED | t246 unit+integration |
| 6 | recompose-autonomy-guard | ADOPT | U04 | PORTED | t246 unit+integration |
| 7 | unit-kind-pruning | ADAPT | U01 | PORTED | tests/unit/t248-stage-contract.test.ts, tests/integration/t248-stage-contract-routing.test.ts |
| 8 | unit-major-iteration | ADAPT | U05 | PORTED | tests/unit/t250-unit-iteration-and-scope-preview.test.ts, tests/integration/t250-... |
| 9 | scope-cost-preview | ADAPT | U05 | PORTED | t250 unit+integration |
| 10 | gate-next-stage-naming | ADAPT | U03 | PORTED | tests/integration/t251-swarm-and-next-stage.test.ts, tests/unit/t113.test.ts |
| 11 | nested-root-detection | ADAPT | U06 | PORTED | tests/unit/t249-workspace-inspection.test.ts, tests/integration/t249-... |
| 12 | submodule-detection | ADAPT | U06 | PORTED | t249 unit+integration |
| 13 | execpath-spawn | ADOPT | U07 | PORTED | tests/unit/t231-harness-hook-correctness-seams.test.ts, tests/integration/t231-... |
| 14 | kiro-ide-hook-context | ADAPT | U07 | PORTED | t231-...-seams.test.ts, tests/unit/t209-kiro-ide-dual-vocab.test.ts |
| 15 | project-dir-quoting | ADOPT | U07 | PORTED | t231 unit+integration |
| 16 | reviewer-date-persona | ADOPT | U08 | PORTED | tests/unit/t245-reviewer-protocol-seams.test.ts, tests/integration/t245-reviewer-protocol-production-path.test.ts |
| 17 | reviewer-read-scope | ADAPT | U08 | PORTED | t245 unit+integration |
| 18 | stage-schema-extensions | ADAPT | U01 | PORTED | t248 unit+integration |
| 19 | packager-plugin-projection | ADAPT | U09 | PORTED | tests/unit/t-plugin-projection.test.ts, tests/integration/t-plugin-projection-packaging.test.ts |
| 20 | plugin-compose-hook | ADAPT | U10 | PORTED | tests/unit/t252-plugin-composition.test.ts, tests/integration/t253-plugin-composition-fs.test.ts |
| 21 | test-pro-reference-plugin | ADAPT | U11 | PORTED | tests/integration/t254-reference-plugin-lifecycle.test.ts, tests/fixtures/plugins/test-pro/plugin.json |
| 22 | plugin-docs | ADAPT | U11 | PORTED | docs/guide/19-plugins.md, docs/guide/19-plugins.ja.md |
| 23 | ported-tests | ADAPT | FR-7 | PORTED | tests/integration/t254-reference-plugin-lifecycle.test.ts(集約: t231/t245/t246/t247/t248/t249/t250/t251/t252/t253/t254) |
| 24 | docs-updates | ADAPT | U11 | PORTED | docs/guide/19-plugins.md, tests/unit/t174-docs-legacy-refs-gate.test.ts |

**不足 item: 0 件**(24/24 が実 FS 上で trace 充足)。

**SKIP 6件(trace 対象外)**: learnings-memory-path / optional-produces / agent-model-key / dist-trees / roadmap-html / upstream-changelog。`SKIP_ITEMS.length === 6`、各 `evidence: []` を t255 で assert。

### 統合時 reconciliation(U12 closure の実測是正)

code-summary の記載名と実 landed path が乖離した3件を **実 landed path** へ正した(closure の存在意義):

- **swarm(item 3/10)**: U03 summary は `t250-swarm-and-next-stage` を記すが、U05 の t250 と衝突し実 landed は **`t251`-swarm-and-next-stage.test.ts**(unit 面は t113.test.ts へ)。
- **reference plugin(item 21)**: U11 summary は `plugins/test-pro/` を記すが、repo-root `plugins/` は baseline byte-identity 維持のため意図的に不在。実 landed は **`tests/fixtures/plugins/test-pro/`**(t254 の CANONICAL_SOURCE、実測 grep 確認)。
- **docs gate(item 24)**: docs legacy-refs gate は **`tests/unit/`**t174-docs-legacy-refs-gate.test.ts(integration でなく unit 層)。

## 変更ファイル(実測: `git show --stat`)

- 新規正本(pure logic、fs なし): `scripts/upstream-sync-closure.ts`(278 行 = 3 public seam + 2 internal helper + 30-item trace 台帳 + 判別 union 型。既存 `scripts/plugin-projection.ts` / `plugin-composition.ts` の pure 分離様式に準拠)。
- 新規テスト: `tests/integration/t255-upstream-sync-closure.test.ts`(212 行、23 tests、pure module を in-process import + 実 FS evidence sweep)。
- ledger 遷移: `docs/research/upstream-sync/ledger.json`(3 行、surgical: `status`/`intent`/`updated_at` のみ。他フィールド・整形は不変)。
- 工程記録: `.../code-generation/code-generation-plan.md`、本 code-summary、`amadeus-state.md`、audit shard。

正本(`packages/framework/core`・`harness`)は無改修 = dist/self-install 再生成不要(dist:check / promote:self:check の drift 0 で実証)。

## 実装契約

```ts
export function traceCoverage(items): TraceResult;               // complete | incomplete(missing[])
export function assertPhaseVerification(run): VerificationResult; // verified | failed(reasons[])
export function planLedgerTransition(ledger, evidence): LedgerTransitionResult; // reject | blocked | applied | noop
export function classifyDisposition(item): DispositionVerdict;   // 内部 helper(E-OC1 A): equivalent | ported | insufficient
export function resolveEvidence(items, exists): EvidenceResolution; // 内部: present[] / missing[]（捏造せず列挙）
export const REQUIRED_DISPOSITION_COUNT = 24;
```

- **EQUIVALENT 厳格性**: `classifyDisposition` は characterization(回帰)evidence がある場合だけ EQUIVALENT を認め、partial を昇格させない。
- **FR-8 三条件ゲート**: `planLedgerTransition` は 24 disposition・全 gate green・最終 SHA の同時成立だけ `applied`。いずれか欠落は `reject`(ledger bytes 不変・非 BLOCKED)。構造化 `verification-failure`/`abandon` だけ `blocked`(baseline 不前進)。同一 transition 再実行は `noop`(二重履歴 0)。

## 検証コマンドと実測 exit code(同期・パイプなし)

| コマンド | exit / 結果 |
|---|---|
| `bun test tests/integration/t255-upstream-sync-closure.test.ts`(path 実在機械確認・`Ran 23 tests across 1 file`) | 0（23 pass / 0 fail / 38 expect） |
| `bun run typecheck` | 0 |
| `bun run lint:check` | 0（既存 warning 214 / info 16 のみ。新規ファイルの diagnostics 0） |
| `bun run dist:check` | 0（package 6面 drift 0） |
| `bun run promote:self:check` | 0（self-install 4面 drift 0） |
| `bun tests/complexity-gate.ts --check` | 0（`planLedgerTransition` CCN 11、new violation 0） |
| `bun tests/gen-coverage-registry.ts --check` | 0（fresh, guards green, ratchet held） |
| `bun test tests/unit/gen-coverage-registry.test.ts`(EXPECTED_NONE_TO_CLI 照合) | 0（42 pass。t255 は追記不要 = none-to-cli 集合外） |
| `AMADEUS_PATCH_BASE_REF=HEAD~1 bun tests/coverage-patch-gate.ts --check`（full lcov） | 0（**PASS**: measured 101 / covered 101 / allowlisted 0 / uncovered 0） |

**落ちる実証**: `planLedgerTransition` の dispositionCount ガードを一時無効化 → t255「dispositionCount < 24 => reject」が RED（22 pass / 1 fail）を実測 → 復元後 GREEN（23 pass）。注入→復元を1セットで実施、head に注入は残さない。

**patch coverage(NFR-6)**: full `coverage/lcov.info` で `scripts/upstream-sync-closure.ts` は LF:101 / LH:101(未カバー 0)。pure module を in-process import する t255 で全分岐を駆動(spawn 盲点なし)。

## full coverage:ci の帰属(NFR-5、参考実測)

`bun run coverage:ci` は RESULT: FAIL(exit 1)だが、実測帰属:
- **assertion 失敗 0**(全 `bun test` ブロックが `0 fail`)。t255 は full run でも `PASS`。
- RESULT: FAIL の原因は **(a) wall-clock drift 2件**(t-codex-hooks-migration 37.7s / t225-upstream-v2-migration-preflight 31.3s、declared=medium→measured=large の advisory)+ **(b) 環境起因 1件** `tests/integration/t245-amadeus-leader-sync.integration.test.ts`(assertion 実文 = `git fetch origin main: offline` / `clone-id-missing`。sandbox のネットワーク不在起因)。
- いずれも本 diff(upstream-sync-closure / t255 / ledger.json)非参照・非改変で、U02/U05 code-summary が既記の既知 drift/環境クラス。NFR-5 の full CI green 確定は build-and-test の所管とし、本ステージでは列挙値の帰属実測に留める。

## ledger 遷移

`docs/research/upstream-sync/ledger.json`: `status` `PLANNED → INTENT_IN_PROGRESS`、`intent` `null → "260720-upstream-sync-230"`、`updated_at` 更新。`APPLIED` は三条件成立が build-and-test で実証されてからの遷移(本 Unit では先取りせず、gate ロジックのみ実装)。JSON 妥当性・surgical(3 行)を実測確認。

## コミット

worktree `bolt-verification-and-ledger-closure` 内 `git commit`(push なし)。SHA は本 summary 追記後の amend で確定(最終テキスト参照)。

## 逸脱

設計逸脱なし。統合時の path reconciliation(t251 / tests/fixtures/plugins / t174)は closure の責務範囲であり、実 landed 状態を正とした(捏造なし・実 FS 実測)。

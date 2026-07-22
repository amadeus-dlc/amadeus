# Code Generation Plan — verification-and-ledger-closure (U12)

> 上流入力: `unit-of-work.md`(U12)、`functional-design/{business-logic-model,business-rules,domain-entities}.md`、`nfr-design/{logical-components,reliability-design,security-design}.md`、`requirements.md`(FR-0 / FR-7 items 23–24 / FR-8 / NFR-5/6)、`docs/research/upstream-sync/ledger.json`、U01–U11 の `construction/*/code-generation/code-summary.md`。

## 目的

C7 closure 面。各 Unit が残した test/docs/evidence を全 24 item(30 item − SKIP 6)へ trace し、必須 verification と最終 SHA が揃った場合だけ ledger を idempotent に `APPLIED` へ進める **gate** を実装する。機能実装は持たない。本 Unit では gate ロジック(pure planner)+ trace 台帳 + ledger の `INTENT_IN_PROGRESS` 化までを行い、`APPLIED` は build-and-test 完了後に条件成立時のみ書く(先取りしない)。

## 実装物(最小・surgical)

### 1. `scripts/upstream-sync-closure.ts`(pure logic、fs なし)

既存 `scripts/` の pure ロジック分離様式(`plugin-projection.ts` / `plugin-composition.ts` / `release-version-sync-plan.ts`)に倣う。gh 依存なし。判別 union で fail-closed。

- **正準 public seam 3 件**(FD / component-methods.md 準拠):
  - `traceCoverage(items, evidence): TraceResult` — 全 non-SKIP item を最低1 test/docs evidence へ対応付け。23/24 以下は `incomplete`。
  - `assertPhaseVerification(run): VerificationResult` — targeted + typecheck/lint/dist/promote-self/full-CI/coverage の green を検査。未実施・非0・stale・patch 未カバー>0(waiver 未正当化)は `failed`。
  - `planLedgerTransition(ledger, evidence): LedgerTransitionResult` — 24 disposition・全 gate green・最終 SHA の三条件同時成立だけ `applied`。欠落は `reject`(bytes 不変、`blocked` にしない)。構造化 `verification-failure`/`abandon` だけ `blocked`。同一 transition 再実行は `noop`。
- **内部 helper**(E-OC1 裁定 A):
  - `classifyDisposition(item, evidence): DispositionVerdict` — EQUIVALENT は characterization(回帰)evidence がある場合だけ。partial を EQUIVALENT へ昇格させない。
  - `resolveEvidence(items, exists): EvidenceResolution` — evidence path の実在を port `exists: (path)=>boolean` で解決(欠落を捏造せず列挙)。
- **trace 台帳 `UPSTREAM_ITEMS`(30件)**: 各 item に `{ id, domain, disposition, unit, verdict, evidence[] }`。U01–U11 code-summary の実測から導出。SKIP 6件は `evidence: []` + `disposition: "SKIP"` で trace 対象外を明示。
- 定数 `REQUIRED_DISPOSITION_COUNT = 24`、`REQUIRED_GATES`。

### 2. `tests/integration/t255-upstream-sync-closure.test.ts`

pure module を in-process import(spawn 盲点なし=coverage 有効)。実 FS を触る evidence 実在 sweep を含むため integration 層(fs-tests-integration-first)。

- catalog: 30 item = 24 traced + 6 SKIP。
- **実 FS sweep**: 24 traced item の primary evidence path が全て `existsSync` = true(0 missing)。← U12 の存在意義(gap 検出)。
- `traceCoverage`: 24/24 complete、23件 → incomplete。
- EQUIVALENT に characterization evidence 無し → `classifyDisposition` insufficient(partial 拒否)。
- `assertPhaseVerification`: 全 green → verified、各 gate 単独 failed/not-run/stale、patch 未カバー>0 → failed。
- `planLedgerTransition`【落ちる実証】: 三条件 → applied。dispositionCount<24 / gates 非green / SHA null の各欠落 → reject(applied にならない・bytes 不変)。verification-failure/abandon → blocked。単なる incomplete(terminal 無し)→ reject(非 BLOCKED)。applied/blocked 再実行 → noop(二重履歴0)。

### 3. `docs/research/upstream-sync/ledger.json` 遷移

`status: PLANNED → INTENT_IN_PROGRESS`、`intent: null → "260720-upstream-sync-230"`、`updated_at` 更新。`APPLIED` 先取りしない(build-and-test 後の三条件成立時のみ)。

### 4. coverage registry 再整合(U12 所有 = integration-registry-regen)

`bun tests/gen-coverage-registry.ts` 再生成。t255 integration が none-to-cli 分類なら `EXPECTED_NONE_TO_CLI` へ追記。

## 24 item → primary evidence(実測 trace、code-summary 由来)

| # | item | disp | unit | verdict | primary evidence |
|---|---|---|---|---|---|
| 1 | bolt-dag-selfheal | ADAPT | U02 | PORTED | t247 unit+integration |
| 2 | gate-revision-backstop | ADAPT | U02 | PORTED | t247 unit+integration |
| 3 | swarm-batch-advance | ADAPT | U03 | EQUIVALENT | t251 integration(回帰、production 無変更) |
| 4 | help-routing | ADAPT | U04 | PORTED | t246 unit+integration |
| 5 | compose-pending-freshness | ADOPT | U04 | PORTED | t246 unit+integration |
| 6 | recompose-autonomy-guard | ADOPT | U04 | PORTED | t246 unit+integration |
| 7 | unit-kind-pruning | ADAPT | U01 | PORTED | t248 unit+integration |
| 8 | unit-major-iteration | ADAPT | U05 | PORTED | t250 unit+integration |
| 9 | scope-cost-preview | ADAPT | U05 | PORTED | t250 unit+integration |
| 10 | gate-next-stage-naming | ADAPT | U03 | PORTED | t251 integration + t113 unit |
| 11 | nested-root-detection | ADAPT | U06 | PORTED | t249 unit+integration |
| 12 | submodule-detection | ADAPT | U06 | PORTED | t249 unit+integration |
| 13 | execpath-spawn | ADOPT | U07 | PORTED | t231 unit+integration |
| 14 | kiro-ide-hook-context | ADAPT | U07 | PORTED | t231 + t209 unit |
| 15 | project-dir-quoting | ADOPT | U07 | PORTED | t231 unit+integration |
| 16 | reviewer-date-persona | ADOPT | U08 | PORTED | t245 unit+integration |
| 17 | reviewer-read-scope | ADAPT | U08 | PORTED | t245 unit+integration |
| 18 | stage-schema-extensions | ADAPT | U01 | PORTED | t248 unit+integration |
| 19 | packager-plugin-projection | ADAPT | U09 | PORTED | t-plugin-projection unit+integration |
| 20 | plugin-compose-hook | ADAPT | U10 | PORTED | t252 unit + t253 integration |
| 21 | test-pro-reference-plugin | ADAPT | U11 | PORTED | t254 integration + tests/fixtures/plugins/test-pro/plugin.json |
| 22 | plugin-docs | ADAPT | U11 | PORTED | docs/guide/19-plugins.md(+ .ja.md) |
| 23 | ported-tests | ADAPT | FR-7 | PORTED | t254 integration(集約: t231/t245/t246/t247/t248/t249/t250/t251/t252/t253/t254) |
| 24 | docs-updates | ADAPT | U11 | PORTED | docs/guide/19-plugins.md + t174 docs legacy-refs gate |

SKIP 6(trace 対象外): learnings-memory-path / optional-produces / agent-model-key / dist-trees / roadmap-html / upstream-changelog。

## 検証(同期・パイプなし・exit code 実測)

`bun test t255`(path 実在+件数照合)、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bun tests/complexity-gate.ts --check`、`bun tests/gen-coverage-registry.ts --check`、local lcov(patch 未カバー0)。落ちる実証: 三条件欠落 APPLIED 拒否を注入で赤→復元→緑。

## 逸脱

現時点で設計逸脱なし。code-summary が参照する意図名(t250-swarm、repo-root plugins/)は統合時に実 landed 名(t251、tests/fixtures/plugins/)へ変わっており、trace 台帳は **実 landed path** を正とする(U12 = closure の reconciliation 責務)。逸脱が必要になれば実装前に停止・報告する。

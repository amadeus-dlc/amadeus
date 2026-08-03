# コード生成サマリー

## 結果

[Issue #2037](https://github.com/amadeus-dlc/amadeus/issues/2037) のnarrative文書バックフィルとは分離し、CLI verbとstage fieldのregistry driftを変更時に機械検出する`self-fix`を実装した。CLI dispatchと`Valid:`は33件、stage schema・emitter・authoritative spec・英日referenceは25件で双方向一致する。通常条件のself-promotion checkは既存plugin ORPHAN 31件によりredであり、Acceptance 7は未達のままである。

## Captured intentトレーサビリティ

User StoriesはSKIPのため、amadeus-stateのProjectを代替traceとした。

> GitHub Issue https://github.com/amadeus-dlc/amadeus/issues/2037 の文書バックフィルとは分離し、CLI dispatch と Valid verb 一覧、および stage schema 受理フィールドと Field reference の不一致を機械検出する registry drift guard を先行実装して再発防止する

| 要件 | 実装・証拠 |
| --- | --- |
| FR-1 | CLI dispatch／`Valid:` 33件一致、dispatch-only／phantom／empty／duplicate tamper |
| FR-2 | schema由来`ACCEPTED_STAGE_FIELDS` 25件とemitter／spec／英日registryの双方向一致 |
| FR-3 | 欠落9 fieldの完全表反映、`when` supported parity、reserved誤分類0件 |
| FR-4 | pure unit testとlive repository integration testの分離、5種tamperの代表診断 |
| FR-5 | 英日対象docsの`full=true`と無関係docsの`full=false` |
| FR-6 | coverage freshness、7 harness package、self face生成。通常promotion checkはAcceptance 7未達 |

## 作成・変更ファイル台帳

### 正本／application code

- `packages/framework/core/tools/amadeus-registry-drift.ts`（新規）
- `packages/framework/core/tools/amadeus-stage-schema.ts`
- `packages/framework/core/tools/amadeus-state.ts`
- `packages/framework/core/amadeus-common/protocols/stage-definition.md`

### Tests

- `tests/unit/t416-registry-drift-guard.test.ts`（新規）
- `tests/integration/t416-registry-drift-guard.integration.test.ts`（新規）
- `tests/integration/t65.test.ts`

`tests/.coverage-registry.json`と`tests/.coverage-ratchet.json`は正規generatorで再生成・検査したが、生成前後でbyte差がなかったため今回の変更ファイルではない。

### Docs／CI

- `docs/reference/15-stage-definition.md`
- `docs/reference/15-stage-definition.ja.md`
- `scripts/detect-ci-changes.sh`

Issue #2037が求める各fieldのnarrative H3全面追加は非対象であり、上記referenceには完全性markerと`when`の現行supported契約だけを追加した。

### Generated dist — 7 harness

- `dist/claude/.claude/amadeus-common/protocols/stage-definition.md`
- `dist/claude/.claude/tools/amadeus-registry-drift.ts`（新規）
- `dist/claude/.claude/tools/amadeus-stage-schema.ts`
- `dist/claude/.claude/tools/amadeus-state.ts`
- `dist/codex/.codex/amadeus-common/protocols/stage-definition.md`
- `dist/codex/.codex/tools/amadeus-registry-drift.ts`（新規）
- `dist/codex/.codex/tools/amadeus-stage-schema.ts`
- `dist/codex/.codex/tools/amadeus-state.ts`
- `dist/cursor/.cursor/amadeus-common/protocols/stage-definition.md`
- `dist/cursor/.cursor/tools/amadeus-registry-drift.ts`（新規）
- `dist/cursor/.cursor/tools/amadeus-stage-schema.ts`
- `dist/cursor/.cursor/tools/amadeus-state.ts`
- `dist/kimi/.kimi-code/amadeus-common/protocols/stage-definition.md`
- `dist/kimi/.kimi-code/tools/amadeus-registry-drift.ts`（新規）
- `dist/kimi/.kimi-code/tools/amadeus-stage-schema.ts`
- `dist/kimi/.kimi-code/tools/amadeus-state.ts`
- `dist/kiro/.kiro/amadeus-common/protocols/stage-definition.md`
- `dist/kiro/.kiro/tools/amadeus-registry-drift.ts`（新規）
- `dist/kiro/.kiro/tools/amadeus-stage-schema.ts`
- `dist/kiro/.kiro/tools/amadeus-state.ts`
- `dist/kiro-ide/.kiro/amadeus-common/protocols/stage-definition.md`
- `dist/kiro-ide/.kiro/tools/amadeus-registry-drift.ts`（新規）
- `dist/kiro-ide/.kiro/tools/amadeus-stage-schema.ts`
- `dist/kiro-ide/.kiro/tools/amadeus-state.ts`
- `dist/opencode/.opencode/amadeus-common/protocols/stage-definition.md`
- `dist/opencode/.opencode/tools/amadeus-registry-drift.ts`（新規）
- `dist/opencode/.opencode/tools/amadeus-stage-schema.ts`
- `dist/opencode/.opencode/tools/amadeus-state.ts`

### Generated self face — 5 harness

- `.claude/amadeus-common/protocols/stage-definition.md`
- `.claude/tools/amadeus-registry-drift.ts`（新規）
- `.claude/tools/amadeus-stage-schema.ts`
- `.claude/tools/amadeus-state.ts`
- `.codex/amadeus-common/protocols/stage-definition.md`
- `.codex/tools/amadeus-registry-drift.ts`（新規）
- `.codex/tools/amadeus-stage-schema.ts`
- `.codex/tools/amadeus-state.ts`
- `.cursor/amadeus-common/protocols/stage-definition.md`
- `.cursor/tools/amadeus-registry-drift.ts`（新規）
- `.cursor/tools/amadeus-stage-schema.ts`
- `.cursor/tools/amadeus-state.ts`
- `.kimi-code/amadeus-common/protocols/stage-definition.md`
- `.kimi-code/tools/amadeus-registry-drift.ts`（新規）
- `.kimi-code/tools/amadeus-stage-schema.ts`
- `.kimi-code/tools/amadeus-state.ts`
- `.opencode/amadeus-common/protocols/stage-definition.md`
- `.opencode/tools/amadeus-registry-drift.ts`（新規）
- `.opencode/tools/amadeus-stage-schema.ts`
- `.opencode/tools/amadeus-state.ts`

### Stage artifacts

- `amadeus/spaces/default/intents/260802-registry-drift-guard/construction/{unit-name}/code-generation/code-generation-plan.md`
- `amadeus/spaces/default/intents/260802-registry-drift-guard/construction/{unit-name}/code-generation/code-summary.md`

### 保護対象／今回の変更ではないもの

- `.codex/tools/data/stage-graph.json`は開始前からformal-model-check plugin投影を含むdirty fileであり、今回の作成・変更ファイルではない。開始前後のSHA-256 `38569b243f8adf62b964068c147fb819a8e997b0e708cadaa8a2f51e0ab7ea93`を維持した。
- `.codex/.amadeus-plugin-*`、`.codex/.amadeus-plugin-src/`、`.codex/plugins/`、`.codex/skills/`も今回の変更ファイルではなく、隔離前後でbyte-identicalに維持した。

## 実装判断

- `amadeus-registry-drift.ts`へCLI switch／`Valid:`／emitter `FIELD_ORDER`／version付きMarkdown registryのpure extractorを置き、comparatorはmissing／unexpected／duplicate／empty extraction／cardinality mismatchをfail-closedで返す。
- `amadeus-stage-schema.ts`は既存required／optional配列から`ACCEPTED_STAGE_FIELDS`を導出し、25件の別production定数を作らない。
- `amadeus-state.ts`の`Valid:`へ欠落3 verbだけを追加し、handler、verb意味論、表示順契約を変えない。
- 完全性markerとjudgement-heavy narrativeを分離し、Issue #2037のnarrative H3全面追加を持ち込まない。
- 英日stage-definition docs-only変更を既存full CIへ配線し、新規workflowを作らない。

## Focused／live／tamper／CI routeの再現証拠

### Focused command

```bash
bun test tests/unit/t416-registry-drift-guard.test.ts tests/integration/t416-registry-drift-guard.integration.test.ts
```

結果は10 pass／0 fail。内訳はunit 6 cases、live integration 4 casesである。

### Unit tamper cases

| Case | 結果 | 代表診断／assertion |
| --- | --- | --- |
| happy extraction／順序非依存比較 | PASS | dispatch／Valid／emitter／markerを抽出し、逆順集合も`valid: true` |
| dispatch-only追加 | PASS（tamperを検出） | `projection: missing entries: archive` |
| phantom `Valid:`追加 | PASS（tamperを検出） | `projection: unexpected entries: phantom` |
| docs omission | PASS（tamperを検出） | `missing: ["phase"]` |
| empty extraction | PASS（tamperを検出） | `projection: empty extraction`、`cardinality mismatch (2 !== 0)` |
| duplicate | PASS（tamperを検出） | `projection: duplicate entries: slug`、`cardinality mismatch (2 !== 3)` |

修正前のlive redはCLI dispatch 33件に対して`Valid:`が30件で、`Expected length: 33 / Received length: 30`だった。

### Live integration cases

| Case | 結果 |
| --- | --- |
| CLI dispatch ↔ `Valid:` | 33件対33件、双方向差分／重複0でPASS |
| schema ↔ emitter／spec／EN／JA | 各25件、`when`を含み双方向差分／重複0でPASS |
| `when` supported parity | schemaと3文書でactive、reserved表に0件でPASS |
| docs-only CI route | 英日対象pathは`full=true`、無関係referenceは`full=false`でPASS |

CI route単体は次でも再現できる。

```bash
printf 'docs/reference/15-stage-definition.md\0docs/reference/15-stage-definition.ja.md\0' \
  | bash scripts/detect-ci-changes.sh
```

代表出力は`full=true`、`drift=false`、`coverage=false`である。

### Comprehensive regression command

```bash
bun test \
  tests/unit/t416-registry-drift-guard.test.ts \
  tests/integration/t416-registry-drift-guard.integration.test.ts \
  tests/unit/t209-stop-hook-state-verb-carveout.test.ts \
  tests/unit/t248-stage-contract.test.ts \
  tests/unit/t62.test.ts \
  tests/unit/t250-unit-iteration-and-scope-preview.test.ts \
  tests/unit/t258-lifecycle-transaction.test.ts \
  tests/integration/t65.test.ts
```

結果は8 files、206 pass／0 fail／383 assertions。既存5 filesの174 pass／0 fail／298 assertionsも維持した。

## Comprehensive test strategyと品質gate

- **Unit:** t416 pure extractor／comparator、happy path＋5 tamper。
- **Integration:** t416 live filesystem／real shell、t65 stage inventory、既存CLI／schema回帰。
- **E2E:** N/A。Requirements NFR-6／Constraintsで、新しいservice、database、network I/O、runtime境界、外部journeyを追加しないことが承認済みである。代替としてlive repository filesystemと実`bash`のNUL入力境界をintegration最外層で検証した。
- `bun run typecheck`: PASS。
- `bun run lint`: exit 0。既存cognitive-complexity warningのみで、新規3 filesのBiome checkはwarningなし。
- `bun tests/gen-coverage-registry.ts --check`: PASS、575 units中317 covered、ratchet維持。
- `bun scripts/package.ts --check`: 7 harnessすべてPASS。
- `git diff --check`: PASS。

## Acceptance 7とpromotion例外

- **通常条件:** `bun run promote:self:check`はexit 1。core self face生成後も、開始前から保護対象だったplugin overlayをORPHAN 31件として報告する。したがって、通常check greenを求めるAcceptance 7は要件上未達である。
- **隔離条件:** plugin overlayを一時隔離したcheckはClaude／Codex／Cursor／OpenCode／KimiでPASSし、今回core投影のDIFFERS／MISSINGが0件であることを示した。これはcore drift不在の補助証拠であり、通常checkの代替証拠ではない。
- plugin overlayはbyte-identicalに復元され、stage graphとplugin audit／composition／dropsのhashも不変だった。ただし、この保全証拠も通常checkのexit 0を代替しない。

## 計画との差分と非対象

- 通常promotion checkが既存ORPHAN 31件で失敗するため、plan Step 9とStep 10は未完了のままとした。
- Issue #2037の各fieldに対するnarrative説明の全面追加、他registryへの横展開、新規sensor／CI workflow／dependencyは非対象のままである。
- commit、push、PR操作は実施していない。

## Issues / Concerns

- Acceptance 7未達。通常の`bun run promote:self:check`をgreenにするには、既存plugin overlayとself-promotion ownershipの解決が別途必要である。隔離checkを合格へ読み替えてはならない。

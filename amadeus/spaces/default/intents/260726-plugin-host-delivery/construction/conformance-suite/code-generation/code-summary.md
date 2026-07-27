# Code Summary — U7 conformance-suite

> 上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、performance-design、security-design、unit-of-work、requirements — 各入力の消費箇所は code-generation-plan.md の冒頭対応表を参照(本 summary は plan の実装結果の転記)。

## 実装内容

- **t188 追跡表** `tests/conformance/t188-trace.md`: 上流 awslabs/aidlc-workflows commit 29a31f78 の t188-plugin-compose.test.ts 32 ケースを verbatim 全行転記。disposition 機械集計 = adopted 2 / covered-existing 22 / n-a 8(合計 32、表行数と一致)。pin ヘッダ+ci-measurement-scope 宣言付き。
- **レポート導出** `scripts/conformance-report.ts`(170 行): parseTraceTable(単一 parser)/ suiteResultFromExitCode(0→green・非0→red・非整数 throw の fail-closed)/ parseTraceCoverage(disposition 機械再計算)/ buildConformanceReportSection・renderConformanceReportSection。
- **テスト 4 本**: t335(追跡表の機械検査 — 32 行・連番・語彙・target 実在・pin・coverage 再計算)/ t336(レポート純関数、落ちる実証両側)/ t337(fragment 順序決定性 = adopted #9)/ t338(recompile self-heal と --if-stale degrade = adopted #12)。
- **upstream sync レポート契約**(FR-10): amadeus-upstream-sync skill の references/artifact-contracts.md に `## Conformance` 節契約を追記(contrib 正本+ .claude / .agents の 3 面同期)。
- **境界ガード整合**: t258 corpus-sweep allowlist に `conformance-report-tooling` エントリを追加(skill 文書の `scripts/conformance-report.ts` 参照は id 付き正当参照 — t258 の設計どおりの拡張点)。

## 変更ファイル

- 新規: tests/conformance/t188-trace.md、scripts/conformance-report.ts、tests/integration/t335-*.ts、tests/integration/t338-*.ts、tests/unit/t336-*.ts、tests/unit/t337-*.ts
- 変更: {contrib,.claude,.agents}/skills/amadeus-upstream-sync/references/artifact-contracts.md(3 面)、tests/integration/t258-boundary-guard.integration.test.ts(allowlist 1 エントリ)
- dist / self-install への投影なし(scripts/ は配布対象外 dev tooling、skill references は promote:self 同期面のみ)

## 検証コマンドと実測 exit code(conductor 再実測)

- `bun test t335 t336 t337 t338`: 17 pass / 0 fail — exit 0
- `bun run typecheck`: exit 0
- `bun run lint`: exit 0
- `bun run dist:check`: exit 0
- `bun run promote:self:check`: exit 0
- `bash tests/run-tests.sh --ci`: RESULT: PASS — exit 0
  - 初回 run は 2 件赤: t258(allowlist 漏れ — 上記是正で閉包)、t177(単体・スイート再実行とも pass — 負荷起因の偽赤と再帰属)

## 逸脱・特記

- 逸脱なし(disposition 判定の根拠は追跡表ヘッダと plan に明文化 — 面の追加/除外ではなくアーキテクチャ相違の帰結)。
- builder が commit 前に停滞したため、conductor が c5 規律(差分検分+全検証再実行)で引き取り、t258 是正・本 summary 作成・commit を実施。

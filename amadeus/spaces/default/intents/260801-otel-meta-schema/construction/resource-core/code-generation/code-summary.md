# Code Summary — U1 resource-core(Bolt 1)

上流入力(consumes 全数): code-generation-plan.md、functional-design 3成果物、nfr-design 5成果物 — 実装は plan のスライス列どおり、検証は nfr-design の決定的テスト形どおりに実施した。

## 着地

- **PR [#1899](https://github.com/amadeus-dlc/amadeus/pull/1899) — MERGED**(スカッシュ、main = 9225e09a2 で着地 grep 実測済み)。worktree 4コミット(base 7aa22526e → HEAD 3753b14f1、全て Refs #1868)

## 変更面(正本)

- 新設: `packages/framework/core/otel/resource.ts`(buildResource / currentResource 遅延 memo / RESOURCE_REDACTION_POLICY)、`otel/resource-suppliers.ts`(閉集合4キー supplier+supplyTokenUsage no-op seam)、`tests/integration/t-otel-resource.test.ts`、`tests/unit/t-otel-resource-suppliers.test.ts`
- 改修: tracer-provider(:137 literal → getter)、local-span/log/metric-exporter(resource 付与+export 境界 redaction)、hooks/amadeus-session-start.ts(session.id supply)、fixture 3件+mechanism ratchet 登録
- 生成物: dist 7ハーネス+self-install 同期(dist:check / promote:self:check green)

## 検証実測

- typecheck / lint / coverage:ci(724 files・9897 assertions)/ dist:check / promote:self:check = 全て exit 0
- patch coverage: measured 124 / covered 124 / uncovered 0(allowlist 追加なし)。project coverage 89.39%
- 落ちる実証5件(注入→赤→fix SHA 復元)。conductor 独立再検証: full CI PASS+swarm referee check converged / tampered=false
- 独立 PR レビュー: READY(GoA 2 — Minor 2件は U5 引き継ぎ/diary 記録で閉じ)

## 未検証面の明示(verdict-names-unverified-facets)

- FR-RES-3 の hook 半分(SessionStart → store 行 session.id の単一プロセス実測)は未検証 — U5 の受け入れ項目として引き継ぎ(E-OMSB1-DEV 留保)

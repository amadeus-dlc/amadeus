# Code Summary — U2 span-attrs(Bolt 2a)

上流入力(consumes 全数): code-generation-plan.md、functional-design 3成果物、nfr-design 5成果物 — 実装は plan の経過どおり、E-OMSB2A-DEV 裁定条件2件を必須受け入れ基準として実施。

## 着地

- **PR [#1905](https://github.com/amadeus-dlc/amadeus/pull/1905) — MERGED**(スカッシュ)。初回 CI の t224 赤は re-run で解消(フレーク 1/2、base/ローカルで再現せず)

## 変更面(正本)

- 新設: `otel/span-context.ts`(6キー resolver・memo・resetSpanContextForTests)、tests/unit/t-otel-span-context.test.ts(13)、tests/integration/t-otel-span-attrs.test.ts(12)
- 改修: `otel/redaction.ts`(SPAN_CONTEXT_ATTRIBUTE_KEYS — 「span 文脈属性・registry 語彙ではない」層コメント付き)、`otel/tracer-provider.ts`(SpanContextGetter 搬送・resolver 先置き後勝ち merge。recordException 不可触 = U3 交差回避)
- dist 7ハーネス+self-install 同期

## 検証実測

- typecheck / lint / coverage:ci / dist:check / promote:self:check = 全 exit 0。patch coverage 62/62 uncovered 0。span-context.ts 単体 LF42/LH42
- 落ちる実証: safeKeys spread 1行除去 → 8 fail 実測 → 復元 23 pass(span record 直読では検出不能な欠陥クラスの実証)
- 独立 PR レビュー READY(GoA 1・留保なし)。referee check converged / tampered=false

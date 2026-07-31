# Business Rules — U5: context-propagation

上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`（参照済み）

## 不変条件

- BR-1: 短命 process は長命の Intent root Span を process memory に保持しない。Intent Trace Context は永続化／復元で接続する（FR-TRC-4）
- BR-2: 子 process への Context 伝播は W3C Trace Context（`traceparent`／`tracestate`）の環境変数注入で行う（FR-TRC-5）。独自形式の伝播は持たない
- BR-3: CLI・hook・subagent・sensor・子 process はすべて同じ Trace に接続される。孤立 trace を生成する経路は欠陥とみなす
- BR-4: env 注入する値は trace 相関 ID のみとし、機微情報（prompt・argv・credential・無許可パス）は注入しない（FR-DST-3 と整合）
- BR-5: Context 抽出に失敗した子 process は新規 root trace を開始してよいが、その事実を diagnostic Log に残す（fail-open。canonical 経路には影響しない）

## 条件付き振る舞い

- BR-6: `restoreIntentContext()` が record を見つけられない場合（旧 intent・未移行期間）、新規 anchor を生成して永続化する。混在期間の後方互換を保つ
- BR-7: Context Manager は U1 の検証結果（既製 `@opentelemetry/context-async-hooks` または Amadeus Adapter）をそのまま利用し、U5 では差し替えない

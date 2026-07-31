# Security Design — U5: context-propagation

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

security-requirements.md の要件（carrier の機微情報排除・境界検証）に対する設計。方針は「carrier 生成側でそもそも機微値を載せない」第一層防御である。

## carrier の内容制限

- carrier 用途の env キーは `traceparent`／`tracestate` の 2 つのみ。carrier 用の独自 env キーを新設しない（tech-stack-decisions.md § carrier 形式）
- `tracestate` への vendor エントリ追加は行わない。W3C Trace Context 標準フィールド以外の値を運ばない（BR-2/BR-4）
- 注入値・永続化 Intent Context の内容は trace ID／span ID／trace flags／intent ID に限定し、payload 系データ（prompt・argv・credential・パス）を構造的に持たない。型を 4 フィールドの判別可能な構造に固定し、任意キー値の混入を型で排除する

## 外部入力の検証

- 外部から注入された `traceparent` は W3C 形式検証（version・hex・長さ・flags 範囲）を通さない値を拒否し、fail-open で新規 root trace へ落とす（BR-5）。不正値をそのまま parent に採用する経路を作らない
- trace ID 生成は `node:crypto` 由来の既存 ID 生成に従う（technology-stack.md 準拠）

## 検査への組み込み

- 注入 env・永続化 record を VER-2 credential-free 検査ゲートの走査対象に含める（security-requirements.md § 検証）
- redaction 二層（FR-DST-3）は U1/U4 が担い、U5 は carrier 生成側の非搭載保証で第一層を補強する。carrier への redaction 適用は行わない（載せる値が相関 ID のみのため二重適用は不要）

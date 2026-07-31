# Security Requirements — U5: context-propagation

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## carrier の機微情報排除（FR-DST-3／BR-4）

- env 注入する値は trace 相関 ID のみとする: `traceparent`（version-trace ID-span ID-flags）と `tracestate` 以外の env キーを carrier 用途に新設しない
- 注入値に prompt・argv・credential・無許可パスを含めない。`tracestate` への vendor エントリ追加は行わない（独自形式の伝播禁止、BR-2）
- 永続化する Intent Context も同ポリシー: trace ID／span ID／trace flags／intent ID のみで、payload 系データを持たない
- 検証: 注入 env・永続化 record が credential-free であることを VER-2 の telemetry 検査ゲートで走査対象に含める

## 境界

- trace ID は `node:crypto` 由来の既存 ID 生成（technology-stack.md 準拠）で、外部から注入された `traceparent` は W3C 形式検証を通さない値を拒否して fail-open（BR-5）する
- redaction は write-time と export 境界の二層（FR-DST-3）が担い、U5 は carrier 生成側で「そもそも機微値を載せない」ことで第一層を守る

# Domain Entities — U5: context-propagation

上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`（参照済み）

## IntentTraceContext（U1 定義の拡張）

U1 の entity を本番化したもの。

| 属性 | 説明 |
|---|---|
| traceId | intent 全体で共有する trace ID |
| anchorSpanId | intent anchor の span ID（remote parent 参照先） |
| intentId | 対象 intent |
| schemaVersion | Context 永続化形式の version（混在期間の後方互換、BR-6） |

ライフサイクル: 生成（birth/resume）→ persist → 各短命 process で restore → remote parent 接続。

## PropagationCarrier（W3C）

| 属性 | 説明 |
|---|---|
| traceparent | W3C 形式の trace/span/flags |
| tracestate | 任意の vendor state（初期は空） |

注入先は子 process の環境変数。subagent には conductor が prepare 時に付与する。

## 関係

- IntentTraceContext 1 — N PropagationCarrier（各短命 process への伝播）
- PropagationCarrier は CanonicalEventRecord／SpanRecord の traceId・spanId と相関する（U1 の entity と同一 trace 空間）

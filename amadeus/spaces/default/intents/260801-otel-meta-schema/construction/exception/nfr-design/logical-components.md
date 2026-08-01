# Logical Components — U3 exception

上流入力(consumes 全数): performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions — nfr-requirements SKIP により不在(expected)、各面要件は requirements.md NFR-1〜3 から代替導出(本ファイルは4設計の適用先コンポーネント目録)。business-logic-model.md(実在)のコンポーネント分担を消費。

## コンポーネント目録と NFR 適用点

| コンポーネント | 責務 | 適用 NFR 設計 |
|---|---|---|
| `otel/redaction.ts`(改修 — redactStacktrace 新設) | path マスク3分類+credential scrub の純関数 | security(第3統制)、performance(行単位1パス・線形性実測) |
| `otel/tracer-provider.ts` :145-157(改修) | recordException 拡張(type/stacktrace/write-time redaction) | reliability(fail-open 3分岐+内部 try 遮断)、security(write-time 層適用点) |
| `otel/local-span-exporter.ts` :88-99(無改変) | export 境界の event attributes redaction(既存 #1719) | security(二層の第2層 — 本 unit は消費のみ) |
| `otel/event-registry.ts` :827-835(改修) | exception イベント定義への optional 属性追加 | reliability(registry required 検証 fail-closed は不変) |

## 障害ドメインと blast radius

- redactStacktrace は純関数 — 障害ドメインは呼出しスタック内で完結し、二次例外は recordException 内部 try で遮断(reliability-design)。最悪ケース = stacktrace 属性なしの exception event(本体無影響)
- registry 改修は optional 属性の追加のみ — 既存 event の required 検証を変えず、既存 emitter の互換を保つ

## 共有資源

- 共有は `.amadeus-otel/` store のみ(services.md 依拠・additive)。exception event は既存 span 行への per-record 埋め込みで追記され、新規のロック・排他は導入しない

## dist 投影(NFR-4)

上記改修ファイルは packages/framework/core/ 配下 — 変更ごとに package.ts+promote:self を同一 PR で回し、7ハーネス dist+self-install を同期する(bt-dist-regen-seven-harnesses)。

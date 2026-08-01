# Logical Components — U2 span-attrs

上流入力(consumes 全数): performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions — nfr-requirements SKIP により不在(expected)、各面要件は requirements.md NFR-1〜2 から代替導出(本ファイルは4設計の適用先コンポーネント目録)。business-logic-model.md(実在)のコンポーネント分担を消費。

## コンポーネント目録と NFR 適用点

| コンポーネント | 責務 | 適用 NFR 設計 |
|---|---|---|
| resolver(span-attrs 新設 — tracer-provider.ts の span record 組み立て部) | 6キー閉語彙の解決+memo | performance(プロセス1回 memo)、reliability(per-key fail-open)、security(閉語彙統制) |
| cursor / state 読取(既存 activeSpace/activeIntent 系の消費) | intent/space/stage/phase の解決元 | reliability(不在 = 省略) |
| env 受け口(AMADEUS_AGENT_TYPE/ID) | 将来供給時のみ有効な fail-open 受け口 | reliability(現行 = 常に省略、FD 実測) |
| merge 点(AmadeusSpan の attributes 後勝ちマージ) | resolver 出力 < 明示 setAttributes | security(観測汚染防止) |
| `otel/local-span-exporter.ts`(無改変 — 消費のみ) | export 境界 redaction | security(二層の第2層) |

## 障害ドメインと blast radius

- resolver はプロセスローカル・読取専用 — 障害ドメインは自プロセスの span attributes 欠落に閉じ、store・他プロセス・journal 経路(別実装)へ波及しない。最悪ケース = 属性なし span(本体無影響、NFR-1)

## 共有資源

- 読取のみ共有: cursor ファイル(active-space/active-intent)と state ファイル。書込共有は `.amadeus-otel/` store への既存 append 経路のみで、本 unit は新規の書込・ロックを導入しない。store/Relay 面は無改変(services.md 依拠)

## dist 投影(NFR-4)

改修は packages/framework/core/ 配下 — 変更ごとに package.ts+promote:self を同一 PR で回し、7ハーネス dist+self-install を同期する(bt-dist-regen-seven-harnesses)。

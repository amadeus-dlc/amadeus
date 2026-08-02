# Logical Components — U5 metrics

上流入力(consumes 全数): performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions — nfr-requirements SKIP により不在(expected)、各面要件は requirements.md NFR-1〜4 から代替導出(本ファイルは4設計の適用先コンポーネント目録)。business-logic-model.md(実在)のコンポーネント分担を消費。

## コンポーネント目録と NFR 適用点

| コンポーネント | 責務 | 適用 NFR 設計 |
|---|---|---|
| `otel/meter-provider.ts`(改修) | registerMeterProvider 配線+registeredMeterProjectDir 新設 | reliability(未登録 no-op の非 throw 判定点) |
| `otel/bootstrap.ts`(改修) | metrics arm の配線(trace arm :117 と同型) | scalability(中立境界 — ハーネス分岐なし) |
| `otel/metrics-instruments.ts`(新設) | INSTRUMENTS 閉集合5計器の定義と取得 | security(閉集合 fail-closed)、performance(O(1) add/record) |
| 計測点配線(audit append / span end / subagent hook の各既存経路) | add/record 挿入 | reliability(try 遮断・非侵襲)、performance(経路コストに埋没) |
| `otel/local-metric-exporter.ts`(無改変 — 消費のみ) | 既存 export+redaction(:71) | security(export 層) |

## 障害ドメインと blast radius

- 計測点は try 遮断で縮退(記録なし)— 障害ドメインは計測点1箇所ずつに閉じ、既存経路・他計器へ波及しない。最悪ケース = 一部計器の欠測(本体無影響、NFR-1)
- meter 未登録環境(metrics arm 未配線ハーネス)は全計測点が no-op — 環境差はゼロ計測として安全側に倒れる

## 共有資源

- 共有は `.amadeus-otel/` store(metrics-)のみ — per-record 追記でロック不要。token usage の供給 seam(resource-suppliers)は U1 所有で、本 unit は消費のみ(DAG エッジ metrics→resource-core)

## dist 投影(NFR-4)

上記新設・改修ファイルは packages/framework/core/ 配下 — 変更ごとに package.ts+promote:self を同一 PR で回し、7ハーネス dist+self-install を同期する(bt-dist-regen-seven-harnesses)。

# Discovered Rules — 260719-mirror-productization

上流入力(consumes 全数): code-structure、technology-stack、dependencies、code-quality-assessment、architecture、business-overview。

## 分析ノート(規則節の外 — promote 非対象)

本再実行で新たに発見された ALWAYS/NEVER 級の硬い制約は 0 件。既存 project.md Mandated/Forbidden と現行実務の整合は evidence.md の照合で確認済み。gh 依存は scripts/ の2ファイル(amadeus-mirror.ts / amadeus-leader-sync.ts)に閉じ、packages/framework/ 内 0 件(gh-scripts-boundary と Bun-only Forbidden が実装上も維持 — re-scan (6))。本 intent が予定する gh optional ノルム改定は発見済み規則ではなく将来の設計裁定であり、ここには書かない。以下の規則2節は意図的に空(promote は 0 件 append の no-op)。

## Mandated

## Forbidden

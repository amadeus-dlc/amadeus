# Scalability Requirements — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 規模モデル

- 設定の規模: `mirror-projects` 配列の要素数は運用者が設定する対象 Project 数 — 前提 A-2(所属 Project は少数 — requirements)により実用上有界で、数値上限は設けない。parse・層解決のコストは要素数に線形。
- 診断の規模: Project 診断列の生成コストは同期対象 Project 数 N に線形(requirements NFR-3 の線形性 — business-logic-model の per-Project 手順3)。台帳由来の部分成功検出も entry 数に線形。

## スケーリング方針(非適用の明示)

- 水平スケーリング・キャッシュ・circuit breaker は導入しない — 常駐プロセスを持たない CLI には適用対象が存在しない(根拠: requirements FR-1b — repair status はオンデマンドの単発照会で polling ではない。cid:nfr-design:c1 の置換規律)。
- 設定の層数は既存3層(global/space/intent)固定 — 層の追加・動的化をしない(requirements FR-5a の既存 config への closed-schema 拡張)。

## 成長時の挙動

- Project 数・設定要素数が増えても、層解決の意味論(有効値を持つ最後の層が勝つ全置換 — business-rules BR-U4-2)と診断の分類意味論(resolution 4値 — business-logic-model 手順3)は不変 — 規模は線形コスト増としてのみ現れる(technology-stack 断面: 新機構ゼロで成立)。

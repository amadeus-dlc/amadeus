# Scalability Requirements — u1-project-sync-skeleton

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 規模モデル

- 1 boundary あたりの Project API 呼び出し回数は所属 Project 数 N に対して**線形**(requirements NFR-3)。business-logic-model の直線経路(所属照会 → 追加 → 解決 → 適用)は Project ごとに独立で、N の増加は呼び出し回数の線形増としてのみ現れる。
- 前提: 所属 Project は少数(requirements A-2)— 実用上有界で、数値上限は設けない。U1 は単一の設定済み Project が典型(unit-of-work の walking skeleton 断面)。

## スケーリング方針(非適用の明示)

- 水平スケーリング・キャッシュ・circuit breaker は導入しない — 常駐プロセスを持たない CLI には適用対象が存在しない(根拠: requirements FR-1b — daemon・polling・GitHub Actions を導入しないチェーン内実行のみ。cid:nfr-design:c1 の置換規律: 決定的なファイル境界と fail-closed 契約で代替)。
- rate-limit は既存 retryable 分類(429 → rate-limit)で吸収し、新たな throttle 機構を導入しない(requirements NFR-3 後段)。

## データ増加

- U1 の projectSync 台帳は synced entry の最小形のみ(business-rules BR-U1-9 — pending 台帳は U2 責務)。台帳サイズは同期対象 Project 数に線形で、A-2 により有界。

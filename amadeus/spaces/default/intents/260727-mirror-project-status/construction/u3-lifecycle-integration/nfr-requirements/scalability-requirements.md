# Scalability Requirements — u3-lifecycle-integration

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 規模モデル

- boundary 別同期(business-logic-model の表 — 既存5種への配線)は boundary 1回あたり同期経路1回 — boundary 種別数は固定(business-rules BR-U3-7 で新設禁止)であり、規模の変数は同期対象 Project 数 N のみ(requirements NFR-3 の線形性を継承)。
- `completionProjectGate` の評価コストは台帳 entry 数に線形(business-rules BR-U3-8 — 台帳のみ入力のオフライン評価)。台帳は U2 の規模論(A-2 前提で有界)に従うため、gate 評価の規模懸念は実用上存在しない。

## スケーリング方針(非適用の明示)

- 水平スケーリング・キャッシュ・circuit breaker は導入しない — 常駐プロセスを持たない CLI には適用対象が存在しない(根拠: requirements FR-1b — daemon・polling・GitHub Actions を導入しないチェーン内実行のみ。cid:nfr-design:c1 の置換規律)。
- close 保留の再評価は次の boundary / manual sync 駆動(business-rules BR-U3-5)— 再評価キュー・スケジューラを導入しない(technology-stack 断面: 新機構ゼロで成立)。

## 成長時の挙動

- Project 数が増えても completion の close 条件は「全同期対象が Done」のまま不変(requirements FR-8a)— N の増加は gate 評価の線形コスト増としてのみ現れ、判定意味論は変わらない。

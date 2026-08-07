# Security Design — landed-report

上流入力(consumes 全数): `business-logic-model`(`construction/landed-report/functional-design/business-logic-model.md` — evaluate 改訂フロー・landed 経路・sensor 対応表を設計前提として消費)。nfr-requirements 系 5 consumes は scope self-feature の実行構成で nfr-requirements ステージが SKIP のため設計どおり不在(requirements.md の NFR-1〜4 が正本)。

## 入力境界と fail-closed

- GraphQL 応答は信頼境界外入力 — `PrLifecycleState.parse` の閉集合 throw(BR-1)と `LandedFacts.parse` の null 拒否(BR-3)で fail-closed を保存。既存 stderr digest 化(機微不保持)は無変更。
- landed report は公開メタデータ(PR 番号・SHA・timestamp)のみを記録 — 認証情報・機微情報の新規面なし。

## 偽装防御

- 手書き landed report は sensor の landed 専用規則(converged=false 必須・mergedAt/SHA 実在必須)が advisory finding として検出(ADR-4)。ゲート緩和なし(advisory 契約維持)。
- landed は HUMAN_TURN・audit 裁定経路を使わない(BR-4)— 認可 seam への新規接触なし。

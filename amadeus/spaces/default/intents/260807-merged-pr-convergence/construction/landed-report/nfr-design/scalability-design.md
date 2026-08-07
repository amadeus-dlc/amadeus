# Scalability Design — landed-report

上流入力(consumes 全数): `business-logic-model`(`construction/landed-report/functional-design/business-logic-model.md` — evaluate 改訂フロー・landed 経路・sensor 対応表を設計前提として消費)。nfr-requirements 系 5 consumes は scope self-feature の実行構成で nfr-requirements ステージが SKIP のため設計どおり不在(requirements.md の NFR-1〜4 が正本)。

## 適用判定

- 単発 CLI・単一 PR 単位の処理でスケーラビリティ要件は不在(`cid:nfr-design:c1` — 常駐 service 向け機構を機械適用しない)。
- gh API 呼び出しはマージ済み PR で現行より減少(retry 5 回 → fetch 1 回)— レート面はむしろ改善。

## 将来条件

- 複数 unit の一括 report 化等が要件化された場合は別 intent(現 Issue #2401 のスコープ外)。

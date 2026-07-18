# Decision Log — test-pyramid-rebuild(ideation)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`

## 確定事項

| # | 決定 | 出典 |
|---|---|---|
| D-1 | サイズ基準(小/中/大=プロセス/ネット/FS の動的性質)で再分類、計測導出 | Issue #684+ユーザー P0 |
| D-2 | feasibility=GO(既存 classifyTestSize 基盤) | 実測、E-TPR-FS 0件成立 |
| D-3 | In=台帳+設計+計画、Out=実移設(別 intent) | E-OC1 承認(SD Q1) |
| D-4 | units 3分割候補(U1 台帳/U2 層設計/U3 計画) | E-OC1 承認(SD Q2) |
| D-5 | inception 進行承認 | E-OC1 承認(AH Q1) |

## 未決事項(requirements/design 選挙へ)

| # | 論点 | 登録先 |
|---|---|---|
| U-1 | 比率目標(各層の望ましい割合)・実行時間予算の値 | raid-log R-2 |
| U-2 | 層境界の具体定義(size と tier の対応) | Issue 実装スコープ2 |
| U-3 | 移設対象の選定基準(どの medium unit を優先移設) | raid-log R-3 |

## grant/delegate 証跡

IC/FS/SD は standing grant 40127789 経路で approve(delegate 依頼なし — 中間ゲート初受理実弾成功)。AH は ideation 最終=phase boundary で grant 40127789(phase-boundary 込み)の初 phase-boundary 受理観測対象。

# NFR Design — 質問票(0問様式、unit: protocol-core)

上流入力(consumes 全数): engine directive の解決済み consumes は空(本スコープ self-feature は nfr-requirements を SKIP — security-requirements / tech-stack-decisions は `consumes_absent`(`expected: true` = 設計上の不在))。fallback として `requirements.md` の FR/裁定と U1 functional-design(`business-rules.md` / `domain-entities.md`)を上流とする(欠落成果物の内容は発明しない)。

## 選挙不要判定(E-OC1 証跡)

- 判定: 質問 0 問。U1 protocol-core(spec kind — 実行体を持たない protocol/skill md 配布物)の security 設計は、既決裁定からの一意導出=執行クラス(根拠種別: 既決裁定からの一意導出、1問1行) — (1) 機械可読マーカーの語彙非交差と fail-open 禁止は FD BR-U1-6/7・BR-U2-4 で既決 (2) 骨格の供給元完全性は BR-U1-1(SHA ピン+byte 不変+MIT ヘッダ保存)で既決 (3) 配布経路は FR-PROJ-4(既存 build/source-only 検査)で既決 (4) 認証・認可・暗号は実行体不在につき非適用(components.md の C1/C2/C5 所有境界)。
- ユーザー承認: 2026-08-10T08:07:51Z(AskUserQuestion「nfr-design を全 unit 0問様式で進める」承認。真の未決が生じた場合は個別エスカレーション)

## 裁定の記録

- 0問方針(既決裁定の unit 面展開)で成果物生成へ進む。
- ユーザー承認: 2026-08-10T08:07:51Z

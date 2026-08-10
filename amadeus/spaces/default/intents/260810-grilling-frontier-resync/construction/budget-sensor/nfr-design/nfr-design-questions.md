# NFR Design — 質問票(0問様式、unit: budget-sensor)

上流入力(consumes 全数): engine directive の解決済み consumes = `business-logic-model.md`(U2 functional-design — 判定フローと決定表の正本)。stage frontmatter 宣言のうち security-requirements / tech-stack-decisions(および performance/scalability/reliability-requirements)は本スコープ(self-feature)が nfr-requirements を SKIP するため `consumes_absent`(`expected: true` = 設計上の不在)。fallback は `requirements.md` の FR と U2 functional-design 成果物。

## 選挙不要判定(E-OC1 証跡)

- 判定: 質問 0 問。U2 budget-sensor(library kind — 既存センサー dispatcher に embedded 実行される検査モジュール)の NFR 設計は、既決裁定からの一意導出=執行クラス(根拠種別: 既決裁定からの一意導出、1問1行) — (1) fail-open 封鎖・loud finding・単一 cutoff ゲートは FD BR-U2-3/8/9 と business-logic-model の決定表で既決 (2) 語彙非交差の vacuity guard は BR-U2-4 で既決 (3) テスト層配置(in-process seam / integration 層)は BR-U2-7 と既存ノルム(fs-tests-integration-first)で既決 (4) advisory 契約(exit 0 固定)は component-methods.md の既存契約維持で既決。
- ユーザー承認: 2026-08-10T08:07:51Z(AskUserQuestion「nfr-design を全 unit 0問様式で進める」承認。真の未決が生じた場合は個別エスカレーション)

## 裁定の記録

- 0問方針(既決裁定の unit 面展開)で成果物生成へ進む。
- ユーザー承認: 2026-08-10T08:07:51Z

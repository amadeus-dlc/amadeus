# Reliability Design — u5-docs-and-distribution

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

reliability-requirements の「機械検査の網羅と実測記録」を、既存決定的ガードの再利用と実測転記規律で実現する。

## 機械検査の構成

- **drift guard**: dist:check / promote:self:check の green 機械確認(business-logic-model の配布同期フロー — reliability-requirements)。正本⇔生成物の一致は既存の決定的ガードが保証し、U5 は実行と exit code 記録のみ(tech-stack-decisions の既存ガード再利用決定)。
- **parity**: docs⇔契約台帳の一致は既存 parity テストで機械固定(business-logic-model のドキュメント更新フロー)。
- **台帳不変検収**: 新設モジュールゼロの期待値を機械確認し、変化は逸脱シグナルとして停止・報告(reliability-requirements — security-design の検出器と同一機構)。

## 実測記録の設計

- 検証コマンド群の exit code・件数は集計コマンドの実出力からのみ転記(reliability-requirements)— 見込み green 報告の禁止。検収は既存枠1回実行(performance-requirements)で、母集団は固定集合(scalability-requirements)。
- 新設ガード(該当分)は落ちる実証+正当データ両側実測を完成条件とし、注入 → 赤実測 → revert を不可分1セットで実施(reliability-requirements)。

## 障害時の回復設計

- drift guard 赤・parity 赤は正本修正 → 再生成/再同期の一方向で回復(business-logic-model のエラー節)— 生成物側の手当てで隠さない(security-requirements の完全性契約)。
- 検収での他 Unit テスト欠落は当該 Unit の欠落として可視化(reliability-requirements の責務分離)。

## 非目標

- SLA/SLO・バックアップ: N/A(reliability-requirements の N/A 規律 — 成果物は git 管理で回復手段はバージョン管理)。

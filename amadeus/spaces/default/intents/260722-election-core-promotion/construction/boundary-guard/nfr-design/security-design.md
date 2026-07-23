# Security Design — boundary-guard

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 設計

- security-requirements の「新規入力境界なし」を保つ構造: 述語は business-logic-model のとおり純関数(FS・環境変数・プロセス非接触)、検出は substring 探索・allowlist のみ固定 regex(security-requirements の substring 設計決定の実装位置 = 述語1内部)
- AllowRule.parse(スマートコンストラクタ)が不正 allowlist 宣言を構造拒否(parse-don't-validate)

## 検証設計

- security-requirements の N/A(追加検査なし)を維持 — 攻撃面を作らない設計自体が対策。reliability-requirements の決定性設計と同一機構

## 他 NFR との整合

- substring 設計は performance-requirements の予算内実行と scalability-requirements の走査線形性の両方の前提。tech-stack-decisions の新規依存ゼロ方針により、セキュリティ面のサプライチェーン増分もゼロ

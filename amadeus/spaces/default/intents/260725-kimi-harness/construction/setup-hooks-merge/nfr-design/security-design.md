上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Security Design — setup-hooks-merge

> 上流入力の使用箇所: security-requirements.md の4基準(config 保護・明示承認・バックアップ・秘密情報非接触)を設計の対象とする。

## 対象の概要

security-requirements.md が定める脅威モデルを、マージ機構の実装設計に落とす。

## 設計

- **編集の限定**: planMerge/applyMerge はマーカー行の間の領域のみを対象とし、ブロック外はバイト保持(security-requirements.md §脅威モデルと基準)。重複検出(2組以上)と構文不正は loud fail(business-logic-model.md §planMerge)
- **承認の流れ**: 既存の plan report への差分表示 → wizard confirm → 拒否時は変更なし + 手動手順(ADR-5 の流儀。security-requirements.md §脅威モデルと基準)
- **バックアップ**: apply 前に `config.toml.amadeus-backup-<ISO>` を必ず作成し、削除はユーザーに委ねる
- **秘密情報**: マージ対象は hook 配線のみで、credential 領域(providers 等)には一切触れない(設計で参照しない)

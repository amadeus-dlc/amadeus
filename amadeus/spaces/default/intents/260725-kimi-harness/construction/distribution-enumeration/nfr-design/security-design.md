上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Security Design — distribution-enumeration

> 上流入力の使用箇所: security-requirements.md の3基準(生成物・Q1 手順・他プロジェクト非影響)を設計の対象とする。

## 対象の概要

security-requirements.md のとおり、書き込み対象は本リポジトリ内に限られる。

## 設計

- **生成物の検査**: dist/kimi とルート .kimi-code は byte-parity(`dist:check` が temp 再生成との byte-diff で正本と生成物の一致を検査する機構)と promote:self:check で改ざんを検出(security-requirements.md §脅威モデルと基準)
- **dogfood の配線**: Q1 手順(バックアップ・マーカー・除去)に従い、managed block 以外を変更しない(security-requirements.md §脅威モデルと基準)
- **境界**: 他プロジェクト・ユーザーの環境への書き込みは行わない(設計に経路を持たない)

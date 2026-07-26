上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Reliability Design — distribution-enumeration

> 上流入力の使用箇所: reliability-requirements.md の3機構(原子性・drift guard・回復)を設計の対象とする。

## 対象の概要

reliability-requirements.md が定める信頼性を、列挙と drift guard の設計に落とす。

## 設計

- **原子性**: U5 所有の閉集合(plugin-projection の2集合・promote-self の managedDirs/PACKAGE_HARNESSES)は同一コミットで追加する(reliability-requirements.md §信頼性の仕組み)
- **drift guard**: `dist:check`・`promote:self:check` を green に維持し、片落ちは型検査または既存テストで検出される構造を維持(reliability-requirements.md §信頼性の仕組み)
- **回復**: 破損時は `package.ts kimi`(dist 面)/ `promote:self`(ルート面)の再実行(reliability-requirements.md §信頼性の仕組み)

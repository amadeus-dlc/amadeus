上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Logical Components — distribution-enumeration

> 上流入力の使用箇所: tech-stack-decisions.md §選択(同形追加・既存基準で検証・生成は package.ts/promote-self)と business-logic-model.md §列挙フロー(step 1-4 の編集対象と前提)を構造の根拠とする。

## 対象の概要

本 Unit の論理構成は「列挙(4対象: setup・plugin-projection・promote-self・detect-ci-changes) → 生成・検査 → dogfood(実機検証)」の3段。

## 構成

| 論理部品 | 役割 | 対応する実体 |
|---|---|---|
| 列挙 | setup・plugin-projection・promote-self・detect-ci-changes の各所に kimi 追加 | 既存ファイルへの同形追加 |
| 生成・検査 | dist/kimi の再生成と drift guard | `package.ts kimi`・`dist:check`・`promote:self:check` |
| dogfood | ルート .kimi-code の生成と実機確認 | `promote:self` + kimi セッション |

## 関係

- 列挙が生成・検査の前提(plugin-projection(PACKAGE_HARNESSES)と promote-self(managedDirs)が dist/kimi を対象化し、detect-ci-changes は `.kimi-code/*` の CI path glob を追加する — business-logic-model.md §列挙フロー step 1-4)
- dogfood は生成物と U2(adapter 実在)・U3(managed block 配線)・U4(doctor arm)の完了を前提とする(business-logic-model.md の前提明記どおり。実機確認は実行から導出する)

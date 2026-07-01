# R005: README と検証条件の整合

## 要求

README を更新する場合に、skill 契約、validator、example、検証入口とのずれを残さない確認条件を説明できる。

## 背景

README は利用者向けの入口である。
README だけを更新すると、skill 本文、eval、昇格先成果物、validator、example snapshot の契約とずれる可能性がある。

## 受け入れ状態

- README 更新が必要な場合に、対象 skill 契約との整合確認を説明できる。
- validator または text contract で確認すべき観点を説明できる。
- example snapshot の更新が必要かどうかを判断できる。
- 標準検証または対象検証の候補を説明できる。

## 対象境界

- SC-IN-001
- SC-IN-003
- SC-IN-005

## 未確認事項

- example snapshot の更新が必要かは Construction で判断する。

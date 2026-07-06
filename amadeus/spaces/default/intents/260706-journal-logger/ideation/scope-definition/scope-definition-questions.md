# Scope Definition Questions — 260706-journal-logger

## 上流入力

[intent-statement.md](../intent-capture/intent-statement.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md)。

intent-capture 承認済みの境界解釈（PR 納品物と初回起動後の運用検証の分離）を具体化する 1 問のみ。自己判断（理由付き）で確定し、gate の人間承認で確定する。

## Q1. 受け入れ条件 2〜3（実働実績）の充足方法

- A. 本 Intent の PR には「納品物 5 点」（journal 契約 doc、validator 拡張、logger 手順書 + 役割 prompt、#556 移行済み journal エントリ、運用検証チェックリスト）を含め、受け入れ条件 2〜3 の実働実績は初回起動後にチェックリストへ結果を記録する後続運用とする。#556 のクローズ（条件 4 後半）も実働確認後の人間操作
- B. 本 Intent 内で logger を実 spawn して実績まで作る（ディスパッチ指示 2 に反する）
- C. その他
- X. Other (please specify)

[Answer]: A。ディスパッチ指示 2（実 spawn は人間 / leader 操作、初回は手動起動 + 運用検証）と intent-capture の承認済み解釈のとおり。チェックリストが運用検証の合否基準を固定するため、後続確認が曖昧にならない。自己判断（理由付き）。

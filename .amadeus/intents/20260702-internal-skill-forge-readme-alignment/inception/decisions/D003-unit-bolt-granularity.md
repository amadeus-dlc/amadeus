# D003: Unit と Bolt の粒度

## 背景

この Intent は README 分類と skill-forge 確認契約の両方を扱う。

README 分類は利用者向け入口の整理であり、skill-forge 確認契約は source skill、昇格先成果物、eval、metadata、検証入口の整理である。

## 判断

Unit は2つに分ける。

- U001: README skill 役割整合。
- U002: skill-forge 確認契約。

Bolt は4つに分ける。

- B001: README role inventory。
- B002: skill-forge review scope。
- B003: source promoted alignment。
- B004: compatibility and validation closure。

## 理由

README 分類と skill-forge 確認契約は依存するが、価値境界が異なる。

一方で、B004 は互換性判断と検証条件を扱うため、U001 と U002 の両方をまたぐ Bolt として扱うのが自然である。

## 影響

Construction では、B001 から B004 の順で Task Generation を行う。

もし README 更新だけで完結すると分かった場合でも、B002 と B003 の確認を省略せず、README だけを直して skill 契約や昇格先成果物とのずれを残さない。

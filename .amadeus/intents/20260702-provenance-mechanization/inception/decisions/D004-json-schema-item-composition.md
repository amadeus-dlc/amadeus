# D004: JSON スキーマの項目構成の調査解消

## 背景

Ideation の未確定事項「JSON スキーマの項目構成（policies.md の最低記録項目との対応）」は、grilling ではなく既存文書の調査で解消できるかを確認した。

## 判断

JSON スキーマの項目構成は、`.amadeus/steering/policies.md` の「provenance の最低記録項目」9 項目との 1:1 対応とする。

## 理由

受け入れ条件「`provenance:generate` の出力だけで policies.md の最低記録項目を満たせる」が、項目構成を 9 項目との 1:1 対応として一意に固定する。人間が対応関係を選択する余地がないため、grilling ではなく調査で解消した。項目の詳細型と命名は Construction の Functional Design で確定する。

## 影響

R001 の受け入れ条件と Unit Design Brief の「データと契約候補」は、この 9 項目対応を前提にする。

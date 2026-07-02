# D002: 検査対象境界の採用

## 背景

provenance 記録の導入時に、既存 Intent（18 件以上）へ遡及適用するかが論点になった（GD002）。

## 判断

既存 Intent への遡及適用はしない。`provenance:check` は `provenance/` ディレクトリが存在する Intent だけを検査対象にする。

## 理由

既存 Intent の多くは Construction 完了済み、または Ideation / Inception 段階で完結しており、遡及的に実測しても当時の build workspace や host environment を再現できない場合がある。検証できない値を無理に生成すると記録の信頼性を損なう。新規記録から適用範囲を広げる方が、実測の正確性を維持できる。

## 影響

R002 と UC002 はこの境界を前提にする。既存 Intent の traceability や decisions に残る手書きの provenance 記録は、この Intent の対象外として維持される。

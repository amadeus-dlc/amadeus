# Build and Test Summary：B002 skill 置換と整理

## Definition of Done の充足

| DoD 項目 | 判定 | 根拠 |
|---|---|---|
| 本家 38 skill との名前写像が 1 対 1 | 満たす | comm 双方向で差分ゼロ（code-summary.md） |
| 独自 5 skill の削除 | 満たす | source、昇格先、symlink とも削除。検証コードも追随済み |
| amadeus-steering の退役 | 一部後送 | 独立入口としての置換は完了（新入口は engine の 0.1 が bootstrap を担う）。ファイル削除は provenance 制約により B004 へ後送 |
| promote 検証 green | 満たす | test:it:promote-skill exit 0 |

## 確信仮説の検証

「B001 の型が全 skill にスケールする」は実証された。37 skill が同じ適応型で置換でき、検証コードの追随を含めて test:all green を回復した。旧 stage skill の残置は provenance 保全のための計画的な一時状態である。

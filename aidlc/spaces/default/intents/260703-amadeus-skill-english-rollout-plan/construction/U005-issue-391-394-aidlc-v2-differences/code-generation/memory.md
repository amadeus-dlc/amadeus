# Code Generation Memory：#391〜#394 AI-DLC v2 differences

## 解釈

- #391 の reviewer は、本家 stage-protocol §12a で「gate 前の独立 sub-agent レビューであり、最終判断は常に人間」と定義されている。Amadeus DLC は人間 gate（stage gate、phase PR、Bolt PR）を一次の承認契約とするため、reviewer を追加しても承認境界が変わらないことを非採用の主根拠にした。
- `reviewer_max_iterations`（既定 2）が担う「反復を有限にして人間へ委ねる」動作は、Request Changes 3 回連続で Accept as-is を提示する既存規則と等価とみなした。

## 逸脱と対処

- なし。

## トレードオフ

- reviewer 非採用により、gate 前の機械レビューは validator の構造検証と CI に限られる。gate 差し戻しが頻発する運用実績が出た場合の再検討条件を mapping doc に残した。

## 未解決の問題

- #393、#392、#394 の判断は未実施である。

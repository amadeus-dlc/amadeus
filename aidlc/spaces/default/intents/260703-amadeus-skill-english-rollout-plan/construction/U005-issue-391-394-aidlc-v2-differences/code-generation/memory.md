# Code Generation Memory：#391〜#394 AI-DLC v2 differences

## 解釈

- #391 の reviewer は、本家 stage-protocol §12a で「gate 前の独立 sub-agent レビューであり、最終判断は常に人間」と定義されている。Amadeus DLC は人間 gate（stage gate、phase PR、Bolt PR）を一次の承認契約とするため、reviewer を追加しても承認境界が変わらないことを非採用の主根拠にした。
- `reviewer_max_iterations`（既定 2）が担う「反復を有限にして人間へ委ねる」動作は、Request Changes 3 回連続で Accept as-is を提示する既存規則と等価とみなした。

## 逸脱と対処

- なし。

## トレードオフ

- reviewer 非採用により、gate 前の機械レビューは validator の構造検証と CI に限られる。gate 差し戻しが頻発する運用実績が出た場合の再検討条件を mapping doc に残した。

## 未解決の問題

- #392、#394 の判断は未実施である。

## #393 の解釈

- 本家の sensor は gate 前の決定論的検査であり、Amadeus では `amadeus-validator`（構造）、`traceability.md`（上流対応）、Build and Test と CI（コード検査）が同じ役割を分担済みとみなした。
- 本家の Learn の 4 見出し（Interpretations、Deviations、Tradeoffs、Open questions）は、Amadeus の stage `memory.md` の既存契約（解釈、逸脱、トレードオフ、未解決の問題）と同型であり、記録先の新設は不要と判断した。
- learnings ritual の「表面化と定着」は `amadeus-history-review` と `amadeus-learning-review` の分類契約へ写像し、自動昇格しない既存原則を維持した。

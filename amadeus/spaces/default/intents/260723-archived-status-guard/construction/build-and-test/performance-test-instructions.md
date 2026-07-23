# Performanceテスト手順

## 測定条件

各Unitの `code-summary.md` に従い、10,000件fixture、warm-up 10回、100 samples/pairsでp95を測定する。CPU、Bun、fixture SHA-256を結果へ残す。

## 合格基準

- strict registry readとmigrationは線形成長の上限内。
- archive p95 500ms未満、recovery p95 750ms未満、増分RSS p95 96MiB未満。
- guardのallowed/archived pairwise差分が設計上限内。
- AST 2x corpusの時間・RSS倍率が2.5以下で、sink数が正確に2倍。

対象integrationテストを実行し、単一測定値ではなくp95とcorrectnessを同時に判定する。

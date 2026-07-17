# Risk & Sequencing Rationale — amadeus-mirror ツール

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## シーケンス根拠

単一 Bolt のため順序リスクなし。walking skeleton = Bolt 1 自体が最薄の end-to-end スライス(create→sync→close)であり、統合点(gh 境界・状態3ソース)を1回で全通しする。

## リスクと緩和

| リスク | 緩和 |
|---|---|
| gh 実呼び出しをテストで打てない | GhRunner port 注入(ADR-4)。実 gh は手動 smoke(walking-skeleton ゲートで人間確認) |
| 状態源様式の変更追随(raid-log D2) | amadeus-lib import 再利用(ADR-5)で型検査が drift を検出 |
| patch カバレッジの spawn 盲点 | in-process seam+push 前 local lcov(local-lcov-pre-push) |

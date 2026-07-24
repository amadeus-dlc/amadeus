# External Dependency Map — 260722-tla-plugin

上流入力(consumes 全数): requirements、components、unit-of-work、unit-of-work-dependency、unit-of-work-story-map、team-practices

## 外部依存一覧

| 依存 | 種別 | 固定方式 | 影響 Bolt | 不在時挙動 |
|---|---|---|---|---|
| eclipse-temurin(Docker 公式イメージ) | コンテナ | digest 固定(実装時に実測して sha256 を焼込 — 手動展開禁止) | Bolt 4(+Bolt 1 の Docker planner テスト) | HARNESS_ERROR(loud) |
| tla2tools.jar(tlaplus 公式 GitHub Releases) | 実行 jar | 版固定 URL+sha256 チェックサム検証 | Bolt 1・4 | チェックサム不一致で loud fail |
| JDK temurin 26(ローカル実行) | ランタイム | メジャー版ピン(feasibility Q2) | Bolt 1(ローカル検証) | loud エラー(opt-in 依存 — README 明文化) |
| Docker(ローカル/CI) | ランタイム | 実在確認のみ | Bolt 1・4 | HARNESS_ERROR(loud、graceful degrade なし) |
| GitHub Actions(ubuntu-latest) | CI 基盤 | 既存 ci.yml と同一 | Bolt 4 | — |

## 内部依存(参照)

Unit DAG は unit-of-work-dependency.md の YAML edge block を正とする。外部依存はいずれも Bolt の実行可能性を塞がない(ローカル macOS + JDK で Bolt 1〜3 は完結し、Docker 依存の実測は Bolt 4 に集約)。

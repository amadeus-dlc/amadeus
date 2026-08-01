# Scalability Design — U6: journal-reader-swap

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

scalability-requirements.md の方針（スケーリング特性を変更しないことの検証固定）に対する設計。

## 線形性の維持設計

- clone／worktree 横断で shard 数が増えても、読取コストは総行数に対し線形を維持する。共通 reader の merge は U3 の dedup Map＋1 回ソートに委譲し、tool 側で shard 横断の O(n²) 走査・全件読み直しを追加しない（FR-JRN-2、services.md のスケーリング特性）
- 複数 shard は mixed-version のまま merge し、version 統一のための一括変換 pass（全行の再読み・再書き）を reader 経路に持たない（business-logic-model.md § 共通 reader 経由の読取 5）

## 短命 process 前提の維持

- reader の走査結果は process ローカルの要求スコープで完結させ、cross-process キャッシュ・長命インデックス構築を導入しない（NFR-2、Bun-only 単発 CLI 構成）
- 空 shard は空集合を即時返す正常系とし、走査・遅延を発生させない（BR-19）

## 検証設計

- shard 数・行数を段階的に変えた fixture（v1-only／v2-only／mixed）で merge 時間の線形性を確認する（BR-11 の fixture 網羅に包含）
- 非線形の悪化があれば差替えを完了とみなさない（scalability-requirements.md § 検証）。この判定を差替え完了ゲートへ組み込む

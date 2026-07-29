# Scalability Requirements — U6: journal-reader-swap

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 方針

reader 差替えはスケーリング特性を変更しない（BR-10：物理配置・shard 構成に触れない）。既存のスケーリング前提を壊さないことを検証条件として固定する。

## 要件

- **shard 数への線形性**: clone／worktree 横断で shard 数が増えても、読取コストは総行数に対し線形を維持する。shard 横断の O(n²) 走査・全件読み直しを導入しない（FR-JRN-2、services.md のスケーリング特性どおり）
- **mixed-version の維持**: 複数 shard は mixed-version のまま merge する。version 統一のための一括変換 pass（全行の再読み・再書き）を reader 経路に持たない（business-logic-model.md §共通 reader 経由の読取 5）
- **短命 process 前提の維持**: reader の走査結果は process ローカルの要求スコープで完結させ、cross-process のキャッシュ・長命なインデックス構築を導入しない（NFR-2 の短命 process 前提、Bun-only 単発 CLI 構成）
- **空 shard の正常系**: 対象 shard が存在しない場合は空集合を即時返し、走査・遅延を発生させない（BR-19）

## 検証

- shard 数・行数を段階的に変えた fixture（v1-only／v2-only／mixed）で merge 時間の線形性を確認（BR-11 の fixture 網羅に含める）
- 上記に不適合（非線形の悪化）があれば差替えを完了とみなさない

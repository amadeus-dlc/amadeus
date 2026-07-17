# Risk & Sequencing Rationale — metrics-timeseries-report

上流入力(consumes 全数): `../requirements-analysis/requirements.md`、`../application-design/components.md`、`../units-generation/unit-of-work.md`・`unit-of-work-dependency.md`・`unit-of-work-story-map.md`、`../practices-discovery/team-practices.md`

## 順序付け根拠

1 Bolt のため Bolt 間順序なし。Bolt 内は M1(パーサ/ビルダ)→ M2(レンダラ/CLI)→ M3(テスト)の依存直列(unit-of-work-dependency の記載どおり)。ただし N-1(in-process seam)により実装とテストは関数単位で交互に進めてよい(テスト後行の一括化はしない — org.md Testing Posture)。

## リスクと緩和

| リスク | 緩和 |
|---|---|
| origin/main 前進(worktree HEAD が既に 47+ コミット遅れ) | Bolt ブランチを origin/main 起点で切り、PR 前に base-advance-regrounding を定型適用 |
| coverage patch ゲート赤(spawn-only 盲点) | 設計済みの exported 純関数+in-process テストで回避、push 前 local lcov 実測(local-lcov-pre-push) |
| test_pyramid 動的キーの実データ欠損パターン | AC-3c の union 方式で吸収済み(設計裁定済み — 再設計リスクなし) |

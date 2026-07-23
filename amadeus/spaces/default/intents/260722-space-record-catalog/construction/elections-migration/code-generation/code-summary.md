# Code Summary — U3 elections-migration

## 変更概要

- `scripts/amadeus-election-migrate.ts`
  - `planMigration` を純関数として実装
  - createdAt の3段導出と unknown 値の dry-run 時固定
  - registry 既存行の冪等スキップ、identity 重複・行不一致・物理衝突の検出
  - dry-run の plan JSON、rename map、衝突・degraded 件数、SHA-256 出力
  - `--execute` の6条件による fail-closed 判定と approved-plan ハッシュ束縛
  - per-entry の rename 後即 registry append seam
- `tests/unit/t262-elections-migration.test.ts`
  - 導出優先順位、固定値、冪等、競合、全前提拒否分岐を検証
- `tests/integration/t262-elections-migration.integration.test.ts`
  - 実 FS 上で dry-run が無変更であることを検証
  - plan ハッシュ不一致時に `--execute` が変更前に拒否されることを検証

## Dry-run 実測

2026-07-23 時点の担当 worktree で本番データを読み取り専用走査し、一時 plan ファイルへ出力した。

- 検出選挙: 111件（要件作成時の103件から、その後の選挙追加により増加）
- rename 候補: 111件
- conflicts: 0件
- degraded: 0件
- 本番 rename: 0件
- 本番 `elections.json` 生成: なし

## 実行境界

本 Bolt では本番 `--execute` を実行していない。`execution-approval.md` はツールから書き込まず、人間系列で作成された承認 record と approved-plan のバイト列 SHA-256 が一致した場合のみ execute 判定を通過する。

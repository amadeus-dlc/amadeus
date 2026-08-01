# External Dependency Map — formal-verif-value-chain

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map

## 外部依存

| 依存 | 用途 | 影響 Bolt | 状態 |
|---|---|---|---|
| TLA+ / TLC ツールチェーン | 形式検証の実行器(既存 fs-tlc-toolchain.ts がダウンロード・実行を管理) | B7(モデル TLC 完走) | 既存機構で解決済み。#1737(パーサ偽赤)は PR #1745 で修正着地 |
| Java (JDK) | TLC 実行の前提ランタイム | B7 | 既存 CI ジョブ(workflow_dispatch)で設定済み |
| GitHub Actions | CI 実行環境(ubuntu-latest、bun 1.3.13) | 全 Bolt | 既存 |
| bun | 全ツール・テストのランタイム | 全 Bolt | 既存(利用者側 Bun-only 前提を維持 — 新規 runtime 依存の追加なし) |
| gh CLI | ミラー Issue 同期・PR 操作 | 全 Bolt(工程面) | 既存・認証済み |

## 新規外部依存

**なし**。requirements の NFR は既存インフラの再利用のみを許し(components.md 再利用棚卸し)、新規パッケージ・新規 CI ジョブ・新規 runtime 依存は導入しない。

## 内部依存(本 repo 外への影響)

配布先ユーザーの repo が対象(FR-A3)。配布物は bun のみを前提とし、`plugins/formal-model-check/tools/` 一式が自立実行できることを B5 の AC で保証する。

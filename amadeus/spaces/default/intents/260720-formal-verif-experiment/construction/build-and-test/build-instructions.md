# Build Instructions

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

## 概要

本 intent(形式仕様検証の実証実験)の成果物は `scripts/formal-verif/` の TypeScript 35 モジュール(U1〜U8)と `tests/` 配下のテスト群である。全ユニットの code-generation-plan.md / code-summary.md(8ユニット分)を入力として、ビルド=型検査+リントの決定論的検証で構成する(バンドル/トランスパイル成果物は持たない — Bun 直接実行)。

## 依存インストール

- `bun install`(lockfile `bun.lock` 固定。fast-check 4.9.0 は既存 lockfile — 新規依存追加なし)
- 前提: Bun がインストール済み(リポジトリ標準)

## 環境セットアップ

- 環境変数・ローカルサービスは不要(全テストは決定論的・ネットワーク非依存)
- TLA+/TLC アーム(U4/U5)の実行系は fs-tlc-toolchain の fetch handler が所有するが、build 検証は型検査まで(TLC バイナリ取得は Deployment 系スコープ外)

## ビルドコマンド

| # | コマンド | 期待 |
| --- | --- | --- |
| 1 | `bun x tsc --noEmit -p tsconfig.json` | exit 0(scripts 正本) |
| 2 | `bun x tsc --noEmit -p tsconfig.tests.json` | 既知 baseline: B1 skeleton 由来 9 error(スコープ外・記録済み)。formal-verif 新規ユニット由来は 0 件であること |
| 3 | `bun run lint` | exit 0 |
| 4 | `bun run dist:check && bun run promote:self:check` | exit 0(本 intent は packages/framework 正本を触らないため drift 0 が期待値) |

## ビルド検証手順

1. コマンド1・3・4 の exit code が 0 であることを実測する
2. コマンド2 は error 一覧を取得し、`arm-s|full-matrix|eligibility|final-cli` に一致する行が 0 件であることを grep で確認する

## トラブルシューティング

- tsconfig.tests.json の 9 error が増えた場合: 増分を `git diff` で帰属確認(自変更由来なら修正必須 — 既存赤の無視禁止ルール)
- biome の cognitive-complexity 警告: ヘルパー抽出で解消する(U8 で実績あり)

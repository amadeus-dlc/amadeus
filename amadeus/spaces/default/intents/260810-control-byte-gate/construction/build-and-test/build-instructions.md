# Build Instructions — 260810-control-byte-gate

上流入力(consumes 全数): code-generation-plan.md(Step 1〜8 の実装構造と検証手順 — 本書のビルド/テスト手順の導出元)、code-summary.md(出荷断面の変更面・BR 逐条監査・落ちる実証・sweep 実測値 — 本書が再現する対象)。

## 前提

- Bun 1.3.13(`packages/setup/package.json` と CI の `setup-bun` でピン)。他のランタイムは不要 — 本 Unit は NFR-4「依存追加ゼロ」により Bun 標準 API のみを使う。
- git(ゲートが `git ls-files -z` で走査対象を列挙するため、リポジトリとして解決できる作業ツリーが要る)。

## 環境変数

本 Unit の実行に必須の環境変数は**ない**。ゲートは NFR-1(決定性)により時刻・環境変数・ネットワークを参照しない。

参考: フレームワーク全体のテスト実行では `TEST_TIME_FACTOR`(既定 CI=2)がタイムアウト基準値へ乗算されるが、これはテスト側の設定であって本 Unit の挙動には影響しない。

## 手順

```
bun install --frozen-lockfile
bun run build
```

`bun run build` は全ハーネスの `dist/` とセルフインストール面を再生成する。source-only 境界のため生成物は未追跡で、**追跡ファイルの差分が出ないこと**が正しい状態。

## ビルド検証

```
bun run typecheck        # tsc --noEmit × 2 構成
bun run lint             # Biome
git status --porcelain   # 生成物由来の追跡ファイル差分が 0 であること
```

## 既知のつまずき

- **新規 worktree でフレームワーク CLI が起動しない**: source-only 境界のため `.claude/tools` 等は未追跡の生成物であり、`bun install` + `bun run build` を済ませるまで存在しない。Module not found は欠陥ではなくこの構造の帰結。
- **ci.yml を変更したのにベースラインが合わない**: `tests/fixtures/formal-verif-ci-baseline.sha256` は**生ファイルの digest ではなく** `normalizedCiBaseline`(U4 formal ブロックと dispatch 行を除去した正規化後)の digest。生ファイルの `shasum` を書くと必ず不一致になる。

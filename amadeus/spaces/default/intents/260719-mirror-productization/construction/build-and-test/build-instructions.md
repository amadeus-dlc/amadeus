# ビルド手順

## 前提と入力

本手順は U1〜U4 の `code-generation-plan.md` と `code-summary.md` を入力とする。Bun、Node.js、TypeScript、Biome、およびリポジトリ既定の依存関係が利用できることを前提とし、外部サービスは不要である。

## 実行手順

1. `bun install --frozen-lockfile` で依存関係を検証する。lockfile変更は行わない。
2. `bun run typecheck` で正本とテストの型検査を行う。
3. `bun run lint:check` でコード品質を検査する。
4. `bun scripts/package.ts` と `bun scripts/promote-self.ts` は生成が必要な場合だけ実行し、通常の検証では `bun run dist:check` と `bun run promote:self:check` を使う。
5. `bun tests/run-tests.ts --ci` を正規の統合品質ゲートとして実行する。

## 合格基準とトラブルシュート

すべてのコマンドが終了コード0であること、テスト失敗が0件であること、6 harnessとself-installにdriftがないことを合格条件とする。失敗時は対象テストを単独再実行し、fixtureのReceipt、生成物drift、型エラーの順に切り分ける。生成物は手編集しない。

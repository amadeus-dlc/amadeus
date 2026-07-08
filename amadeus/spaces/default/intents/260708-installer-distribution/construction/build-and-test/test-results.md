# Test Results — installer-distribution(build-and-test 実行結果)

> 実行: 2026-07-09 / 実行者: conductor(quality ペルソナ inline)/ ステールバイナリ削除掛けを適用のうえ全コマンド再実行

## ビルド

- `bun build src/cli.ts --target=node --format=esm --outfile dist/cli.js`(packages/setup、生成物を削除してからフレッシュビルド): **成功**
- `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check`: **全 exit 0**

## テスト

| プロファイル | 結果 |
|--------------|------|
| `bash tests/run-tests.sh --ci`(smoke+unit+integration) | 259ファイル / 3869 assertion / **失敗1 = t92.test.ts のみ**(既知・下記) |
| setup 全サブセット(unit+integration+smoke、27ファイル) | **230 pass / 0 fail**(480 assertion、958ms) |
| `--release --filter "setup-"`(e2e ティア込み) | **PASS**(239 assertion、実ネットワークは AMADEUS_SETUP_E2E_NETWORK 未設定のため意図どおり skip) |

## 既知の失敗(本 intent 無関係・修正未着手の判断根拠)

- **t92.test.ts(Group N, test 44)**: ローカル環境固有 — bunx が pinned TypeScript 6.0.3 ではなく 7.0.2 を解決し、TS18003 の exit code が 2→1 に変化。2回の再実行で決定論的に再現、`git log` で本 intent 以前から無変更のファイルと確認済み。**GitHub Actions では全 PR(#648〜#654)グリーン** = CI 環境では発生しない。是正はセンサー起動方法かテスト期待値のクロスカッティング判断が必要なため、`../publish-readiness/code-generation/pending-issue-t92-bunx-ts-drift.md` として起票待ち(team.md の Issue 起票ノルム — 起票はユーザー判断待ち)

## カバレッジ所見

Standard 戦略の期待(コンポーネント毎5〜8本+主要境界)を全ユニットで充足。検証劇場防止は §12a レビューの欠陥注入(全 Bolt 合計12箇所+)で担保済み

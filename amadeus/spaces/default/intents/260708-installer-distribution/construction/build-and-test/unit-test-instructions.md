# Unit Test Instructions — installer-distribution

> ステージ: build-and-test (3.6) / 戦略: Standard(コンポーネント毎5〜8本+主要境界)
> 出典: 各 Unit の `../*/code-generation/code-summary.md`(テスト一覧)と `code-generation-plan.md`(トレーサビリティ表)

## 実行方法

- 全体: `bash tests/run-tests.sh --ci`(smoke+unit+integration — CI と同一プロファイル)
- setup 単体: `bun test tests/unit/setup-*.test.ts`(個別ファイル指定可)

## インベントリと期待カバレッジ

- U1: semver / version-spec / resolved-version / timestamps / harness / fetch-error / manifest / resolver / fetcher(BR-F06/F10/SEC-F01 全分岐)/ manifest-io / lazy-build — 11ファイル
- U2: command / harness-parse / installation(裸 engineDir=none 回帰含む)/ plan / applier(SEC-U01 含む)/ verifier / wizard / reporter / cli-wiring(BR-I16 到達順序)— 9ファイル
- U3: upgrade(REL-U02 6経路+LegacyLayout 条件 a/b)— 1ファイル(26本)
- 期待: 各コンポーネント最低2つのエラー/エッジケース(construction フェーズルール)。すべて fake ポート注入で実ネットワーク不使用

## 検証劇場の防止(レビュー済み担保)

全 Bolt で §12a レビュアーが欠陥注入(落ちる実証)を実施済み — リトライ反転・dispositionFor 反転・ラッパー多重性緩和・到達順序ゲート無効化・SEC-U01 無効化などで対応テストの赤化を確認済み(各 code-summary のレビュー経過参照)

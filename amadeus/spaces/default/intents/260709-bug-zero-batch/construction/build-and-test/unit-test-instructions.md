# Unit Test Instructions — bug-zero-batch

> 6バグの回帰テスト(すべて修正前赤・修正後緑の落ちる実証済み)。

## 対象テストと実行方法

| Unit | テスト | 実行 |
|---|---|---|
| swarm-finalize-merge (#674) | t134 case 14(e2e だが referee 単体) | `bun test tests/e2e/t134-swarm-referee.test.ts` |
| reject-presence-guard (#675) | t188 fabricated reject 拒否+fresh turn 成功 | `bun test tests/unit/t188-human-presence-gate.test.ts` |
| bolt-start-preaudit (#676) | t33 negative+seed 済み positive | `bun test tests/unit/t33.test.ts` |
| http-getjson-result (#677) | setup-http(新規) | `bun test tests/unit/setup-http.test.ts` |
| tar-pax-chunk (#678) | setup-fetcher(PAX/GNU 跨ぎ+truncated) | `bun test tests/unit/setup-fetcher.test.ts` |
| codekb-repo-name (#668) | t182(remote slug+fallback pin) | `bun test tests/unit/t182-codekb-placement.test.ts` |

## 注意

- 単体直実行(`bun test tests/unit/`)は run-tests.sh が設定する suite env(human-presence guard の suite-wide bypass 等)を欠くため state 系テストが偽赤になる — 一括実行は必ず `bash tests/run-tests.sh --ci` を使う(#677 実装時に実測)

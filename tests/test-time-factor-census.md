# test-time-factor ガードの全数棚卸し

## 測定断面

Issue #3227 の起票時断面は `origin/main` の `a274c8d4acf6f0dd6a9ffc49a5e3765de4f9782b` です。以下の述語は、対象集合・除外条件を含めて再実行できます。

```bash
git grep -n -E 'toBeLessThan' origin/main -- tests/ | grep -iE 'elapsed|duration|Ms\b|_MS|millis|latency|took'
git grep -l 'performance.now' origin/main -- tests/
git grep -n -E 'Date\.now\(\) - ' origin/main -- tests/
bun tests/test-time-factor-guard.ts
```

起票時の第1軸は17件（クラスAのうち `Date.now() - started` だけで表現された1件は第3軸）で、クラスBが6件、`tests/perf/` の既存ベンチマークが4件でした。第1軸と第3軸を合わせたクラスAの8件は、次のとおり実時間比較を削除し、制御経路の観測へ置換しました。

| 起票時の箇所 | 現在の制御経路検証 |
| --- | --- |
| `tests/e2e/setup-install.test.ts:110` | `:91-101` の status・インストール成果物・manifest 検証 |
| `tests/e2e/t341-plugin-conformance-journey.serial.test.ts:315` | `:286-302` の stage graph・doctor/drop・残留物検証 |
| `tests/integration/book-pack-verify.serial.test.ts:119-120` | `:108-116` の child/cleanup 完了イベント列と `:118-126` の予算整合性検証 |
| `tests/integration/t221-metrics-snapshot.integration.test.ts:124` | `:121-122` の CLI status・出力・生成物件数検証 |
| `tests/integration/t46-parallel-bolt.test.ts:176` | `:191-208` の BOLT_STARTED 件数・heading 対応・8レコード検証 |
| `tests/integration/t487-stage-stats.integration.test.ts:428` | `:418-422` の CLI status 検証 |
| `tests/integration/t-live-e2e-kiro-tui.integration.test.ts:322` | `:315-319` の cleanup failure 種別と未実行経路検証 |

クラスBは `scaleTestTime` を経由する境界・回帰検証として残し、`tests/.test-time-factor-allowlist.json` に正確な件数と理由を登録しました。クラスCは `tests/perf/` を走査対象へ追加し、宣言済みベンチマークの実時間予算だけを同じallowlist契約で保持します。未登録の assertion-side sink、待ち時間sink、固定テストタイムアウトは引き続き fail-closed です。

## 落ちる実証

`tests/integration/t-test-time-factor-guard.test.ts` は一時fixtureへ未分類の `expect(elapsedMs).toBeLessThan(500)` を注入し、`runTestTimeFactorGuard` が終了コード1になることを固定しています。実装前に同fixtureを実行して赤（assertion側sinkが未検出）を確認し、検出実装後に緑へ戻しました。fixtureはテスト終了時に削除され、リポジトリへ注入物は残りません。

## 現在のゲート結果

```text
test-time-factor guard: 122 classified fixed timing sink(s)
```

上記コマンドの終了コードは0です。

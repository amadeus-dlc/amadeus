# Integration Test Instructions — 260727-mirror-project-status

上流入力(consumes 全数): code-generation-plan, code-summary(u1-project-sync-skeleton / u2-state-reconcile-hardening / u3-lifecycle-integration / u4-config-overrides-and-diagnostics / u5-docs-and-distribution の全5ユニット)

## フレームワークと実行方法

- bun test(tests/integration/ — 実 FS・一時ディレクトリ・FakeGateway 差し替えの既習様式。本番コードにテスト分岐なし)
- 個別: `bun test tests/integration/<file>` / CI 同一経路: `bash tests/run-tests.sh --ci`

## テストインベントリ(クロスユニット相互作用・外部依存境界)

| ファイル | 境界 | 主要ケース |
|---|---|---|
| tests/integration/t345-amadeus-mirror-project-reconcile.integration.test.ts | executor×gateway | 部分成功(A成功+B retryable→B のみ pending→次回収束)/ 二重実行 mutation 総数不変 / per-Project 照会1+mutation≤2 history assert / 秘匿トークン 0 hit |
| tests/integration/t346-amadeus-mirror-lifecycle-projects.integration.test.ts | lifecycle×coordinator | boundary 5種×挙動表 / close 阻止 negative(Done 未達1件→close mutation 0)と全 Done 後 close の対照 / parked 2経路 mutation 0 / ask golden |
| tests/integration/t349-amadeus-mirror-repair-project-diagnostics.integration.test.ts | repair status | resolution 4値・availableOptions・summary 文言・mutation 0+record バイト同一・秘匿 0 hit |
| tests/integration/t291 / t287 | docs 契約 | 4文書 en/ja parity・TOPICS 台帳・runtime contract 一致 |

## 外部依存の扱い

gh サブプロセス・GraphQL は FakeGateway で置換(history 記録により negative assert 可能)。実 GitHub への end-to-end は U1 walking skeleton で1回実証済み(R-3)。

## テストデータ・環境

一時ディレクトリへ record/config 3層を実構築(integration 層の責務)。環境変数依存なし。

## 実測(測定 ref = 45a09c9a0)

CI 全体 617 files / 8528 assertions、Failed files 1 = t132(#1594 既存赤・mirror 非交差確定)。mirror 面 integration 全 green。

# Build and Testサマリー

## 総合判定

ビルド可能、テスト可能、PR統合可能と判定する。[code-generation-plan.md](../%7Bunit-name%7D/code-generation/code-generation-plan.md) のFR-1〜FR-6と [code-summary.md](../%7Bunit-name%7D/code-generation/code-summary.md) の実装証跡を、unit、integration、e2e、full CIで再検証した。

deploymentは本`amadeus-bugfix` scopeの対象外であり、本判定はPR #1469のmerge readinessまでを対象とする。

## テスト種別と実績

| 種別 | 実績 | 判定 |
|---|---:|---|
| TypeScript typecheck | 2 tsconfig、exit 0 | PASS |
| 対象unit/integration/e2e | 12 files、181 tests、449 assertions | PASS |
| Mirror全suite（Code Generation時） | 31 files、392 tests | PASS |
| repository-native full CI | 545 files、7,509 assertions、失敗0 | PASS |
| distribution drift | 6 surfaces | PASS |
| self-install drift | 4 surfaces | PASS |
| formal CI workflow focused | 3 tests、13 assertions | PASS |

## Coverageと品質条件

各FRに最低1つの再現テストがあり、正常系、fail-closed異常系、副作用なし、冪等性を含む。FR-4は数値coverage閾値ではなく、Cursor/OpenCodeの重複source entryが正準pathへ統合されることを合否条件とする。

AWS credentialsが無効または期限切れのためlive SDK/substrate testsはrunner既定動作でskipされた。ローカルロジック、配布面、CI workflowの検証はすべて成功している。

## 既知の制約

- wall-clock classification drift 2件はadvisoryで、assertion failureではない。
- 巨大ファイル分割とgateway lexer共通化は本intentの対象外である。
- production環境へのdeploy、DAST、クラウドIAM検証は対象外である。

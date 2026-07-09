# Unit Test Instructions — framework-repair-batch

> Test Strategy: **Minimal**(bugfix スコープ)— 要件駆動: 対象バグごとの回帰テスト + 既存スイートのグリーン維持(Q7=A)。新規テストは code-generation ステージで各 Bolt に実装済み(各 unit の code-generation-plan.md の赤先行手順、code-summary.md の実測結果を参照)。本書はその実行手順を固定する。

## 実行コマンド

全体(CI と同一の4層ランナー):

```sh
bash tests/run-tests.sh --ci
```

本 intent の回帰テストのみを対象実行する場合:

```sh
# FR-656: Installation.detect の evidence gap(fixture ベース回帰 + BR-U07 E2E)
bun test tests/unit/setup-installation.test.ts tests/unit/setup-upgrade.test.ts tests/unit/setup-cli-wiring.test.ts

# FR-657: tsc ランチャー解決(t202 新設4ケース)+ t92 の決定化確認
bun test tests/unit/t202-sensor-type-check-tsc-launcher.test.ts tests/integration/t92.test.ts

# FR-641: hooks の project dir 解決(worktree マーカー、5+1 ケース)+ cwd 固定の非退行
bun test tests/unit/t202-hook-project-dir-worktree-marker.test.ts tests/unit/t07-hook-audit-logger.test.ts
```

FR-661 は docs のみの変更でテスト新設なし(選挙 Q7=A)。既存スイートのグリーン維持で担保する。

## 要件→テスト対応(Minimal: 1要件1テスト以上)

| 要件 | テスト | 赤先行実証 |
|---|---|---|
| FR-656-1(loose amadeus-* → unsupported 到達) | setup-installation.test.ts / setup-upgrade.test.ts の新設ケース | 修正前 3 fail 実測(code-summary 参照) |
| FR-656-2(manifest エントリ実在検証) | setup-installation.test.ts の partial ケース | 同上 |
| FR-656-3(--force でも拒否) | setup-upgrade.test.ts の E2E ケース | 同上 |
| FR-657(ローカル tsc 優先) | t202-sensor-type-check-tsc-launcher.test.ts(local/ancestor/fallback/shell=false) | 実装前 SyntaxError 赤を実測 |
| FR-641(worktree マーカー優先) | t202-hook-project-dir-worktree-marker.test.ts(worktree 赤先行+非退行4+negative 1) | 修正前 main 収束の赤を実測 |

## カバレッジ目標

Minimal 戦略のため数値下限は設けない(org.md: bugfix は対象バグの回帰テスト+既存グリーン維持)。カバレッジ台帳(tests/.coverage-registry.json)は fix-641 で新テストを登録済み。

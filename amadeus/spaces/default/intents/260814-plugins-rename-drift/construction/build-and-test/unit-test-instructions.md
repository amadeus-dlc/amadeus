# Unit Test Instructions — 260814-plugins-rename-drift

上流入力: 各 Unit の `code-generation/code-summary.md`(テスト構成の実装記録)。

## 対象と実行

| Unit | 主要 unit テスト | 実行 |
|---|---|---|
| plugin-settings-core | 宣言 parse・検証規則・綴り誤り・解決純関数(amadeus-plugin-settings 系)、config キー(t432 逐語一致含む) | `bun test <対象ファイル>` |
| rename-github-pr-convergence | 既存 unit 5 件のパス更新分(t446/t481/t511/t532/t534) | 同上 |
| git-drift-plugin | detectDrift 純ロジック(port 注入 — GitPort/ClockPort fake はテスト側) | 同上 |

- TDD 証跡: 各 slice の red→green コミット対(builder branch のコミット列が一次記録)
- 方針: fake・failing 実装はテスト側ヘルパーのみ(本番コードにテスト分岐なし — construction ガードレール、レビュー済み)

# Build Instructions — 260814-plugins-rename-drift

上流入力: 各 Unit の `code-generation/code-generation-plan.md` / `code-summary.md`(rename-github-pr-convergence / plugin-settings-core / git-drift-plugin)。

## ビルド手順(統合断面 = conductor ツリー、3 Bolt 合流済み)

```
bun install
bun run build   # 全ハーネス dist + セルフインストール面の再生成(manifest が発見する全ハーネス)
```

- 期待: exit 0、追跡ファイル不変(`git status --porcelain` に生成物由来の追跡変更なし)
- 取込後の再ビルドは実施済み(cid:code-generation:c1-mirror-and-rebuild-before-review — BUILD_EXIT=0、配送先ツリー述語 green: `.claude/plugins/{github-pr-convergence,git-drift}` 実在、`.claude/sensors/amadeus-git-drift.md` + `amadeus-pr-convergence-report-format.md` 投影、旧ステージングコピー削除済み)

## CI(blocking の正 — remote-first)

各 Bolt PR(#3051 / #3052 / #3055)の必須チェック集合(typecheck、lint+complexity、隔離2回ビルド再現性、source-only 境界、グラフ不変量、smoke/unit/integration、Coverage 両ゲート、plugin-conformance-e2e)。

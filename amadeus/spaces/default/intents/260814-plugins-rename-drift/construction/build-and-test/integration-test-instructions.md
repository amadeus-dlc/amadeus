# Integration Test Instructions — 260814-plugins-rename-drift

上流入力: 各 Unit の `code-generation/code-summary.md`。

## 対象

| テスト | 検証面 |
|---|---|
| `t2996-pr-convergence-scope-grid.integration.test.ts` | scope-bindings キー整合 → scope-grid の 4 self スコープ行(落ちる実証済み — 誤名注入で EXECUTE 行 0) |
| `t2997-plugin-settings.integration.test.ts` / `t2997-sensor-plugin-settings.integration.test.ts` | 宣言〜config 3 層〜解決〜argv 受け渡しの結合、SENSOR_FAILED 経路(in-process カバレッジ + scaleTestTime 経由の timeout) |
| `t2997-git-drift-conformance.integration.test.ts` | stages:[]+sensors+seams 合成形状の compose → 投影 → graph compile、seam/manifest id 不一致の loud 失敗様式 |
| git-drift 落ちる実証群(integration) | ローカル bare リポジトリで 3 経路(交差 warning / 非交差 info / fetch 失敗 loud skip)+ synced / 非 git 不発火 / スロットル設定実消費 |
| 改名パス更新の既存 integration 15 件 | 挙動不変の回帰確認 |

- filesystem/process を使う medium テストは integration 層(ノルム準拠 — sensor seam テストの層移動も実施済み)
- 実行前に path 実在の機械確認、実行後に runner 報告数と照合(cid:build-and-test:test-path-set-completeness — builder が実施済み)

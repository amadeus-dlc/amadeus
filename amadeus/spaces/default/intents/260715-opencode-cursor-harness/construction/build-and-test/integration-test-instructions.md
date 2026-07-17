# Integration Test Instructions — 260715-opencode-cursor-harness

上流入力(consumes 全数): 各 unit の code-generation-plan.md(統合手順・再接地履歴)と code-summary.md(AC-2b/AC-3b 実測)— U1〜U4。

## 対象と実行

- `bun test tests/smoke/t149-opencode-cursor-dist-structure.test.ts` — dist/opencode・dist/cursor の存在面検査(期待表はモジュールスコープ定数、manifest 非導出)+ harness.json の harnessDir/rulesSubdir 検査。保守規約(manifest 変更 PR は同一 PR で期待表追補)をコメントに焼き込み済み
- `bun run dist:check` / `bun run promote:self:check` — byte 面の統合ドリフトガード(t149 の存在面と役割分担)
- E2E 相当(AC-2b/AC-3b、repo 外 scratch + project-root override): dist を手動配置 → `--version`(amadeus 0.1.2 exit 0)/ `--doctor`(opencode: advisory 劣化のみ / cursor: 30 pass+環境要因 1 fail)/ workflow start(opencode: intent birth → run-stage directive 貫通 / cursor: orchestrate next で typed directive 受領)— U2/U3 の code-summary に実測記録

## 統合面の注意(実測済み)

- registry: t149 追加後 `bun tests/gen-coverage-registry.ts --check` = 0(FRESHNESS DIFF なし、EXPECTED_NONE_TO_CLI 追記不要)
- クロスマージ盲点(E-PB5 c1): 本 intent 期間中に2回実測(#1030×#1032 → #1040 止血 / #1035×#1046 → マージ前再接地で回避)。新 harness ツリー追加後の並行 PR では c6 交差判定に「dist ツリー集合の変化」を含めること

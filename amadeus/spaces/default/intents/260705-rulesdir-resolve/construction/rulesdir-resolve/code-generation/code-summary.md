# Code Summary — rulesdir-resolve（Issue #491）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更内容

| ファイル | 変更 | 対応 |
|---|---|---|
| `.agents/amadeus/tools/amadeus-graph.ts` | workspaceRootForRules（構造による walk-up）+ rulesDir の env 空文字ガード + fail-loud ガード + JSDoc 更新 | R101〜R103 |
| `.agents/amadeus/tools/data/stage-graph.json` | 実体パス compile による再生成。実在しない phases/{ideation,inception,operation}.md への stale 参照 88 行を除去（rules 実体は org/team/project + phases/construction.md で不変） | R104 |
| `dev-scripts/data/parity-map.json` | engineFileExceptions へ 2 件宣言 | N3 |
| `dev-scripts/evals/rulesdir-resolve/check.ts` + `package.json` | 6 検査の eval を `test:it:all` へ結線 | N1 |

## 検証の記録

- RED: 修正前 3 件失敗（reviewer が main 版でも独立再現）。GREEN: 6 検査 ok。
- reviewer（architecture）1 巡目 NOT-READY（record 整合 = reverse-engineering produces 不在、JSDoc stale）→ 反映して 2 巡目 READY（validator / parity / test:all の再実行まで確認済み）。

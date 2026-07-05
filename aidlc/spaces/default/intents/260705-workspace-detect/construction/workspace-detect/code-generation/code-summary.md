# Code Summary — workspace-detect（Issue #459）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更内容

| ファイル | 変更 | 対応 |
|---|---|---|
| `.agents/amadeus/tools/amadeus-utility.ts` | detectWorkspace の言語カウントを全トップレベル非除外・非ドット dir の再帰へ一般化（定型 SCAN_SOURCE_DIRS 限定を撤廃） | R001 / R002 |
| `dev-scripts/evals/workspace-detect/check.ts` + `package.json` | 7 検査の eval（定型外配置 / reverse-engineering 維持 / 空 ws / 定型配置 / ドット dir）を `test:it:all` へ結線 | N1 / AC 全件 |

## 検証の記録

- RED: 修正前は (a) の Brownfield / TypeScript 判定が失敗（Greenfield / Unknown）。
- GREEN: 7 検査 ok。本 repo での実地確認: `{"projectType":"Brownfield","languages":"TypeScript","frameworks":"Unknown","buildSystem":"bun (package.json)"}`（Issue の再現症状が解消）。
- `npm run test:all` exit 0。parity は `tools/aidlc-utility.ts` 宣言済み（N3 確認のみ）。

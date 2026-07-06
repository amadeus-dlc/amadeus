# Code Summary — doctor-drops（Issue #432）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更内容

| ファイル | 変更 | 対応 |
|---|---|---|
| `.agents/amadeus/tools/amadeus-utility.ts` | doctor の hooks-health 節へ 6b（drops 読み取り）を追加。hook ごとの fail 行 + クリア手段の fix 文言。無ければ出力不変 | R001〜R004 |
| `dev-scripts/evals/doctor-drops/check.ts` + `package.json` | 7 検査の eval を新設し `test:it:all` へ結線 | N1 / N2 |

## TDD の記録

- RED: 修正前は「drops 行の hook 名」「件数」「最新理由」「クリア案内」が失敗（doctor は .drops を一切読まない）。
- GREEN: 7 検査 ok。`.drops` なしの workspace では exit 0 と出力不変を確認（後方互換）。
- recordHookDrop のコメント「so --doctor can surface them」の約束がこれで実装と一致した。

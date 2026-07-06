# Code Summary — engine-error-logged（Issue #431）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更内容

| ファイル | 変更 | 対応 |
|---|---|---|
| `.agents/amadeus/tools/amadeus-orchestrate.ts` | `recordEngineError()` 新設。emit() の error 分岐と top-level catch から best-effort で ERROR_LOGGED を追記（Tool / Command / Error）。--project-dir は自前再パース（早期エラー分岐でも動作）、lazy require で循環回避、state 不在 no-op、失敗握りつぶし | R001〜R004 |
| `dev-scripts/evals/engine-error-logged/check.ts` + `package.json` | 8 検査の eval を `test:it:all` へ結線 | N1 / AC 全件 |

## 検証の記録

- RED: 修正前 3 件失敗（error directive / 例外とも ERROR_LOGGED なし）。
- GREEN: 8 検査 ok（stdout 契約不変、exit code 不変、state 不在 no-op を含む）。`npm run test:all` exit 0。
- これで全ツール CLI + エンジンの ERROR_LOGGED 記録が対称になり、#432 の doctor drops と合わせて「静かな失敗」系の観測経路が閉じた。

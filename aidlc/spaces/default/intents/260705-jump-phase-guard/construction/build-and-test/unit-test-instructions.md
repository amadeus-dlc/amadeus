# Unit Test Instructions（260705-jump-phase-guard）

上流入力: [code-summary.md](../jump-phase-guard/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 対象と実行

| eval | 対象 | 実行 |
|---|---|---|
| jump-phase-guard（新設、15 検査） | R000〜R004 の全分岐（拒否 / Verified / Skipped / backward / validator 整合） | `npm run test:it:jump-phase-guard` |

## 方針

隔離 temp workspace でエンジン実 CLI（intent-birth、state checkbox、jump execute、validator）を駆動する決定論的検証である。LLM を呼ばず、本番 aidlc/ に触れない（N1）。

# Units Generation 質問票 — 260718-election-ts-foundation

> 上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md

## E-OC1 証跡

> E-OC1 証跡: 質問 1 問(ユニット粒度=分解プラン承認を兼ねる)— ユーザー直接裁定(本 intent の選挙不要上書き)。他の論点の選挙不要判定根拠(1論点1行): 境界戦略 = components.md C1〜C7 のコンポーネント凝集で既決 / 統合契約 = decisions.md ADR-3(C6 指令 JSON)で既決 / デプロイモデル = ADR-1(scripts/ 一括・チームローカル)で既決 / 依存順序の並行許容 = team.md parallel-bolts 既決。
> 承認: 承認タイムスタンプ 2026-07-19T01:05:00Z(AskUserQuestion 回答受領)。

## 質問と回答

**Q1: ユニット分割の粒度は?**

- 選択肢: A=6ユニット(推奨) / B=4ユニット(粗) / C=8ユニット(細)
- [Answer]: A — 6ユニット(U1 model / U2 store / U3 render+verify / U4 transport / U5 CLI+機械実行器 e2e / U6 SKILL+検査+実演)。U2/U3/U4 は U1 のみ依存で並行可。(ユーザー裁定 2026-07-19)

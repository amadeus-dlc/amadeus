# Requirements Analysis Questions — 260807-merged-pr-convergence

上流入力(consumes 全数): `intent-statement`(確定裁定 Q1〜Q3)、`scope-document`(In/Out 境界)、codekb の `business-overview` / `architecture` / `code-structure`(現行機構の実測)。既決事項(landed 方式・両 verb 検出・checks informational)は再質問しない。

## Q1. status verb が landed を検出したときの exit code

現行契約(cli.ts:3-14): 0 = converged / 1 = not converged / 2 = gh 境界失敗。landed は「収束判定不能だが着地済み = このユニットに残作業なし」の第3状態。

- A. **exit 0**(推奨): 「呼び出し元が次の行動を要さない」状態として 0 を返す。JSON の verdict フィールドで converged と landed を判別可能にする(exit だけで同一視させない)
- B. **新しい exit code(例: 3)**: 状態ごとに exit を分離(既存消費者の exit 契約拡張が必要)
- X. その他

[Answer]: A(exit 0 — JSON verdict フィールドで converged/landed を判別)

## Q2. landed report の記録に HUMAN_TURN を要求するか

override(cli.ts:460-467)は「人間の裁定」を記録するため HUMAN_TURN を要求する。landed は「GitHub 上で既に人間承認されたマージの事実」の機械導出記録。

- A. **要求しない**(推奨): landed は事実記録であり新たな人間裁定を含まない — マージ承認自体が GitHub 側の人間行為。全フィールド機械導出(cli.ts:86-88 の設計と整合)
- B. **要求する**: override と同格に扱う(毎回の人間往復が残り、本 intent の目的を損なう)
- X. その他

[Answer]: A(HUMAN_TURN 不要 — 全フィールド機械導出の事実記録)

## 裁定の記録

Q1=A(auto-decision-837ea2dab0d2d78018161606bb9eaa0f)/ Q2=A(auto-decision-bf2a78bdb06325497348d82d2ffb853e)— Intent Autonomy Mode full(grant intent-grant-bdacfd16d77dbd4e4a59fdcf104e2fff)下の decide-question 経路(stage-protocol §question under full)。auto-decision は reviewState unreviewed として list/review-auto-decisions で後日人間レビュー可能。
承認: 2026-08-07T11:05:00Z(decide-question 記録タイムスタンプ — 監査 AUTO_DECIDED 行が一次記録)

# コード生成計画 — unit: parallel-policy-docs

上流入力は functional-design 成果物（WF1〜WF4）と requirements.md（R001〜R006、AC-1〜AC-4）である。
変更は文書のみ。Test Strategy は Minimal（検証は N002 test:all と N003 validator、AC-1 の対応表存在確認）。

## トレーサビリティ

| Step | 対応 WF / 要求 |
|---|---|
| Step 1 | WF1（R001、R006）: team.md 新節「worktree の階層と Bolt 実行契約」 |
| Step 2 | WF2（R004）: 判断基準本文の最小追記＋根拠表 4 行 |
| Step 3 | WF3（R002、R003）: memory/phases/construction.md 新規作成（seed 構造踏襲＋「## Bolt 運用」） |
| Step 4 | WF4（R005）: issue-disposition.md |
| Step 5 | 検証（N002、N003、AC-1〜AC-3 の充足確認） |
| Step 6 | code-summary.md |

## 実行ステップ

- [x] **Step 1: WF1** — team.md「同一 worktree での直列化」節の後・「根拠」節の前に新節を追加。内容は business-logic-model.md WF1 の 6 点（Intent/Bolt worktree の関係、直列化との整合、gate evidence の要求水準と理由、意図的差分、#407 5 項目の対応表）。N001: 実装参照（amadeus-bolt.ts のサブコマンド、stage-protocol.md の節）を明記。
- [x] **Step 2: WF2** — 「並行させる単位」「共有成果物の統合」「ゲート承認の運用」各節へ最小追記（占有の通知・引き渡し、意味的接触の申し送り、完了済み Intent の状態も接触面、指示系統の委任）。根拠表へ 4 行追加（参照: #476/PR #479、#477×#479、#481 相談、PR #471〜#475 の占有調整）。
- [x] **Step 3: WF3** — `aidlc/spaces/default/memory/phases/construction.md` を新規作成。seed（.agents/amadeus/tools/data/memory-seed/phases/construction.md）の構造と既存 H2 群を保持（本文は seed 記載のまま）し、新見出し「## Bolt 運用」に R002（walking skeleton 実装済み参照）と R003（切り直し手順）を日本語で置く。
- [x] **Step 4: WF4** — `construction/parallel-policy-docs/issue-disposition.md` に #407/#342 の 3 値判定表と close/継続提案を記録。
- [x] **Step 5: 検証** — `npm run test:all`、`AmadeusValidator . 260705-parallel-policy-docs`、AC-1 対応表の存在と節の実在を確認。
- [x] **Step 6: code-summary.md** — 変更ファイル、主要判断、検証結果、逸脱。

## 制約

- 文書のみ。エンジン・skill・validator・example・CONTEXT.md・docs/adr に触れない。
- 既存の見出し・語彙・粒度に合わせ、既存行の改変は追記に必要な最小限だけ。
- 実例のない判断基準を足さない。

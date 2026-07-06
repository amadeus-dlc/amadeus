# Integration Test Instructions：B001 walking skeleton

scratchpad の一時 sandbox（本番 `aidlc/` を変更しない隔離環境）で、エンジンの全周を確認する。

1. sandbox ディレクトリに、リポジトリ本体の `.claude/{tools,aidlc-common,sensors,scopes,agents,knowledge}` と `rules/aidlc.md` をコピーする。
2. `bun .claude/tools/aidlc-utility.ts intent-birth --scope poc --arguments "sandbox smoke test" --label "sandbox-smoke"`
3. `bun .claude/tools/aidlc-orchestrate.ts next` で run-stage directive（stage、gate、lead_agent、produces、conductor_persona）が発行されることを確認する。
4. 成果物なしで `report --stage intent-capture --result completed` を実行し、エンジンが produces 不在を理由に完了を拒否することを確認する。
5. 宣言された 3 成果物を置いて再度 report し、エンジンが「人間がゲートで行動していない」ことを理由に承認を拒否することを確認する（presence hook は実セッションでだけ発火するため、sandbox ではこの拒否が正しい挙動である）。
6. audit shard（`audit/<host>-<clone>.md`）が自動生成され、ERROR_LOGGED が追記されていることを確認する。

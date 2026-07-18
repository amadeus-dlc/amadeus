# Security Requirements — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 要件

- SNR-W1(NFR-5 / C-24): dispatch プロンプト・表示文言・監査に token/credential を含めない(受け入れ = SKILL 文言と表示モックの検査)
- SNR-W2(C-14 開示の承継): Codex native fan-out は sandbox unrestricted 実測条件下の成立 — SKILL/onboarding に restricted profile 未実測の趣旨を持ち込まない(記述は U3 docs の C-15/C-14 開示に集約。受け入れ = U2 diff に sandbox 安全性の新規確約文なし)
- SNR-W3(worktree 境界): dispatch プロンプトに worktree 内相対パス限定・割当ツリー外 git 操作禁止を毎回含める(c2 規律の SKILL 焼き込み — BR-W6 の一次防御。受け入れ = t181 トークン)

## 検証

- 認証・認可・新規データ収集は非該当(C-21/C-22)— 根拠付き N/A

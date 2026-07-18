# Security Requirements — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 要件

- SNR-W1(NFR-5 / C-24): dispatch プロンプト・表示文言・監査に token/credential を含めない(受け入れ = SKILL 文言と表示モックの検査)
- SNR-W2(C-14 開示の承継): Codex native fan-out は sandbox unrestricted 実測条件下の成立 — SKILL/onboarding に restricted profile 未実測の趣旨を持ち込まない(記述は U3 docs の C-15/C-14 開示に集約。受け入れ = U2 diff への禁止フレーズ導入 0 — 候補語彙: 「sandbox で保護」「安全に隔離される(無条件形)」「restricted でも動作」。確定語彙集合は nfr-design で固定(canonical = U1 driver-contract-core ND の RD-4。参照経路 = unit-of-work-dependency.md の Cross-unit 決定欄 CU-1))
- SNR-W3(worktree 境界): **codex native fan-out の dispatch プロンプト**(本 intent で新規に書く唯一の spawn prose)に worktree 内相対パス限定・割当ツリー外 git 操作禁止を毎回含める(c2 規律の SKILL 焼き込み — BR-W6 の一次防御。claude/kiro 系の既存 dispatch prose は現行維持で対象外。受け入れ = codex SKILL の該当指示の実在 — t181 トークン)

## 検証

- 新規データ収集は非該当(C-22 — 新 PII/顧客データの収集・保存・送信なし)。認証・認可は本 intent が新規の権限境界・資格情報・アクセス制御を一切導入しないため対象外(constraint-register C-01〜C-25 に auth/authz 制約は存在しない — 全数確認済みの不在根拠)— 根拠付き N/A

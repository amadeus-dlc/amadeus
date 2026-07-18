# Security Design — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 設計

- SD-W1(SNR-W1): dispatch プロンプトのテンプレートは unit slug・worktree 相対パス・タスク文のみで構成(env・token を埋め込まない)
- SD-W2(SNR-W2): C-14 開示の禁止フレーズ検査は canonical 6 句(参照経路 = unit-of-work-dependency.md CU-1 → U1 ND RD-4)への diff grep — U2 で独自語彙を定義しない
- SD-W3(SNR-W3): codex dispatch プロンプト冒頭に c2 規律 2 文(worktree 内相対パス限定・割当ツリー外 git 操作禁止)を固定文で置く — t181 トークン化(code-generation で確定)

## 保証機構(層別)

- テンプレート層: 固定文の存在検査(t181)
- レビュー層: プロンプト diff の c2 文言確認

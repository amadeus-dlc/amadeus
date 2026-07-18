# Code Generation Plan — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `requirements.md`(FR-1/3/5/8)、FD 4成果物(`business-logic-model.md` dispatch フロー・変更対象面精密化表・`business-rules.md` BR-W1〜W6・`domain-entities.md`・`frontend-components.md` 表示モック)、ND 5成果物(`logical-components.md` 部品表・`performance-design.md` PD-W1/W2・`security-design.md` SD-W1〜3・`scalability-design.md`・`reliability-design.md` RD-W1〜W4)、`unit-of-work.md` U2。

## 検証方針

受け入れは `requirements.md` FR 受け入れ+ND 各設計(禁止6句 grep・t181 存在検査)に従う。

## 実施計画(worktree 隔離 builder — 実績)

1. swarm prepare batch 2(Bolt 1 マージ済み base から fork — 初回 fork が pre-merge base だったため再接地後に discard→再 fork)
2. builder ディスパッチ(c2・deviation-stop・同期完遂の標準文言)
3. 対象: claude/codex/kiro/kiro-ide の SKILL+codex onboarding:55(FD 精密化表どおり :42/emit:81 不変更)+t181
4. dist/self-install 再生成 → 全検証 → 落ちる実証2面 → 禁止6句 grep 0

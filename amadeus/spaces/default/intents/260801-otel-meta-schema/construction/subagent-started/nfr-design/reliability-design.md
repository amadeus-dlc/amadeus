# Reliability Design — U4 subagent-started

上流入力(consumes 全数): reliability-requirements ほか performance-requirements / security-requirements / scalability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— 信頼性要件は requirements.md NFR-1(fail-open、registry required 検証 fail-closed 不変)+ NFR-3(落ちる実証)から代替導出。business-logic-model.md(実在)の3段ゲート+孤児除外規則を消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## 失敗面の分類

- **hook 入力の欠落**(agent_type 不在等): normalizeAgentType の "unknown" フォールバック(既存 amadeus-log-subagent.ts:34-63 と同一の3段ゲート)— emit は継続(fail-open)
- **Agent ID 欠落**: optional 属性のため省略で emit 継続。突合側は Type LIFO 最近傍で吸収(FD 決定的規則)
- **突合不能な completed(孤児)**: lifetime 合成から除外し、エラーにしない — 部分観測は正常系(セッション途中の journal 読取で started 未完了は常態)
- **registry 検証失敗**(required 欠落): fail-closed で emit 拒否(NFR-1 の例外条項 — 検証劇場を作らないための不変)

## ガード網の信頼性(canonical 79 化)

- 79 化はガード10項目(FD 全数目録)+doc 同期を同一 PR で回す — 1箇所残しはいずれかのガードが赤になることを「落ちる実証」で確認(NFR-3)。部分更新が silent に通る面を pin 網が構造的に塞ぐ

## 検証(落ちる実証)

- hook 入力欠落・ID 欠落・孤児 completed・required 欠落の各経路を注入し、期待の fail-open/fail-closed 分岐を assert。経路到達は lcov DA で実測確認(error-path-reach-lcov)

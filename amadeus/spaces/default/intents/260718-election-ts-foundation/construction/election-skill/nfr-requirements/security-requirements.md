# Security Requirements — election-skill(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 語彙境界(本ユニットの中核検査)

- SKILL 本文に選挙手順の規則語彙(GoA 集計規則・賛成/反対閾値・シャッフル手順・開票条件分岐)が現れないことを禁止語彙 grep で固定(requirements.md FR-8a 受け入れ (i)。business-rules.md の語彙集合 — vocabulary-collision 回避の語彙設計は検査述語側で vacuity guard と対にする)
- SKILL は判断点を人間へ委譲する転送ループのみ記述(FR-8a (ii))— 秘匿情報・資格情報の記述なし。subagent 実演のプロンプトにも選挙ノルム(team.md 該当 cid 群)を含めない(business-logic-model.md 実演層の構成)

## 配置と到達面

- contrib/skills/ は dist 非対象の overlay チャンネル(requirements.md FR-8a — promote-self.ts:45-46 実測)で、到達ハーネスは Claude/Codex の2経路(`.claude/skills`, `.agents/skills` — U6 FD レビュー是正済みの実測)。配布フレームワークへの投影がないため配布面の攻撃面を追加しない(technology-stack.md の既存構成に変更なし)

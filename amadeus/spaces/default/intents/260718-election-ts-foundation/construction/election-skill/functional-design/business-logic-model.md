# Business Logic Model — election-skill(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## SKILL 構造契約(C7 — FR-8a AC(ii)、転送ループのみ)

SKILL.md(contrib/skills/amadeus-election/)の記述は次の4節に限定:

1. **起動**: `bun scripts/amadeus-election.ts next --election <id>` を呼ぶ
2. **転送**: 指令 JSON の kind ごとに「指令が名指しした verb を字義どおり実行 → report」
3. **人間委譲**: `hold` 指令は提示文をそのまま人間へ渡し、裁定を待つ(AI は判断しない)
4. **終了**: `done` で記録パスを報告

選挙手順の知識(GoA 集計規則・賛成/反対閾値・シャッフル手順・開票条件)は本文に一切書かない — 正本は U1〜U5 の TS(FR-0)。

## 禁止語彙 grep 検査(FR-8a AC — vocabulary-collision 回避の語彙設計)

- 禁止語彙集合(実装時に確定・canonical 1定義): GoA の数値集計規則を表す語(例: 「1-3・6=賛成」「7-8=反対」等の規則文)・シャッフル手順語・開票条件分岐語
- 検査は SKILL.md の**規則記述文脈に限定**(kind 列挙・verb 名の単純出現は許可 — 語彙衝突で検査が空文化しないよう境界を机上トレース+vacuity guard テストでピン)
- 検査自体は tests/ 側の検査テスト(U6 成果物)— corpus = SKILL.md 1ファイル

## ノルム無参照 subagent 実演(ADR-6 (ii) — 非 CI・1回)

実装 intent の build-and-test で、選挙ノルム(team.md 該当 cid 群)を prompt に含めない subagent に SKILL 本文+ツールパスのみを与え、実選挙1件(zero-confirm 可)を完走させ記録を成果物に残す。

## Bolt 切り出しの参照(正本 = bolt-plan.md)

U6 全体は Bolt 5(skill-wrap)。

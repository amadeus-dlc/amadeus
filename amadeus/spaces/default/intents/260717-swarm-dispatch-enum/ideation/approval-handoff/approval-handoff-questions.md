# Initiative Approval & Handoff Questions

**Mode:** Chat

**ユーザー承認**: 2026-07-17T22:18:51Z — 「Phase末尾のゲートまで推奨で進めて」に基づき、Q1〜Q7 の推奨案を採用

## 上流入力

本質問は [`intent-statement.md`](../intent-capture/intent-statement.md)、[`scope-document.md`](../scope-definition/scope-document.md)、[`intent-backlog.md`](../scope-definition/intent-backlog.md)、[`feasibility-assessment.md`](../feasibility/feasibility-assessment.md)、[`constraint-register.md`](../feasibility/constraint-register.md) を統合する。

`competitive-analysis` は Market Research、`team-assessment` は Team Formation、`wireframes` は Rough Mockups が scope により skip されたため存在しない。これらは不足成果物として補完せず、各質問で非適用根拠を明示する。

## Q1. Intent と Scope に対するステークホルダー合意

Intent owner が Intent Capture、Feasibility、Scope Definition の各ゲートで、三モード契約、Conditional GO、Must／Won't 境界を承認している。maintainer、quality、documentation の関心も `stakeholder-map.md` と受け入れ証拠へ反映済みである。この合意を Ideation の有効なステークホルダー合意として扱うか。

- A. 合意済みとする。外部 harness provider は能力依存先であり、本 Initiative の scope 決定者には含めない
- B. 追加の maintainer 承認を Ideation 中に要求する
- C. 外部 provider の個別承認まで待つ
- X. Other（自由記述）

[Answer]: A. 合意済みとする。外部 harness provider は能力依存先であり、本 Initiative の scope 決定者には含めない — User input: `Phase末尾のゲートまで推奨で進めて` — 2026-07-17T22:18:51Z — Mode: Chat

## Q2. Critical Risk と緩和策

R-01／I-01 の worktree isolation 未実証は Critical blocker であり、Requirements で Codex floor を確約する前に live proof を要求する。失敗時は headless worker や別 driver へ fallback せず No-Go とする。残るリスクには fail-closed test、監査整合、生成物 drift check、規模ゲートを割り当てている。この扱いで進めるか。

- A. Critical risk を認識した Conditional GO とし、hard stop と代替緩和策を handoff contract に固定する
- B. Ideation 中に blocker を解消するまで進めない
- C. blocker を既知制約として受容し、停止条件を外す
- X. Other（自由記述）

[Answer]: A. Critical risk を認識した Conditional GO とし、hard stop と代替緩和策を handoff contract に固定する — User input: `Phase末尾のゲートまで推奨で進めて` — 2026-07-17T22:18:51Z — Mode: Chat

## Q3. Budget と Resource Commitment

固定の費用、納期、LOC cap は設定されていない。現時点で必要な commitment は、Inception の分析を Amadeus の既定 agent roles と人間承認ゲートで進め、Units Generation で規模と実装単位を再審査することである。Construction の named mob、日程、実装予算は Delivery Planning 前に確約しない。この段階的 commitment を採用するか。

- A. Inception への process commitment を承認し、Construction の resource commitment は Delivery Planning ゲートで確定する
- B. Ideation で named human team と日程を必須にする
- C. resource commitment なしで Construction まで自動承認する
- X. Other（自由記述）

[Answer]: A. Inception への process commitment を承認し、Construction の resource commitment は Delivery Planning ゲートで確定する — User input: `Phase末尾のゲートまで推奨で進めて` — 2026-07-17T22:18:51Z — Mode: Chat

## Q4. Rough Mockups

本 Initiative は repository 内の conductor／audit 契約変更であり、新しい画面、ユーザーフロー、visual interaction を導入しない。Rough Mockups は skip され、`wireframes` は存在しない。この非適用判定を維持するか。

- A. 非適用とする。利用者可視面は decision table、runtime message、documentation で検証する
- B. CLI 表示の rough mockup を追加する
- C. 新しい GUI 設計を scope に追加する
- X. Other（自由記述）

[Answer]: A. 非適用とする。利用者可視面は decision table、runtime message、documentation で検証する — User input: `Phase末尾のゲートまで推奨で進めて` — 2026-07-17T22:18:51Z — Mode: Chat

## Q5. Market Research と投資根拠

外部市場での差別化や build-vs-buy を判断する Initiative ではなく、既存 Amadeus framework の予測可能性・監査可能性を修復する brownfield change である。Market Research は skip され、`competitive-analysis` は存在しない。投資根拠は Issue #1157、旧 PR #982 の過大化、現行コードと live probe の証拠で十分か。

- A. 十分とする。市場成果物は非適用であり、内部利用者価値と実測証拠を判断根拠にする
- B. 競合 orchestration 製品の調査を追加する
- C. build-vs-buy 調査を追加する
- X. Other（自由記述）

[Answer]: A. 十分とする。市場成果物は非適用であり、内部利用者価値と実測証拠を判断根拠にする — User input: `Phase末尾のゲートまで推奨で進めて` — 2026-07-17T22:18:51Z — Mode: Chat

## Q6. Mob Staffing と Schedule

Team Formation は scope により skip され、`team-assessment` と named mob schedule は存在しない。Ideation では Delivery Agent、Product Agent、Architect、Quality、Developer の責務だけを handoff し、具体的な Unit／Bolt／mob は Inception の Units Generation と Delivery Planning で確定する。この順序でよいか。

- A. よい。未定の人員を捏造せず、Inception で Unit と依存が確定してから staffing／schedule を承認する
- B. Ideation 中に named mob を割り当てる
- C. staffing を定めず Construction を開始する
- X. Other（自由記述）

[Answer]: A. よい。未定の人員を捏造せず、Inception で Unit と依存が確定してから staffing／schedule を承認する — User input: `Phase末尾のゲートまで推奨で進めて` — 2026-07-17T22:18:51Z — Mode: Chat

## Q7. Initiative Ruling

Intent、Scope、Intent Backlog は整合し、S-01〜S-09 はすべて Feasibility の制約・リスク・依存へ trace する。一方、prepared Unit worktree isolation は未実証であり、成功扱いにはできない。Initiative の最終推奨をどうするか。

- A. Conditional GO。Inception へ進めるが、worktree isolation proof を Requirements 確約前の hard stop とし、不成立なら No-Go にする
- B. 無条件 GO とする
- C. 現時点で No-Go とする
- X. Other（自由記述）

[Answer]: A. Conditional GO。Inception へ進めるが、worktree isolation proof を Requirements 確約前の hard stop とし、不成立なら No-Go にする — User input: `Phase末尾のゲートまで推奨で進めて` — 2026-07-17T22:18:51Z — Mode: Chat

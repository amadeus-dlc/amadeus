# Scope Definition — 質問票

- **Intent**: `260805-subagent-type-guard`
- **Stage**: scope-definition (1.4 / IDEATION — フェーズ最終ステージ)
- **Scope**: self-feature / **Depth**: Standard(合計最大8問、追質問込み)
- **上流入力(consumes 全数)**: `intent-statement`(必須・実在)/ `feasibility-assessment`(任意・不在 — self-feature では feasibility が SKIP)/ `constraint-register`(任意・不在)
- **測定 ref**: `7060956c5617125dd2f4e284957aa180cb306484`

## 質問しない事項(intent-capture Q1〜Q4 で確定済み)

`cid:requirements-analysis:no-election-for-decided-norms`(既決の規範は再度の選挙・質問の対象にしない)
および `cid:intent-capture:c1` により、以下は再質問せず前提として `scope-document.md` へ反映する。

| 既決事項 | 出典 |
|---|---|
| In: (a) Agent Type の許可集合照合(advisory) / (b) SUBAGENT イベントへの model 属性と集計 | Q1 = A |
| Out: (c) 汎用 builder persona の新設 | Q1 = A |
| Out: `CXR-33` の改訂 | Q3 = D |
| Out: `.claude/settings.json` の drift 是正 | Q4 = C |
| Must の判定基準: SM-1〜SM-4(検出の即時性 + 事後集計の両方) | Q2 = C |
| ガードの記録面: `SUBAGENT_STARTED` / `SUBAGENT_COMPLETED` の両方 | Q4 = C |

## 質問

### Q1. 順序付け方針(sequencing preference)

`intent-statement.md` の申し送り R-1(Claude Code / Codex の live payload に `model` が載るか)は
未確定であり、(b) の実現範囲を左右する。この不確実性をどこで潰すか。

- A. **risk-first** — R-1 の実測を最優先で潰し、その結果を見てから (a) と (b) の作り込みへ進む
- B. **value-first** — (a) の検出ガードを先に出荷して即時価値を取り、(b) は後続
- C. **dependency-first** — 依存グラフ順(共有の許可集合解決 → (a) → (b))で機械的に並べる
- X. Other (please specify)

[Answer]: A — risk-first。R-1(live payload の model 有無)の実測を最優先で潰し、その結果を見てから (a)(b) の作り込みへ進む。`cid:scope-definition:c3`(raw WSJF より dependency と risk-first を優先、未証明の基盤に依存する価値面を先行着地させない)の先例と一致。ユーザー承認: 2026-08-05T15:10:00Z(**Mode:** guided)

### Q2. 別 Issue へ回した2件をいつ起票するか

Q1(c) 汎用 builder persona と Q4 の settings drift 是正は本 intent のスコープ外だが、
起票しなければ失われる。`cid:requirements-analysis:issue-first-capture` は「発見時点で起票し本線へ戻る」を定める。

- A. 本 intent の完了までに起票する(スコープ外の作業は行わず、起票のみ)
- B. 発見済みなので**今すぐ**起票する(クロスレビュー2名成立は着手時の前提なので起票自体は先行可)
- C. 起票しない(本 intent の record と Issue #2279 のコメントに記録が残るため十分)
- X. Other (please specify)

[Answer]: B — 今すぐ起票する。`cid:requirements-analysis:issue-first-capture`(発見時点で起票し本線へ戻る)に従い、クロスレビューで証拠が揃っているうちに正書式で書く。起票のみでスコープ外の作業は行わない。ユーザー承認: 2026-08-05T15:10:00Z(**Mode:** guided)

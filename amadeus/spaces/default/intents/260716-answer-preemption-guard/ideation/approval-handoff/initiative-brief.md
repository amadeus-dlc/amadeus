# Initiative Brief — answer-preemption-guard(Issue #922)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`(問題・成功基準)、`../scope-definition/scope-document.md`(IN/OUT)、`../scope-definition/intent-backlog.md`(B1〜B5)、`../feasibility/feasibility-assessment.md`(実測前提)、`../feasibility/constraint-register.md`(C1〜C8)。

## 一言要約

[Answer] 先取り記入(選挙裁定前の記入)を、#1101 実装済みの共有述語 `checkQuestionsEvidence` の **sensor 発火点追加**で gate-start より早期に loud 検知する。

## なぜ今か

規範(election-answer-after-ruling)persist 後も先取り記入が4例再発 — 検知が人間的注意力に依存。E-OC1 ガード(#1106、fail-closed 層)は gate-start 時点でしか効かず、記入〜ゲートの間に汚染が下流へ流れる窓が残る。

## 何を出荷するか(backlog 対応)

B1: answer-evidence sensor(manifest+実装 adapter+stage frontmatter 宣言)/ B2: cutoff 定数 canonical 化(必要時)/ B3: (b) lint 化の採否判断 / B4: dist×5+self-install×2 同期 / B5: Issue #922 クローズ(着地 grep 後)。

## リスクと緩和(approval-handoff:c1 — 代替緩和策併記)

| リスク | 一次緩和 | 代替緩和 |
|--------|---------|---------|
| corpus false-red(旧様式111件) | cutoff 継承(C2) | matches glob で 260716 以降の intent dir に限定 |
| cutoff 定数の複製 drift(R2) | amadeus-lib.ts へ canonical 化 | 定数同値を検査するテストで drift を loud 化 |
| frontmatter 宣言の diff 肥大(R1) | 対象ステージを questions 産出ステージに限定 | sensor 側 matches glob のみで選別(宣言追加なし)— 設計で比較 |
| hook 発火経路が questions 書込みに未到達(A1) | design 段で PostToolUse matches 経路を実測 | 手動 fire 運用(ゲート報告前の定型)で補完 |

## 判定要請

Construction へ進む承認を要請(単一 Bolt 規模、walking-skeleton は scope=amadeus のスコープ既定に従う)。

# Code Summary — advisory-retirement(U3 / #3187)

上流入力: `code-generation-plan.md` / FD 3 成果物 / `nfr-design/security-design.md` / `unit-of-work.md` U3 / `requirements.md` FR-RET-1〜4。数値は builder 完了報告と CI ログからの転記(測定 ref = worktree commit `2647fb4b1`、着地 = PR #3362 squash `1a1ffb58f`、2026-08-20T20:43:54Z マージ)。

## write scope 追補(上流 FOLLOW-UP の閉包点)

`amadeus/spaces/default/specs/rfc/0001-intent-autonomy-modes.md` は unit-of-work.md の U3 宣言 write scope に未記載だが、FD 手順5(RA §12a MAJOR-3 の pointer-update 裁定 auto-decision-e13e9039)が名指しで編集を指示する面であり、**本 unit の write scope へ +3/−1 の1点編集として追補する**(FD business-logic-model.md §12a iteration 1 と nfr-design security-design.md §12a iteration 1 の両 FOLLOW-UP が指定した閉包点 = 本節)。specs/ 配下の committed spec であり工程記録ではない — 所有権交差なし(他 unit は非接触)。

## 実装実測

- **規模**: 20 ファイル、+83 / −692(見積 −300〜400 に対し docs/RFC/テスト面込みで削除が上振れ — FD 必須要素の計上どおり)
- **変更面**: plugin.json(−19)、tla-authoring.ts(net −165)、stages/tla-authoring.md(±2)、docs 2面(−64)、RFC(+3/−1)、テスト **13** ファイル(削除 2 = t528/t524 −318、部分更新 2 = t481/t527、期待値更新 8 = t526/t529/t532/t444/t445-supply/t445-cli/t353/t113、pin 追随 1 = t450)、coverage-registry regen(−4)— 合計 1+1+1+2+1+13+1 = 20 で規模行と一致
- **baseline**: 削除前 t528/t524 = 8 pass / 0 fail(BR-7)
- **census(FR-RET-4)**: 9 キー全て帰属除外外 0(before→after: authoring-hold 14→2[除外]、authoring-subjects 7→0、advisoryHold 4→2[除外]、defaultSubjectsPath 3→0、subjectsDeclare 1→0、publishSubjects 1→0、GovernedSubjects 1→0、governed-subjects-unreadable 3→1[除外]、subjects declare 5→0)。対照 spec-change 9(非ゼロ)。`bun run build` 後の投影面(.claude/ + dist)でも全キー 0(advisoryHold 9 は全て engine 投影 = 除外 (a))
- **engine 非接触**: amadeus-orchestrate.ts diff 0 行(BR-2)
- **検証**: typecheck 0 / lint 0 / 触れた 11 テストファイル(= 13 − 削除 2)197 pass / 0 fail / registry --check 0。unit 全体の 38 fail は ablation(HEAD~1 同一条件比較)で既存帰属を実測
- **着地面実読**(origin/main、クローズ時): **残存ゼロ期待の 6 キー**(authoring-subjects / defaultSubjectsPath / subjectsDeclare / publishSubjects / GovernedSubjects / subjects declare)を fixture 除外つきで再実測し全て 0。**帰属済み残存を持つ 3 キー**(authoring-hold = RFC 退役注記 (c) + fixture (d)、advisoryHold = engine 同名別物 (a)、governed-subjects-unreadable = 実測 fixture (d))は pre-merge census で帰属確定済みのため再実測から除外 — 除外クラスは FD business-logic-model.md の (a)〜(d) へ全て写像済み。advisories = {spec-change}

## 逸脱(全て裁定済み — 無申告ゼロ)

D1(stage 手順の部分削除)/ D2(t527 再配線)/ D3(census 除外への実測 fixture 追補)— 選挙 **E-260820-FMC-CG-U3DEV** 2-0 追認。FD 除外リストへ (d) クラス規則を追補済み。

## 配送・クローズ

PR #3362(converged:true・CLEAN・unresolved 0 実測 → 常任承認条件でマージ)→ Issue #3187 クローズ(着地面実読コメント付き)。pr-convergence-report.md(kind: converged)同梱。

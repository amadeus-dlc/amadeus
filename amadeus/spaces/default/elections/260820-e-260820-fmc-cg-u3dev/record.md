# Election Record
Election ID: E-260820-FMC-CG-U3DEV
Run ID: run-1
Lifecycle: tallied
Established questions: 1
Hold questions: 0
Held question IDs: none

## Question q-u3-deviations: code-generation U3 advisory-retirement(#3187、worktree commit 2647fb4b1)の builder が FD からの逸脱3件を申告し停止・報告した。裁定を求める。【D1】stages/tla-authoring.md:53 の手順4を FD は『削除して後続を詰める』と指示したが、実ファイルでは手順4が最終手順で subjects declare と存続契約(applicability receipt --persist true — t450 が依存)の両方を運ぶため、builder は subjects declare 呼出のみ削除し receipt 文を保持した。【D2】t527 の処分を FD は『:80 の subjectsPath fixture 行の除去のみ』と指示したが、実ファイルは全テストが declareSubjects()(退役 verb)を呼んでおり :80 のみの除去ではファイルが壊れるため、builder は #3262 receipt 検証というファイルの宣言目的を保持したまま helper を存続 verb(identity extract / applicability series / flat hold)へ再配線した(5 pass / 0 fail)。【D3】census 9キーのうち3キーが tests/fixtures/pr-convergence/measured-pr-2268.graphql.json(PR #2268 の GitHub GraphQL 実測キャプチャ、6テストが消費、キーは歴史的レビューコメント散文内のみ)に残存 — FD 除外リスト外。builder は実測キャプチャの改変は P2 違反かつ6テスト破壊のため非改変とし、除外 (b)(工程記録/git 履歴)と同類と帰属して継続、FD 除外リストへの明記を要請した。提案: 3件とも実ファイル形状に基づく必然的適応として追認し、conductor が FD の census 除外リストへ fixture を追補する(選択肢1)。D1/D2 は存続挙動の保護であり FD の意図(退役機構のみの完全撤去・存続面の非接触)に整合、D3 の非改変は P2 に整合する。
Established: 3件とも追認 + FD 除外リスト追補 (choice 1)
Choice counts:
- Choice 1 3件とも追認 + FD 除外リスト追補: 2
- Choice 2 D1/D2 追認、D3 は差し戻し: 0
- Choice 3 全件差し戻し: 0
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-20T19:45:00Z] GoA 2: D2's exact '6テスト消費' figure was not independently confirmed at test-block granularity (only confirmed 3 consuming files with 13/4/5 test() blocks respectively, not which subset touches this specific fixture) — this is a minor sourcing gap in the builder's rationale, not in the substantive claim, and doesn't change the ruling. For D3, recommend the FD exclusion-list addendum be scoped at file grain (whole fixture file, matching the git-grep -l file-level census predicate) rather than line grain, consistent with iteration-1 review's NIT about exclusion (c) already needing file-grain clarification — avoids the same ambiguity recurring for a fourth exclusion category.
- Reservation subagent-2 [original:2026-08-20T19:45:00Z] GoA 2: Acceptance is conditioned on the FD exclusion list actually being amended (not merely acknowledged) with a class-based rule covering verbatim-preserved measured GraphQL/PR fixtures whose README documents comment-body verbatim-preservation as primary evidence, so D3-class hits are excluded by predicate at future census runs rather than requiring a fresh ad hoc judgment call each time. D1/D2 need no further follow-up: both are directly falsifiable against file shape (t450:172 pins the exact receipt/persist text D1 preserves; t527 empirical 5 pass/0 fail confirms D2 rewire is behavior-preserving).
Late responses:
- None
Run lineage: run-1

## Timeline
- tallied at=2026-08-20T19:46:43Z run=run-1
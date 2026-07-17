# Decision Log — codekb diff3 cleanup(Issue #1129)

上流入力(consumes 全数): `intent-statement.md`、`scope-document.md`、`intent-backlog.md`、`feasibility-assessment.md`、`constraint-register.md`。

## Ideation Decisions

| ID | Decision | Source / Evidence | Consequence |
|---|---|---|---|
| D-01 | 問題はmain汚染ではなく、e1系branchの孤立diff3 base断片である | Issue #1129、起票者以外2名cross-review、`intent-statement.md` | cleanなmainと未着地fix commitを分けて追跡 |
| D-02 | 修正はCodeKB 2ファイルの4行削除に限定する | commit `5e92d1516`、`feasibility-assessment.md` | application codeと履歴本文を変更しない |
| D-03 | 成功条件はsentinel `0 / 0`、最新ヘッダ `1 / 1`、履歴保持 | `intent-statement.md` Success Metrics、constraint C-02/C-03 | post-landingで同じ述語を再計測 |
| D-04 | feasibilityはGO、ただし着地順序をprocess constraintとする | `feasibility-assessment.md` verdict | 技術spikeや新規serviceを作らない |
| D-05 | AWS・regulatory・market・UI・mobは非該当 | feasibility questions、state SKIP plan | market/team/mockup成果物を要求しない |
| D-06 | scopeはparkからcloseまでのdependency-first chainとする | `scope-document.md` Value Stream、`intent-backlog.md` B-01〜B-06 | 順序入替を許さない |
| D-07 | bug Issue-firstを維持し、既存Issue #1129へrecord状態を同期する | `cid:requirements-analysis:intent-first-mirror-issue` | 重複ミラーIssueを作らない |
| D-08 | main mergeは人間承認後にleaderが執行する | constraint C-04、no-AI-merge | conductorはmergeしない |
| D-09 | Issue closeはlanding実測後にleaderが行う | constraint C-05、close-after-landing-verification | 先行closeを禁止 |
| D-10 | 既決diff3 marker語彙を再persistしない | constraint C-06、`cid:reverse-engineering:diff3-marker-vocab` | 全Ideation stageの§13候補を重複0件で扱う |
| D-11 | approval-handoff後はInceptionへ進まずparkする | user intent、`scope-document.md` Current Conductor Boundary | B-02以降をleaderへhandoff |

## Gate and Question Evidence

| Stage | Questions | Leader Decision | §13 |
|---|---:|---|---|
| intent-capture | 0 | 2026-07-17T17:49:29Zに質問不要判定承認 | persist 0件、2026-07-17T17:52:38Z |
| feasibility | 0 | 2026-07-17T17:57:23Zに質問不要判定承認 | persist 0件、2026-07-17T17:59:35Z |
| scope-definition | 0 | 2026-07-17T18:02:20Zに質問不要判定承認 | persist 0件、2026-07-17T18:04:21Z |
| approval-handoff | 0 | 2026-07-17T18:06:47Zに質問不要判定承認 | persist 0件、2026-07-17T18:08:47Z |

各questionsファイルは、質問不要判定の要旨とleader承認timestampを保持する。回答を捏造せず、既決証拠または非該当性から0問とした。

## Open Decisions and Deferred Work

Ideation内の未決Product / Architecture / Delivery判断はない。下流で未実施なのは判断ではなく、B-02〜B-06の外部状態操作である。leaderはrecord review作成、既存Issue同期、独立review回収、人間merge承認、post-landing再計測、Issue closeを順に執行する。

## Recommendation

initiativeを **GO TO VERIFIED PARK** とする。phase-checkがPASSし、approval-handoff gateがstanding grantで承認された後にparkする。record reviewのマージと明示的な再開指示がない限り、Inceptionへ進めない。

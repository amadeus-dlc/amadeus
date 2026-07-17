# Initiative Brief — codekb diff3 cleanup(Issue #1129)

上流入力(consumes 全数): `intent-statement.md`、`scope-document.md`、`intent-backlog.md`、`feasibility-assessment.md`、`constraint-register.md`。

## Intent and Outcome

e1 の `fix/1027-state-set-fail-closed` 系統の共有 CodeKB 2ファイルに残った孤立 diff3 base sentinel と旧「最新」ヘッダ断片を、修正 commit `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0` が計4行削除した。本 initiative は機能を作るのではなく、その修正と clean 条件を review可能な intent recordへ固定し、main 着地後の再計測と [Issue #1129](https://github.com/amadeus-dlc/amadeus/issues/1129) closeまでを正しい順序でhandoffする。

## Feasibility and Risk

`feasibility-assessment.md` の verdict は **FEASIBLE WITH PROCESS CONSTRAINTS**。application runtime、API、schema、CI、AWS、規制対象データを変更せず、新規費用は0である。技術リスクは低く、残るriskは次の4点に限定される。

1. clean な現mainだけを見て修正branchの着地追跡を省略する。
2. sentinelだけを確認し、最新ヘッダ数を見落とす。
3. main着地前にIssueをcloseする。
4. 既決のdiff3 marker CIDを重複persistする。

`constraint-register.md` は、ref付き全数計測、人間merge、着地後close、重複学習禁止をbinding constraintとしている。全riskにmitigationとownerがあり、Ideation parkを妨げるblockerはない。

## Scope Boundary

`scope-document.md` と `intent-backlog.md` は、次のdependency-first chainを唯一の有効順序とする。

1. Ideation成果物とphase-checkを完了し、intentをparkする。
2. pushed branchから [record PR #1181](https://github.com/amadeus-dlc/amadeus/pull/1181) でrecord reviewを開始する。
3. 重複Issueを作らず、既存Issue #1129へrecord linkとpark状態を同期する。
4. 起票者以外2名の独立reviewと人間承認後にmainへ着地する。
5. landed mainでsentinel `0 / 0`、最新ヘッダ `1 / 1` を再計測する。
6. 条件5の後にIssue #1129をcloseする。

CodeKBへの追加変更、機能実装、AWS変更、重複bug Issue、既決diff3ノルム再設計、AI merge、Inception / Constructionはout of scopeである。

## Market, Visual, and Team Applicability

- **Market validation**: 非該当。内部repositoryのbug branch hygieneであり、market-researchは計画どおりSKIP。
- **Concept visuals**: 非該当。UI / interactionを変更せず、rough-mockupsはSKIP。
- **Team plan**: 新規mobは不要。team-formationはSKIPし、conductor e1がIdeation+park、leaderがrecord review / Issue同期 / merge執行、reviewerが独立検証、ユーザーがmain mergeを承認する。

## Success and Evidence

| Outcome | Measure | Current Evidence | Final Evidence Owner |
|---|---|---|---|
| branch残渣なし | 2ファイルのsentinel `0 / 0` | conductor HEADとorigin/mainで実測済み | leader / reviewer |
| header構造正常 | 最新ヘッダ `1 / 1`、履歴保持 | intent-captureで実測済み | leader / reviewer |
| 修正経路trace | fix commitとrecord review URL | fix commitはremote branchに存在 | leader |
| irreversible操作の統制 | 人間承認後だけmain merge | no-AI-merge constraint | user / leader |
| close順序 | landing実測後だけCLOSED | Issueは現在OPEN | leader |

## Go / No-Go Recommendation

**GO TO VERIFIED PARK**。Ideation成果物は一貫し、実現可能性・scope・risk mitigation・責任境界が揃っている。approval-handoff gateとIdeation phase-checkを通した後、この intent はparkする。Inceptionへは進まず、record reviewのマージと明示的な再開指示がない限り実装stageを開始しない。

## Handoff Package

- 正本record: `amadeus/spaces/default/intents/260717-codekb-diff3-cleanup/`
- 修正commit: `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0`
- current conductor branch: `team/20260718-023505-0ccc/engineer-1`
- downstream owner: leader(B-02〜B-06)
- mandatory stop: 人間merge承認なし、またはpost-landing件数不一致ならIssueをcloseしない。

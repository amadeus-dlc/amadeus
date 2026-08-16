# Code Summary — unit completion-report(C9 / ADR-3)

## Commits(worktree `bolt-completion-report`、base `swarm-int-rfc0001@54baec9ce`)

| sha | subject |
|---|---|
| `4d2fc1873` | feat(autonomy-review): thread pagination cursor through listProductionAutoDecisions |
| `013e5740f` | feat(completion-report): generate auto-decision summary at workflow completion (C9/ADR-3) |
| `cd7c7cb1a` | test(completion-report): cover auto-decision summary generation and non-blocking paths |

## 実装 summary

- `amadeus-autonomy-review-production.ts`(+7行): `listProductionAutoDecisions`ラッパーへoptional cursor引数を追加。既存の全呼出し元は無影響(純追加)。
- `amadeus-completion-report.ts`(新規、197行): `buildAutoDecisionSummary(pd, recordDir)` — AUTO_DECIDED監査行と`listProductionAutoDecisions`(最終ページまで走査)の2ソースのみからtotal/basisKind/reviewState集計を構成し、両ソース不一致時は`countMismatch`を明示(R-8)。LLM生成の計数・散文なし(R-2)。
- `amadeus-state.ts`(+52行): `completeWorkflowForTarget`のstate書込後・completion JSON出力前に配線(R-4)。record dir未解決・list APIエラー・markdown書込失敗のすべてを`auto_decision_summary_warning`へ解決、`complete-workflow`自体は継続する(R-3)。外側try/catchをこの設計が想定しない失敗のbackstopとする。
- `tests/integration/t3121-completion-report.integration.test.ts`(新規、227行) / `tests/unit/t3121-completion-report-markdown.test.ts`(新規、75行)。

## 検証(実測)

builder notesが本unitについて作成されなかったため、下記は本レポート起草時にworktree `bolt-completion-report`(HEAD `cd7c7cb1a`、`git status --short`は本unit外の未追跡intent recordファイル2件のみでクリーン)で実測した値。

| コマンド | 結果 |
|---|---|
| `bun test tests/integration/t3121-completion-report.integration.test.ts tests/unit/t3121-completion-report-markdown.test.ts` | 6 pass / 0 fail / 29 expect() calls / exit 0 |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0(469 warnings / 19 infos — pre-existing baseline、他unitの同時期実測(468〜470)と整合する範囲) |
| `bun tests/gen-coverage-registry.ts --check` | exit 0("OK (fresh, guards green, ratchet held)") |
| `bun run build` | 未転記(本レポート起草時に未実行) |

## Red 逐語

builder notesが存在しないため、実装前のRed逐語は本レポートへ転記できない(未転記)。FDのbusiness-rules.md「落ちる実証」節が定める期待は以下:
- 現行: `completeWorkflowForTarget`のcompletion JSON(`amadeus-state.ts:3403-3412`)にauto-decision要約に相当するフィールドが存在しない。
- 導入後: 同じrecord断面で`auto_decision_summary`フィールドがAUTO_DECIDED実測件数と一致することをpinする(Green)。
- non-blockingの実証: record dir解決を意図的に失敗させるfixtureで`complete-workflow`自体がexit 0のまま完了し、`auto_decision_summary_warning`のみが立つことを実測する。

コミット`cd7c7cb1a`のメッセージは、この2件のnon-blocking falling proof(AUTO_DECIDED行0件のケース、summaryパス書込失敗のケース)が実装されテストされたことを述べている(「Two non-blocking falling proofs: no AUTO_DECIDED rows present, and a write failure at the summary path (completion/ occupied by a file) — both still complete the workflow and surface the failure only as auto_decision_summary_warning」)が、実測前後の逐語出力はnotesに残っていないため未転記。

## 申し送り

- **builder notes欠落**: 本unitの`/private/tmp/.../scratchpad/builder-notes-completion-report.md`は存在しない(他11unitはすべて存在)。本レポートの「検証」節はbuilder notesの転記ではなく、本レポート起草時にworktree `bolt-completion-report`で再実行して得た実測値である旨を明記する。Red逐語・落ちる実証の詳細(注入内容、赤の具体的出力)はnotesが無いため再現できず未転記とした。
- 逸脱: notes不在のため申告内容を検証できないが、commit差分(3コミット、owned files内: `amadeus-autonomy-review-production.ts` / `amadeus-completion-report.ts` / `amadeus-state.ts` / 2テストファイル)を見る限りFDのR-1〜R-8の範囲を超える変更は見当たらない。

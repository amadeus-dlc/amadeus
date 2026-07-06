# Code Summary — steering-learnings

上流入力: [code-generation-plan.md](code-generation-plan.md)、[business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)

## 変更内容（ファイル・節粒度）

| ファイル | 節 | 変更内容 | 対応 FR | 対応 BR |
|---|---|---|---|---|
| `aidlc/spaces/default/memory/team.md` | 並行運用ポリシー > 新節「多体連携の運用」（H2、H3 小見出し 4 つ） | 適用条件・エージェント固定 worktree・質問プロトコル・承認中継を新規追加 | FR-1.1〜FR-1.5 | BR-1、BR-2、BR-11、BR-14 |
| 同上 | 並行運用ポリシー > 根拠（既存表への行追加） | 多体連携の実例行（Issue #497、PR #500、#497 転記コメント）を追記 | FR-1.6 | BR-2 |
| 同上 | Git Branching Policy > Branch Lifecycle > ### branch 名 | ロール名 prefix（`leader/`、`eng1/`〜`eng3/`）の段落と例ブロックを既存例ブロックの直後に追加 | FR-2.1 | BR-13 |
| `aidlc/spaces/default/memory/project.md` | Corrections（既存箇条書きへの追記） | HUMAN_TURN 中継 mint 前例（cid:reverse-engineering:c1）を追記。codekb 参照台帳 stub 前例は当初追記したが、C-6 / BR-3（validator seam 差は Issue 管理側）違反のため reviewer iteration 1 で撤回した | FR-3.1、FR-4.3 | BR-3、BR-6 |
| `construction/steering-learnings/code-generation/learnings-triage.md`（新規） | 全文 | 試行 record 5 ステージ memory.md 全 26 エントリの採用・不採用と理由の一覧 | FR-4.1、FR-4.2 | BR-7 |

実装コード・テストコードは 1 件も生成していない（C-1、BR-4）。`codekb/amadeus/` への変更もない（BR-4）。完了済み Intent record `260705-agmsg-trial-docs/` 配下の成果物は書き換えていない（BR-5）。`.coderabbit.yml` / `.coderabbit.yaml` の変更もない。

## ステージ既定契約からの意図的な逸脱

本 Intent の scope は refactor（docs 系）であり、承認済み方針（business-logic-model.md「code-generation 向け実行方針」）に従って、ステージ既定契約から次のとおり意図的に逸脱した。

1. **workspace 向け実装コードを生成しない**（根拠: C-1、BR-4）。amadeus-developer-agent への workspace コード生成の委譲は適用していない。
2. **steering ファイル（team.md、project.md）を workspace の既存文書として直接編集する**（根拠: business-logic-model.md「code-generation 向け実行方針」2.）。前例は 260705-ledger-pr-docs の `docs/amadeus/lifecycle/state.md` 編集である。
3. **produces を 2 件から 3 件へ意図的に追加する**（根拠: ピア協議 Q2、業務ロジックモデル「code-generation 向け実行方針」3.）。ステージ既定の produces は `code-generation-plan.md` と `code-summary.md` の 2 件だが、本 Intent では `learnings-triage.md` を加えた 3 件を produces とする。追加分は成果物文書そのものであり、コードではない。

## エンジンのコード生成ガードに関する既知の摩擦（skip-with-reason 前例）

本ステージが生成する成果物は、すべて `aidlc/spaces/default/` 配下（steering 2 ファイルと record 1 点）に収まる。エンジンの `amadeus-state.ts` は、`workspace_requires` フラグを持つ code-generation ステージの完了時に、`aidlc/` workspace tree とハーネス dir の外側にある実ソースファイルの存在を要求する（`verifyStageArtifacts` の `workspace_requires` 検査）。本 Intent のように steering 文書だけを編集する docs 系 refactor は、この検査が要求する「aidlc/ の外側の変更」を持たないため、ステージ完了時にこの検査が失敗する可能性がある。

この摩擦は Issue #499（docs 系 refactor における code-generation の `workspace_requires` ガード衝突。build-and-test/memory.md の申し送りによれば本 Intent 系列で 2 例目）として既に Issue 管理側で追跡されている未解決事項であり、本 Intent の対応範囲外である（スコープ外節）。前例は次の 2 件である。

- `260705-codekb-refresh`: codekb 再解析スナップショットの全面更新を code-generation ステージの成果物として completion し、この摩擦を理由付きで受け入れた（`aidlc-state.md` の当該ステージ行に `[S]` 表記）。
- `260705-agmsg-trial-docs`: 同種の docs 系 refactor で `workspace_requires` ガードに衝突し、Issue #499 として起票した上でステージを完了させた。

本 Intent もこれらの前例に倣い、ガード衝突が発生した場合は理由（steering 編集のみで workspace 実ソース変更を伴わない docs 系 refactor である旨）を decision へ明記した上でステージを完了させる想定であり、ガード自体の修正（Issue #499 側）は行わない。

## 検証への影響

- linter・type-check の sensor は、本ステージでチェック対象となるソースコードが存在しないため、実行しても対象なしとなる。
- BR-9（H2 見出し 2 個以上）は `code-generation-plan.md`・本文書・`learnings-triage.md` のいずれも満たす。ただし code-generation ステージの frontmatter が import する sensor は linter・type-check だけであり、required-sections / upstream-coverage は本ステージの gate では自動検査されない（前例 260705-agmsg-trial-docs の code-summary.md と同じ扱い）。
- PR 作成前に対象 Intent の validator（`AmadeusValidator.ts`）と `npm run test:all` を実行し、結果を記録する（NFR-4、BR-12）。

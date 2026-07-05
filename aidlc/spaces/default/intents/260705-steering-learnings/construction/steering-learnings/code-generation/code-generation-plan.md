# Code Generation Plan — steering-learnings

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)

本 Intent の code-generation はコードを生成しない docs 系 refactor である（C-1、BR-4）。この文書は、steering 2 ファイルの編集と record 成果物 1 点の執筆を実際に行った実行チェックリストであり、コード生成計画ではない。

## 実行順序と対応 BR/FR

| 順序 | 作業 | 対象 | 対応 FR | 対応 BR |
|---|---|---|---|---|
| 1 | team.md 並行運用ポリシーへ新節「多体連携の運用」を追加する | `aidlc/spaces/default/memory/team.md`（並行運用ポリシー、「ゲート承認の運用」の直後・「同一 worktree での直列化」の前） | FR-1.1〜FR-1.5 | BR-1、BR-2、BR-11、BR-14 |
| 2 | 並行運用ポリシー末尾の「根拠」表へ実例行を追記する | 同上 | FR-1.6 | BR-2 |
| 3 | Git Branching Policy「### branch 名」節へロール名 prefix の段落と例ブロックを追記する | 同上（Git Branching Policy） | FR-2.1 | BR-13 |
| 4 | project.md Corrections へ HUMAN_TURN 中継 mint 前例と codekb 採用方式 stub 前例を追記する | `aidlc/spaces/default/memory/project.md` | FR-3.1、FR-4.3 | BR-6 |
| 5 | learnings-triage.md を執筆する（5 ステージ memory.md 全 26 エントリの採用・不採用と理由） | `construction/steering-learnings/code-generation/learnings-triage.md`（本 record dir） | FR-4.1、FR-4.2 | BR-7 |

実行順序の理由: steering 反映（1〜4）を先に確定させてから、その反映結果を根拠として triage 表（5）の判定理由（「採用（FR-1 新節へ反映）」等）を書けるようにするため。

## 節ごとの執筆ルール

### team.md 新節「多体連携の運用」

- 見出しレベルは `## 多体連携の運用`（H2）、小見出し 4 つを `###`（H3）でネストする（適用条件・エージェント固定 worktree・質問プロトコル・承認中継）。
- 定型文のテンプレート本体と実機確認の表は複製せず、正（Issue #497 転記コメント、multi-agent-trial-record.md）への参照で示す（BR-1、C-2）。
- 「並行させる単位」との reconcile 3 点（1 Intent = 1 worktree 維持／ロール固定は割り当て方の運用／他ロールは対象 Intent のファイルを変更しない）を「エージェント固定 worktree」小見出しに明文化する（BR-14）。

### 根拠表の追記

- 実例行の証跡に Issue #497、PR #500、#497 転記コメントを含める（FR-1.6）。

### Git Branching Policy branch 名

- ロール名 prefix（`leader/`、`eng1/`〜`eng3/`）を既存のエージェント実装軸（`codex/`、`claude/`）と並記し、多体連携時にロール軸を選ぶ選択基準を 1 文で書く（BR-13）。
- 実例は実際に使われた branch 名 `eng1/issue-497-trial`、`eng2/issue-502-steering` を使う（BR-13）。

### project.md Corrections

- learned 形式（`learned <日付>` + `<!-- cid:<stage>:<cN> -->`）を既存エントリと同じ書式で追記する（BR-6）。
- cid は出所 stage 内で連番衝突しない番号を選ぶ。HUMAN_TURN 前例は `cid:reverse-engineering:c1`（規律が最初に観察・記録された試行の reverse-engineering gate に対応。既存の reverse-engineering cid はなく衝突なし）とした。当初の `cid:approval-handoff:c1` は実在ステージ名の流用（出所不一致）、codekb stub 前例の `cid:build-and-test:c3` は C-6 / BR-3 違反（validator seam 差は Issue 管理側）のため、reviewer iteration 1 の指摘で前者は改名、後者は撤回した。

### learnings-triage.md

- 母集団（5 ステージ memory.md 全エントリ、26 件）を全件列挙し、判定 4 種と理由を付ける（BR-7）。
- 採用分は「採用（FR-1 新節へ反映）」「採用（Corrections 新規）」の判定に、実際に反映した先（team.md の節名、project.md の cid）を紐付ける（FR-4.3）。

## 意図的な produces 追加

ステージ既定の produces は `code-generation-plan.md` と `code-summary.md` の 2 件だが、本 Intent では `learnings-triage.md` を加えた 3 件を produces とする。根拠はピア協議 Q2（triage は Construction 成果物に置く）である（business-logic-model.md「code-generation 向け実行方針」3.）。

## 実行しないこと

- amadeus-developer-agent への workspace 向けコード生成の委譲（実装コード・テストコードの生成）は行わない（C-1、BR-4）。
- `codekb/amadeus/` の変更は行わない（BR-4）。
- 完了済み Intent record `260705-agmsg-trial-docs/` 配下の成果物は書き換えない（BR-5）。
- `.coderabbit.yml` / `.coderabbit.yaml` の変更は行わない。

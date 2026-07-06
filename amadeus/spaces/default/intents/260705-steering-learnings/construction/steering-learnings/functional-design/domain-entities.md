# Domain Entities — steering-learnings

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## エンティティ

| エンティティ | 説明 | 主な属性 |
|---|---|---|
| 判断基準 | steering（team.md / project.md）へ反映する単位。観察済みの実例に根拠を持つ | 内容、根拠となる実例、証跡（Issue、PR、record path） |
| 多体連携の運用節 | team.md 並行運用ポリシーへ追加する新節。判断基準 4 群を束ねる | 適用条件、エージェント固定 worktree、質問プロトコル、承認中継 |
| 根拠表の実例行 | 並行運用ポリシー「根拠」表へ追記する行。判断基準と実例・参照を対応付ける | 判断基準、実例、参照（Issue #497、PR #500、転記コメント） |
| learnings 候補 | 試行 record の 5 ステージ memory.md にあるエントリ | 出所 stage、見出し（Interpretations / Deviations / Tradeoffs / Open questions）、内容、時刻 |
| triage 判定 | learnings 候補 1 件への採用・不採用の判定 | 判定（採用 / 反映済み / Issue 管理側 / Intent 固有）、理由 |
| Corrections エントリ | project.md Corrections へ追記する learned 形式の行 | 内容、learned 日付、cid（cid:stage:cN、出所 stage 内で連番衝突なし） |
| ロール名 prefix | 多体連携時の branch 名の先頭要素。ロールと worktree に対応する | prefix（`leader/`、`eng1/`〜`eng3/`）、実例（`eng2/issue-502-steering`） |

## 関係

- ロール名 prefix は、Git Branching Policy の既存のエージェント実装軸 prefix（`codex/`、`claude/`）と並記され、多体連携時に選ばれる（BR-13）。

- 判断基準は、実例（試行 1 周の観察）なしには steering へ入らない（BR-2。並行運用ポリシーの原則の適用）。
- 多体連携の運用節は、正（Issue #497 転記コメント、multi-agent-trial-record.md）を要約して参照し、複製しない（BR-1）。
- learnings 候補は必ず 1 件の triage 判定を持ち、判定「採用」の候補だけが Corrections エントリまたは新節の判断基準になる（BR-7、FR-4.3）。
- triage 判定「Issue 管理側」の候補は steering に現れない（BR-3）。
- 前 Intent の引き継ぎ（FR-3.2）は、多体連携の運用節が前 Intent（PR #500）を参照することで解消される。完了済み record は変更されない（BR-5）。

## ライフサイクル

1. learnings 候補は functional-design で母集団が確定し、code-generation の triage で判定を得る。
2. 判定「採用」の候補は、code-generation で steering への反映（新節、Corrections エントリ）に変換される。
3. 反映結果は build-and-test（validator、`npm run test:all`）と gate の人間承認で検証され、PR merge をもって確定する。

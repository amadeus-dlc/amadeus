# Business Rules — steering-learnings

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## ルール

| ID | ルール | 出典 |
|---|---|---|
| BR-1 | 正（Issue #497 転記コメント、multi-agent-trial-record.md）は複製せず、判断基準として要約統合する。参照先は 2 つを区別して示す | C-2、ピア協議 Q3 |
| BR-2 | steering へ反映する判断基準は、試行 1 周で観察された実例に根拠がある範囲に限定する | C-5 |
| BR-3 | 未解決バグ系（Issue #498、#499、validator seam 差、完了済み Intent への hook 追記）は Issue 管理側で扱い、steering へ反映しない | C-6、ピア協議 Q4 |
| BR-4 | 実装コードとテストコードを変更しない（docs 系 refactor）。`codekb/amadeus/` も変更しない | C-1 |
| BR-5 | 完了済み Intent record（260705-agmsg-trial-docs）の成果物は書き換えない。引き継ぎの解消は steering 側からの参照で行う | ピア協議 Q3・engineer3 訂正合意 |
| BR-6 | project.md Corrections への追記は learned 形式（learned 日付 + cid コメント）とし、cid は出所 stage 内で連番が衝突しない番号を選ぶ | ピア協議 Q4、engineer3 補足 |
| BR-7 | learnings triage は母集団（5 ステージ memory.md 全エントリ）の全件に採用・不採用と理由を付ける | FR-4.1、FR-4.2 |
| BR-8 | 日本語で書き、japanese-tech-writing の規範に従う。機械可読ラベルは英語のまま使う | NFR-1 |
| BR-9 | 各成果物文書は H2 見出し 2 個以上を持つ（required-sections sensor） | NFR-2 |
| BR-10 | 事実は出典（Issue、PR、audit イベント、record path）を明示し、未確認の値は `未確認` と書く | NFR-3 |
| BR-11 | 新節「多体連携の運用」は並行運用ポリシーの既存構造（節単位 + 根拠表）に従い、既存の適用範囲注記（1 人の人間 + 複数エージェント）と両立させる | FR-1.5、ピア協議 Q1 |
| BR-12 | PR 作成前に validator と `npm run test:all` を実行し、結果を記録する | NFR-4 |
| BR-13 | ロール名 prefix（`leader/`、`eng1/`〜`eng3/`）は「### branch 名」節へ、既存のエージェント実装軸（`codex/`、`claude/`）との並記として追記する。実例は実際に使われた branch 名（`eng1/issue-497-trial`、`eng2/issue-502-steering`）を使う | FR-2.1 |
| BR-14 | 新節「エージェント固定 worktree」は、既存原則「worktree を Intent ごとに分ける」との関係（変更作業は 1 Intent = 1 worktree に閉じる、ロール固定は割り当て方の運用、他ロールは対象 Intent のファイルを変更しない）を明文化する | FR-1.2、C-5 |

## 検証の分担

- BR-4 / BR-5 は diff レビューと `npm run test:all` で担保する。
- BR-1 / BR-2 / BR-3 / BR-11 / BR-13 / BR-14 は reviewer（amadeus-architecture-reviewer-agent）と gate の人間承認で担保する。
- BR-6 / BR-7 / BR-8 / BR-10 は reviewer と PR レビューで担保する。
- BR-9 は required-sections sensor が gate 時に検査する（sensor を import しないステージでは reviewer が代替する）。
- BR-12 は build-and-test ステージと PR 説明の記録で担保する。

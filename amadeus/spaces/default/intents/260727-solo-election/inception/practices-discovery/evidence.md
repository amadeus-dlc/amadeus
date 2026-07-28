# Evidence — solo-election(practices 差分評価の証跡)

上流入力(consumes 全数): code-structure.md、technology-stack.md、dependencies.md、code-quality-assessment.md、architecture.md、business-overview.md。

## 証跡一覧

| 主張 | 証跡 | 出典 |
|---|---|---|
| 選挙 canonical は 5ファイル 2115 行、投影は CLI 13 面 / SKILL 7 面 | RE 実測(wc -l / find) | code-structure.md・component-inventory.md 現在節、re-scans/260727-solo-election.md |
| 区間の選挙変更は3コミットのみ・新規依存ゼロ | git log 実測 | dependencies.md(不変判断)、re-scans/260727-solo-election.md |
| テスト実践は 4層 runner+機械ガード(t242 の SKILL 語彙固定等)で現行 Testing Posture どおり | t234/t236/t239/t240/t241/t242 の実在と責務 | code-quality-assessment.md、re-scans/260727-solo-election.md |
| 新実践の発見なし(変更なし結論) | 上記3行の全てが affirmed 済み規範の範囲内 | team-practices.md |

## 検証方法

各証跡は同日 RE の re-scans/260727-solo-election.md の実測(コマンド出力転記)に遡れる。practices の変更なし判定は team-practices.md の差分評価と1:1 対応。

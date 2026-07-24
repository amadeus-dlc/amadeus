# §13 学習候補(reverse-engineering, 260724-watcher-timeout-fix)

## 提案: 0件

## 検討した候補と不採用理由

- 「対称実装(agmsg spawn.sh 単発待ち vs team-up.sh 独自の再送×3ループ)による worst-case 増幅」というパターンは、既存 cid:requirements-analysis:symmetric-pair-review(対操作の対称性を設計・レビュー観点にする)で既にカバーされている。新規 cid を起こすほどの未カバー領域ではないと判断した。
- 「性能問題の根本原因が実装逸脱でなく設計時の受容リスク先送りだった」という切り分けは、既存 cid:requirements-analysis:implementation-deviation-election(実装逸脱の選挙裁定)・cid:requirements-analysis:always-elect(判断は選挙)で手続き自体は既にカバーされている。今回は「先送りされた緩和策(--no-wait)がFR-3 [e4]留保として記録されていたおかげで、次段の設計判断が迅速に絞り込めた」という良い実践例ではあるが、新規ノルムとして定式化するには実例1件のみで根拠が薄い。

## 実測根拠

- Developer scan(agentId ac47377fcc740d77c)・Architect synthesis(agentId adc9ca461354362d8)による file:line 引用12点の独立再照合、全件一致・反証ゼロ。
- 元intent #1384(`260722-teamup-prompt-race`)の requirements.md FR-3/FR-4/FR-5 との整合確認済み。

# Learnings Triage — steering-learnings

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)（「learnings triage の手順」節）、[business-rules.md](../functional-design/business-rules.md)（BR-2、BR-3、BR-7）

## 概要・母集団と基準

母集団は、Intent `260705-agmsg-trial-docs`（Issue #497 試行 1 周）の Construction 成果物 record にある 5 ステージ memory.md の全エントリである（FR-4.1）。

- `inception/reverse-engineering/memory.md`
- `inception/requirements-analysis/memory.md`
- `construction/functional-design/memory.md`
- `construction/code-generation/memory.md`
- `construction/build-and-test/memory.md`

エントリ総数は **26 件**である（Interpretations、Deviations、Tradeoffs、Open questions の全見出しを対象とし、テンプレート例のコメント行は数えない）。内訳は reverse-engineering 9 件、requirements-analysis 5 件、functional-design 5 件、code-generation 3 件、build-and-test 4 件である。

判定は次の 4 種類のいずれかを用いる（business-logic-model.md「learnings triage の手順」2.）。

| 判定 | 意味 |
|---|---|
| 採用（FR-1 新節へ反映） | team.md 並行運用ポリシー新節「多体連携の運用」の判断基準として一般化し反映済み |
| 採用（FR-3 Corrections へ反映） / 採用（Corrections 新規） | project.md Corrections へ learned 形式で反映済み |
| 不採用（反映済み・重複） | FR-1〜FR-3 の反映内容、または既存 steering（Corrections、Testing Posture）とすでに重複する |
| 不採用（Issue 管理側） | 未解決バグ系として Issue 化済み、または Issue 管理側の対象である（C-6） |
| 不採用（Intent 固有） | その Intent の実行文脈だけで意味を持ち、判断基準として一般化できない |

不採用（Intent 固有）の各行には、一般化できないと判断した個別の理由を記す（BR-2、BR-7）。

## 一覧

### reverse-engineering/memory.md（9 件）

| # | 出所（見出し・時刻） | 内容の要約 | 判定 | 理由 |
|---|---|---|---|---|
| 1 | Interpretations 2026-07-05T14:30:00Z | 本 Intent（agmsg-trial-docs）は #497 の試行運用規約に基づく 4 体連携の試行 1 周として実行し、ディスパッチ定型文（agmsg 経由、2026-07-05 23:18 JST）を Intent 承認の証拠とする | 不採用（Intent 固有） | 試行 Intent 自身の実行根拠の記録であり、他 Intent へ一般化できる判断基準ではない |
| 2 | Deviations 2026-07-05T14:30:00Z | audit shard に混入した probe（DECISION_RECORDED test 1 件）を、audit 書き換え禁止（org.md）のため削除せず正誤注記として残した | 不採用（Intent 固有） | 個別 Intent の audit への probe 混入に対する正誤注記であり、一般化できる運用ルールではない |
| 3 | Deviations 2026-07-05T14:40:00Z | subagent scan を実行せず、既存 codekb/amadeus/（PR #496 更新済み）の鮮度検証（git diff）で代替し、codekb/engineer1/ も生成しない（ピア協議 Q1 の engineer3 案） | 不採用（Intent 固有） | 再スキャン省略の可否は対象 commit 間の git diff 範囲という個別条件に基づく判断であり、一般化基準ではない |
| 4 | Deviations 2026-07-05T14:40:00Z | §13 learnings の persist は実行しない方針。人間が同席せず承認系は leader 経由の人間中継に限るため（#497 確定判断 6）。surface 候補は gate 報告に含めて leader へ送る | 採用（FR-1 新節へ反映） | 「承認中継」節の「人間が同席しないセッションでは §13 persist を実行せず、surface 候補を gate 報告に含めて leader へ送る」に反映した。承認系はleader経由の人間中継に限るという理由づけは project.md の HUMAN_TURN mint 前例（cid:reverse-engineering:c1）の背景にもなっている |
| 5 | Tradeoffs 2026-07-05T14:38:00Z | Q1（codekb-path 対立）で engineer2 案と engineer3 案が対立し、produces 検査の実装を実コードで裏取りして engineer3 案を採用した | 採用（FR-1 新節へ反映） | 「質問プロトコル」の運用細目「ピア回答も鵜呑みにせず、実コードや証跡で事実確認する」に反映した。codekb-path 自体の不具合は Issue #498 として別途 Issue 管理側で扱う（本行は採用判断の方法論だけを一般化する） |
| 6 | Tradeoffs 2026-07-05T14:38:00Z | Q2（ideation/decisions.md 新設案 vs state-init 帰属案）で、refactor scope の直近前例（260705-codekb-refresh、260705-space-inventory）に一致する engineer2 案を採用した | 不採用（Intent 固有） | refactor scope で intent-capture が SKIP される場合の承認 4 項目の転記先という個別ステージの運用選択であり、一般化した判断基準として明文化されていない |
| 7 | Open questions 2026-07-05T14:32:00Z | ピア協議 Q1（codekb-path）: leader + engineer2, 3 へ送信、期限 15 分・回答 1 件で成立 → engineer3 案採用（解決記録） | 不採用（反映済み・重複） | Tradeoffs 2026-07-05T14:38:00Z の同一協議の解決記録であり重複する |
| 8 | Open questions 2026-07-05T14:32:00Z | ピア協議 Q2（承認 4 項目の転記先）: leader + engineer2, 3 へ送信、期限 15 分・回答 1 件で成立 → engineer2 案採用（解決記録） | 不採用（反映済み・重複） | Tradeoffs 2026-07-05T14:38:00Z の同一協議の解決記録であり重複する |
| 9 | Open questions 2026-07-05T14:40:00Z | 後続 Issue 候補: codekbRepoName の basename フォールバックにより worktree ディレクトリ名（engineer1 等）が repo キーとして codekb path に漏れる → leader が Issue #498 として起票済み | 不採用（Issue 管理側） | 未解決バグとして Issue #498 に一本化済みであり、steering へは反映しない（C-6） |

### requirements-analysis/memory.md（5 件）

| # | 出所（見出し・時刻） | 内容の要約 | 判定 | 理由 |
|---|---|---|---|---|
| 10 | Interpretations 2026-07-05T14:50:00Z | 本ステージの clarifying questions（成果物の記録先、定型文の粒度、実機確認記録の範囲）は「技術的な内容確認」に分類し、承認系ではないためピア協議で回答を得る | 採用（FR-1 新節へ反映） | 「質問プロトコル」の分類基準（技術的な内容確認 = ピア協議可、承認系は人間エスカレーション）そのものである |
| 11 | Deviations 2026-07-05T14:50:00Z | 人間不在のため質問モード選択（Guide me / Grill me / 編集 / Chat）は提示せず、質問ファイルは作成し回答欄にピア協議の成立結果を記入する | 不採用（Intent 固有） | 質問ファイルへの記入方式という本ステージ実行時の手続き上の工夫であり、多体連携の判断基準として一般化されていない |
| 12 | Deviations 2026-07-05T15:05:00Z | upstream-coverage sensor が brownfield codekb 3 成果物の未参照で SENSOR_FAILED を計 4 回記録したが、本 Intent の要求対象がコードベース構造に依存しないため許容と判断した | 不採用（Intent 固有） | 本 Intent の要求内容（agmsg 運用プロトコルの文書化）に基づく個別の sensor 許容判断であり、一般化基準ではない |
| 13 | Tradeoffs 2026-07-05T14:55:00Z | Q1（成果物の記録先）の回答が 3 者で分裂し leader 案を採用した。回答 1 件成立後に到着した後続回答も期限内であれば採用判断の材料に含める運用にした（先着 1 件で即確定しない） | 採用（FR-1 新節へ反映） | 「質問プロトコル」の運用細目「回答 1 件が先着しても即確定とせず、期限内に届いた後続回答も採用判断の材料に含める」に反映した |
| 14 | Open questions 2026-07-05T14:55:00Z | 成果物文書の分割単位（1 文書 3 節か分冊か）は functional-design で決めると申し送った（requirements.md O-1） | 不採用（Intent 固有） | 本 Intent 内の未決事項を後続ステージへ引き継ぐ実行メモであり、他 Intent への一般化対象ではない |

### functional-design/memory.md（5 件）

| # | 出所（見出し・時刻） | 内容の要約 | 判定 | 理由 |
|---|---|---|---|---|
| 15 | Interpretations 2026-07-05T15:20:00Z | units-generation が refactor scope で SKIP のため unit 名を Intent label（agmsg-trial-docs）とし、aidlc-state.md の Per unit: [TBD] を実 unit 名へ手動更新する（前例 e10f8294） | 不採用（反映済み・重複） | project.md 既存 Corrections（cid:build-and-test:c2）と同一内容であり重複する |
| 16 | Interpretations 2026-07-05T15:20:00Z | requirements.md O-1（成果物文書の分割単位）を 1 文書 3 節構成に確定。ピア協議にはかけず、小さな構造判断は担当 engineer の自己判断で進め、gate の人間承認で確定するという運用に従った | 採用（FR-1 新節へ反映） | 「質問プロトコル」の運用細目「分割単位や questions ファイルの省略可否のような小さな構造判断は、ピア協議にかけず担当 engineer の自己判断で進め、gate の人間承認で確定する」に反映した。1 文書 3 節構成そのものは本 Intent 固有の設計選択であり、一般化したのは判断の閾値だけである |
| 17 | Deviations 2026-07-05T15:20:00Z | functional-design-questions.md を作成しない。要求とピア協議 4 問の確定回答で設計判断が尽きており、前例（260705-ledger-pr-docs）も questions ファイルなしで成立している | 不採用（Intent 固有） | 本ステージの成果物省略判断であり、他 Intent の一般化基準ではない（判断根拠は本 Intent 実行文脈のみで成立する） |
| 18 | Open questions 2026-07-05T15:35:00Z | memory.md の置き場がエンジン directive の memory_path（ステージ階層）であり、成果物の per-unit 階層と 1 階層ずれるが、エンジン解決のまま受け入れる（単一 unit の refactor Intent では実害なし） | 不採用（Intent 固有） | エンジンの path 解決を単一 unit の refactor Intent という条件下で個別に受け入れた判断であり、一般化基準ではない |
| 19 | Open questions 2026-07-05T15:35:00Z | ステージ frontmatter の required 入力 4 件（unit-of-work 等）が refactor scope の SKIP により不在（consumes_absent expected: true）。upstream-coverage sensor の SENSOR_FAILED は想定内として扱う | 不採用（Intent 固有） | refactor scope の SKIP に伴う個別ステージの sensor 許容判断であり、一般化基準ではない |

### code-generation/memory.md（3 件）

| # | 出所（見出し・時刻） | 内容の要約 | 判定 | 理由 |
|---|---|---|---|---|
| 20 | Interpretations 2026-07-05T15:10:00Z | 節 3（agmsg 実機確認結果）の観測事実は engineer1 セッションの実測を情報源とし、subagent へはプロンプトで事実一覧を引き渡す（subagent は会話履歴を見られないため） | 不採用（Intent 固有） | 本ステージの subagent 運用手続きであり、一般化された判断基準ではない |
| 21 | Deviations 2026-07-05T15:10:00Z | functional-design の「code-generation 向け実行方針」に従い、コードを生成せず multi-agent-trial-record.md を record dir へ直接執筆し、produces 既定 2 件に 1 件を追加した | 不採用（Intent 固有） | 特定 Intent の gate 承認済み設計への準拠記録であり、本 Intent（260705-steering-learnings）自身の「code-generation 向け実行方針」にすでに個別に引き継がれている |
| 22 | Deviations 2026-07-05T15:50:00Z | business-rules.md「検証の分担」に code-generation 不適用の記載（BR-8 が required-sections sensor 前提）があるが、承認済み成果物のため本体は修正せず code-summary.md 側で不適用を明記し申し送った | 不採用（Intent 固有） | 特定 Intent の承認済み文書内の記載不整合に対する個別の申し送りであり、Issue 管理側の未解決バグ（#498、#499、validator seam 差）にも steering 判断基準にも該当しない |

### build-and-test/memory.md（4 件）

| # | 出所（見出し・時刻） | 内容の要約 | 判定 | 理由 |
|---|---|---|---|---|
| 23 | Interpretations 2026-07-05T15:25:00Z | Testing Posture 規約に従い、Minimal 戦略でも produces 7 件を全件生成した。不適用のテスト instruction は空ファイルにせず適用判断と根拠を記す文書にした | 不採用（反映済み・重複） | project.md 既存 Testing Posture（cid:build-and-test:c1）と同一内容であり重複する |
| 24 | Deviations 2026-07-05T15:30:00Z | §13 learnings surface ツールが「stage not found in runtime-graph.json」で実行できず、persist は人間不在方針により既定でスキップした。候補は gate 報告に含めて leader へ送る | 採用（FR-1 新節へ反映） | 「承認中継」節の §13 persist スキップ + surface 候補の gate 報告への同梱に反映した（reverse-engineering の #4 と同種の運用がステージを跨いで再現している） |
| 25 | Deviations 2026-07-05T15:25:00Z | validator 初回 fail（reverse-engineering の record 内 produces 不在 9 件）を、前例 260705-codekb-refresh と同じ参照台帳 stub（正本 codekb/amadeus/ への参照 + 採用根拠）の追加で解消した。codekb 採用方式を取る Intent で毎回発生する seam 差である | 不採用（Issue 管理側） | validator seam 差は C-6 / BR-3 が Issue 管理側と明記する未解決事象であり、steering へ反映しない（#26 と同一判定に揃える。reviewer iteration 1 指摘 1 により、当初の Corrections 反映を撤回した）。stub の運用前例は試行 record（build-and-test/memory.md）と 260705-codekb-refresh に記録済みであり、seam 差の解消は後続 Issue（leader 起案予定）で扱う |
| 26 | Open questions 2026-07-05T15:25:00Z | docs 系 refactor の code-generation workspace_requires ガード衝突（本 Intent で 2 例目）を Issue #499 として起票。codekb 採用時の validator seam 差は 3 件目の候補として Intent 完了報告で申し送った | 不採用（Issue 管理側） | 未解決バグとして Issue #499（および #498 系の validator seam 差）に一本化済みであり、steering へは反映しない（C-6） |

## 採用サマリ

| 判定 | 件数 | 反映先 |
|---|---|---|
| 採用（FR-1 新節へ反映） | 6 | team.md 並行運用ポリシー新節「多体連携の運用」（#4、#5、#10、#13、#16、#24） |
| 採用（Corrections 新規） | 0 | なし（当初 #25 を反映したが、C-6 / BR-3 違反のため撤回した） |
| 不採用（反映済み・重複） | 4 | 既存 steering と重複（#7、#8、#15、#23） |
| 不採用（Issue 管理側） | 3 | Issue #498、#499、validator seam 差（#9、#25、#26） |
| 不採用（Intent 固有） | 13 | 一般化不可（#1、#2、#3、#6、#11、#12、#14、#17、#18、#19、#20、#21、#22） |
| 合計 | 26 | — |

なお、project.md Corrections の HUMAN_TURN 中継 mint 前例（cid:reverse-engineering:c1）は、requirements.md FR-3.1・C-4 と multi-agent-trial-record.md §2.2（中継承認定型文の必須項目）を直接の根拠として追記したものである。cid の stage ラベルは、この規律が最初に観察・記録された試行の reverse-engineering gate（#4 の出所 stage。既存の reverse-engineering cid はなく連番衝突なし）に合わせた。FR-3 による母集団外からの直接反映であるため、本採用サマリの件数には含めない。

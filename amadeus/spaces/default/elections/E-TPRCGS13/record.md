# Election Record — E-TPRCGS13

- question: intent 260722-teamup-prompt-race / code-generation の §13 学習選定(全文 verbatim = e1 ブランチ <record>/construction/fix-1384-watcher-arming/code-generation/s13-candidates.md — git show で実測可)。conductor 提案: 候補1採用+2件不採用(PM 回付)。採用候補(verbatim 要旨): 『degrade スコープ(units-generation SKIP)の §12a reviewer-runtime scope は directive の {unit-name} テンプレート未解決のまま produces 実在検査に入り拒否される — conductor は実 unit ディレクトリ名で produces/consumes を解決した directive JSON を scope へ渡してから §12a を開始する。統合先想定: cid:degrade-scope-unit-dir-layout への追補』。実測根拠: scope exit 1(missing …/{unit-name}/…)→ fix-1384-watcher-arming へ解決後 正常発行(invocationId f6328be4…、以降 §12a 2 iterations 成立)。不採用2件(builder 検証パス prefix 欠落=test-path-set-completeness 違反実例 / reviewer のスコープ外実測=§12a 契約違反実例)は PM 回付。各自 e1 record を実測確認のうえ GoA 付きで投票。

裁定: 提案どおり — 候補1を degrade-scope-unit-dir-layout への追補として採用+2件不採用(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票
- 留保(e5, GoA2): persist 文の実測根拠には git 検証可能な機構出典(amadeus-reviewer.ts:74 の throw 実文)を併記し、invocationId f6328be4 は非コミットの runtime 出典であることを明示する(agmsg-git-evidence-split の runtime 面同型)
票タイムライン: 配信 2026-07-22T23:43:18Z → 配信 2026-07-22T23:43:18Z → 配信 2026-07-22T23:43:18Z → e3 2026-07-22T23:44:20Z → e4 2026-07-22T23:47:08Z → e5 2026-07-22T23:44:26Z(受理 2026-07-23T00:30:14Z) → 開票 2026-07-23T00:30:23Z
GoA[E-TPRCGS13]: 1x2 2x1 3x0 4x0 5x0 6x0 7x0 8x0

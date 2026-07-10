# Requirements Analysis — 明確化質問(integrity-batch)

> 上流コンテキスト: codekb の business-overview.md / architecture.md / code-structure.md(reverse-engineering 差分リフレッシュ、observed 162553b99)を参照して起草した。
> 既決照合(team.md ノルム cid:requirements-analysis:no-election-for-decided-norms)を先に実施した。
> 本 intent の主要判断は、Issue クロスレビュー(2名実コード照合済み)・選挙(A5/A6)・leader ディスパッチ(2026-07-09 12:10Z、ユーザー承認済み運用)で既決であり、
> 選挙にかけるべき真に未決の設計判断は検出されなかった。各質問には既決回答と provenance を記録する。

## Q1. #708(HUMAN_TURN 偽陽性)の緩和方式

mint-presence が機械注入 user-role メッセージで HUMAN_TURN を mint する問題への対処方式は?

A. stdin 読取化 + ペイロードの source 判別で機械注入をスキップ(判別材料の実在は実機キャプチャで確認)
B. mint-presence を廃止し delegate provenance のみに一本化
C. 現状維持(運用でカバー)
X. Other (please specify)

[Answer]: A — 既決。provenance: Issue #708 本文の緩和候補(a)本線 + クロスレビュー 1/2(claude-engineer-2、実装は stdin 読取化が前提であることを file:line で特定)+ leader ディスパッチ「緩和は stdin 読取化前提の source 判別が本線」。実機ペイロードに判別材料が無い場合のフォールバックは Issue 緩和候補(b): harness 制約として明文化し、gate は delegate provenance(#671)を正道、「ローカル HUMAN_TURN 単独」を信頼しない運用に倒す(条件付き受け入れ基準として requirements.md に固定)。

## Q2. #707(codekb 並行リフレッシュ衝突)の修正方向

A. 構造分割(focus 別追記構造)
B. 楽観ロック運用(リフレッシュのシリアライズ規約)
C. per-intent/追記型 timestamp + 本文 last-writer-wins 明文化(+ B の軽量要素: リフレッシュ前に最新 codekb 取込)
X. Other (please specify)

[Answer]: C(+B軽量) — 既決。provenance: #707 クロスレビュー 2/2(claude-engineer-2: timestamp は差分リフレッシュの base 点=正しさを運ぶ状態、本文は再導出可能な派生キャッシュ)+ 1/2(codex-engineer-3: 実在確認・却下なし)+ leader ディスパッチ「レビュー推奨は C 主軸 + B 軽量」。

## Q3. #705(sdk-drive calibration)の修正範囲

A. calibration テストをランナー管理下に入れる + doctor 期待値 drift を現行出力に同期する(両方)
B. doctor drift のみ修正
C. ランナー管理化のみ
X. Other (please specify)

[Answer]: A — 既決。provenance: 選挙 A6=A(#698 クローズ・D を独立 Issue 化=#705 の成立経緯そのもの。D の定義が「sdk-drive calibration の runner 管理外 + doctor 期待値 drift」の2点セット)+ leader ディスパッチの対象記述。calibration の配置先(levelFiles への追加 or 移設)は実装詳細として functional-design/code-generation に委ねる。

## Q4. #706(knowledge 参照解決不能)の修正方式

A. 参照を明示パス化: `{{HARNESS_DIR}}/knowledge/amadeus-product-agent/product-guide.md`(Option 1、プレースホルダ形式は agent 定義の慣行に整合)
B. product-guide の内容を delivery-agent 側へ複製
C. 参照自体を削除
D. delivery-planning stage の support_agents に product agent を追加
X. Other (please specify)

[Answer]: A — 既決。provenance: Issue #706 の推奨 Option 1 + クロスレビュー 1/2(claude-engineer-2: {{HARNESS_DIR}} 形式を支持、D 案は排他でない代替として付記)+ 2人目レビュー完了 + leader ディスパッチ「あなたの Option 1 {{HARNESS_DIR}} 支持コメントあり」。D 案は採らない(バグ修正の最小差分は参照修正であり、support 追加はステージ挙動の変更を伴うため)。

## Q5. Bolt 分割と実行順

A. 4バグ独立 4 Bolt、可能な限り並列(#708 のみ claude-3 との調整対象だが mint-presence.ts は本 intent 専有につき並列可)
B. P1 を先行させる直列
X. Other (please specify)

[Answer]: A — 既決。provenance: team.md parallel-bolts ノルム(user decision)+ leader ディスパッチ「4 Bolt 独立なら並列」+ claude-3 との編集順合意(2026-07-09 12:15-12:18Z agmsg: #708 は integrity-batch 先行、mint-presence.ts 専有、state/lib は最小変更)。bugfix スコープのため walking-skeleton セレモニーはスキップ(org.md)。

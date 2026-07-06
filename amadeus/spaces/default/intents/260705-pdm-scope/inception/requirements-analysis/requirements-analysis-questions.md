# Requirements Analysis 質問（260705-pdm-scope）

対象 Issue: [#429](https://github.com/amadeus-dlc/amadeus/issues/429)

Maintainer の包括委任（sub 割り当て、agmsg 2026-07-05T09:58:52Z）に基づき、推奨案で自己回答する。

---

## Q1. scope 名は？（Issue 未確定事項 1）

A. `pdm`（Issue 推奨 1 の仮名をそのまま採用。keywords: pdm, prd, product-discovery）
B. `discovery` / `product`
X. Other (please specify)

[Answer]: A（Issue 推奨 1 が pdm（仮）と明示。discovery は reverse-engineering の語感と、product は product.md（memory）と衝突しやすい）

## Q2. EXECUTE ステージの集合は？（Issue 未確定事項 2）

A. Initialization 3 + Ideation 6（intent-capture、market-research、feasibility、scope-definition、rough-mockups、approval-handoff。team-formation は SKIP）+ Inception 3（requirements-analysis、user-stories、refined-mockups）の計 12。Construction / Operation は全 SKIP
B. Ideation のみ（終点 = approval-handoff）
X. Other (please specify)

[Answer]: A（Issue 推奨 1 の「Ideation 全体 + Inception の要求系」。PRD 一式 = intent-statement + competitive-analysis + build-vs-buy + scope-document + initiative-brief + requirements + stories + personas + wireframes が揃う。個別判断: mockups 2 種は EXECUTE のまま残す — UI 構想を伴わない企画は各 stage 定義の condition（CONDITIONAL 実行）で実行時にスキップでき、grid で恒久 SKIP にすると UI 企画で使えなくなる。feasibility / market-research は PdM の中核成果物のため EXECUTE。team-formation / units-generation / delivery-planning は実装チーム編成と実行計画であり実装しない Intent には不要のため SKIP。practices-discovery / reverse-engineering は engineering 調査のため SKIP（reverse-engineering は infra が SKIP する前例に整合。practices-discovery は infra では EXECUTE だが、engineering practices の発見は実装しない Intent に不要という pdm 固有の判断。reviewer Minor 指摘で前例引用を正確化）。application-design は実装設計のため SKIP）

## Q3. depth と testStrategy は？

A. depth: Standard、testStrategy は grid に持たない（既存 grid エントリは stages のみで、depth は scope ファイルの frontmatter が持つ。infra と同形）
B. 新しいメタデータを追加する
X. Other (please specify)

[Answer]: A（既存 9 scope の構造をそのまま踏襲する。Issue AC の「depth、testStrategy、keyword が定義されている」は、depth = scope frontmatter、testStrategy = 該当なし（Construction を持たないため build-and-test が SKIP で、テスト戦略の適用ステージが存在しない事実を scope 文書に明記）、keyword = frontmatter keywords で満たす）

## Q4. 終点の統合成果物は？（Issue 未確定事項）

A. 統合点は approval-handoff の initiative-brief（Ideation の統合）とし、PRD 一式の終点は refined-mockups 完了時の record 全体とする。amadeus-outcomes-pack の流用案内は本 Intent では行わない
B. amadeus-outcomes-pack の利用を scope 文書で案内する
X. Other (please specify)

[Answer]: A（既存 produces で PRD 一式が揃うことが Issue の確定判断であり、追加の統合成果物は新ステージ相当の作り込みに近づく。outcomes-pack の適否は pdm scope の実利用実績を見てから判断する = 未観察の失敗を先回りしない。reviewer Moderate 指摘への回答）

## Q5. 横断共有の product-design 情報の置き場（#300 由来）は？

A. 本 Intent では扱わない。既存の置き場（space の knowledge/ と memory/）が現行契約であり、pdm scope はそれを変えない。#300 系の置き場設計が必要になったら別 Issue として起票する
X. Other (please specify)

[Answer]: A（scope 追加と情報アーキテクチャの変更は独立した判断で、混ぜると本 Intent の検証範囲が膨らむ。reviewer Moderate 指摘への回答 = 「放置」ではなく「別 Issue 化の判断」を記録する）

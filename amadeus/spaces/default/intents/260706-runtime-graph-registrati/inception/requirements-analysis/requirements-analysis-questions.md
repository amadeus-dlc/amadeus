# Requirements Analysis 質問（260706-runtime-graph-registrati）

対象 Issue: [#558](https://github.com/amadeus-dlc/amadeus/issues/558)

回答は Issue の確定記載、leader ディスパッチ（2026-07-06 15:47 JST）、および reverse-engineering での根本原因実測（本 record の diary）からの出典付き転記である。新規の人間質問はない。

現行構造の前提は上流入力の [codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md)、[codekb/amadeus/code-structure.md](../../../../codekb/amadeus/code-structure.md)、[codekb/amadeus/api-documentation.md](../../../../codekb/amadeus/api-documentation.md) に依る。

---

## Q1. 修正の主経路は？

A. hook の command filter regex 拡張（`.agents/amadeus/tools/` 追加）+ surface の自動 compile 自己修復の二段構え
B. hook regex 拡張のみ
C. surface 自己修復のみ
X. Other (please specify)

[Answer]: A（Issue 実施候補「自動 compile または復旧手順つき明示エラー」の両立。hook 修正は harness 経由の主経路を直し、surface 自己修復は harness 非依存の safety net になる。根本原因は RE 実測で regex 素通しと特定済み）

## Q2. 自動 compile の実装位置は？

A. `amadeus-learnings.ts surface` 内で slug 不在時に compile を spawn して再解決（決定論的、engine-e2e で検証可能）
B. 呼び出し側（skill prose）に手動 compile 手順を書く
X. Other (please specify)

[Answer]: A（B は prose 再導出でエンジン駆動原則に反し、無言 fail も解消しない）

## Q3. eval の置き場は？

A. hook eval = hooks-state-bugfix（hooks 挙動の既存 eval）へ追加、surface ケース = engine-e2e へ追加
B. 新規 eval を新設
X. Other (please specify)

[Answer]: A（既存 eval の検査軸と一致。#559 と同じ配置判断の踏襲）

## Q4. 復旧手順つきエラーの文言は？

A. 自動 compile 後も不在の場合に「`bun .agents/amadeus/tools/amadeus-runtime.ts compile` を実行して回復し、それでも不在なら stage slug と Current Stage の一致を確認する」旨を明示
X. Other (please specify)

[Answer]: A（Issue 受け入れ条件「無言 fail ではなく復旧手順つきエラー」の転記）

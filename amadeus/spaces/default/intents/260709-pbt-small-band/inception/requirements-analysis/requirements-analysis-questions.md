# Requirements Analysis — 明確化質問(pbt-small-band)

> 上流コンテキスト: codekb の business-overview.md / architecture.md / code-structure.md(re-scans/260709-pbt-small-band.md、observed 9a2f5c72)を参照して起草。
> 既決照合を先に実施: #697 本文+codex-3 補正+engineer-1 レビュー、#688 全員レビュー6件、leader ディスパッチ(2026-07-09 14:13Z)が主要判断をカバーする。真に未決は Q5 のみ→ leader 選挙は不要と判断(実装詳細の範疇、根拠を回答に記載)。

## Q1. fast-check の依存追加の位置と形式

A. ルート package.json の devDependencies(テストは tests/ 配下・bun test 実行のため)
B. packages/setup の devDependencies
C. 依存追加せず自作生成器
X. Other (please specify)

[Answer]: A — 既決。provenance: #688 全員レビュー(ツール選定 fast-check 一択・TS/Bun 親和)+ leader ディスパッチ「依存追加の是非・置き場所(devDependencies)は requirements で固定」+ 実測(テストランナーはルート bun test、packages/setup のテストも tests/ 配下)。**出荷フレームワークへのランタイム依存は追加しない**(project.md Forbidden の Bun-only 前提に抵触しないことが条件 — devDependency のみ)。

## Q2. PBT の分類・CI 接続

A. Developer Testing として unit(Small)スイート常駐: PR CI は固定シード+低 numRuns。深掘り(高 numRuns・シードローテーション)は --release 層。失敗時はシードと反例を必ずログ出力し、shrink 済み反例は example-based テストとしてピン留めコミット
B. QA Testing として夜間 CI 専用
X. Other (please specify)

[Answer]: A — 既決。provenance: #688 全員レビュー6件の一致点(両属=実行モードで層別、PR CI は Developer Testing / 深掘りは QA モード、flaky 化防止のシード規律、反例ピン留め)。

## Q3. 適用対象と優先順位

A. #697 の優先対象どおり: (1) semver(parse 律+比較律、全順序は stable に閉じる) (2) version-spec (3) manifest(roundtrip+重複 path 不変条件) (4) plan.ts 純判定 seam 抽出(classify/classifyAction/toPlanAction)+ Small テスト (5) audit-escape(CR/LF 不変条件、t111 の example を一般化)
B. semver のみ(最小)
X. Other (please specify)

[Answer]: A — 既決。provenance: #697 本文(codex-3 実コード照合済み・engineer-1 実在確認)+ RE 合成の補正((a) prerelease 非全順序 (b) plan seam 全 private (c) audit-escape はコア波及大 → Bolt 分割で吸収)。

## Q4. Small≥90 の扱い

A. milestone(方向目標)であり、個別 PR の hard gate にしない
X. Other (please specify)

[Answer]: A — 既決。provenance: #697 本文の明記。

## Q5. plan.ts 純判定 seam の公開方式(唯一の実装判断)

A. モジュールレベルの named export(純関数をそのまま export。ドメイン型のカプセル化は破らない — 対象はモジュール private な判定関数であり、functional-domain-modeling-ts の type+コンパニオン構造に変更なし)
B. コンパニオン namespace に載せる(公開 API 面の拡大)
C. breachEncapsulationOf 系命名で test-only export
X. Other (please specify)

[Answer]: A — 本 intent の conductor 判断(選挙不要と整理: project.md 既決のモデリングスタイル内の実装詳細で、複数案が「成立する」というより A が既存スタイルの自然な帰結。B は公開 API 契約の拡大で refactor スコープを逸脱、C はオブジェクトのカプセル化破りではないため命名規約の適用対象外)。reviewer と functional 実装時に異論が出れば選挙へ。

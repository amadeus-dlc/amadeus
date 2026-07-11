# Requirements Analysis — 明確化質問(260711-p3-repair-batch6)

既決照合を先に実施済み(cid:no-election-for-decided-norms): 並行度・検証コマンド・PR 運用・差分再接地の要否はいずれも memory 層既決のため質問化しない。真に未決の設計判断は以下の1問のみ。file:line 引用は起草時に実測確認済み(cid:mechanism-cite-verify-at-draft、RE scan-notes 由来)。

## Q1: FR-3(#836)Phase Progress flip の実装位置

`## Phase Progress` を更新する機構は現行コードに存在しない(書くのは init `amadeus-utility.ts:2449` のみ)。FR-2(#842)の元修正 `2c2c48a39` は jump 経路用に `markPhaseVerified`/`PHASE_PROGRESS_FIELD` を export していた痕跡があり、FR-3 は advance/approve 経路への新規配線となる。実装位置の選択肢:

- **A**: `handleAdvance`(`amadeus-state.ts:1135`)の同一トランザクション内で flip(Lifecycle Phase 更新と同座)。jump 経路(FR-2)は FR-2 側で独自に更新。
- **B**: 共有ヘルパー(元修正の `markPhaseVerified` 相当を復元・一般化)を `amadeus-state.ts` に置き、advance(FR-3)と jump(FR-2)の両経路から呼ぶ。FR-2/FR-3 の Bolt 間に共有コード依存が生じるため、W1(FR-2)で先にヘルパーを導入し W3(FR-3)が消費する順序制約を受け入れる。
- **C**: 状態遷移の書き込み最下層(`setField` 近傍)にフックし、Lifecycle Phase の変更を検知して自動 flip(呼び出し元の配線漏れを構造的に防ぐが、暗黙更新のため検証劇場との境界に注意)。
- **X**: その他(具体案を添えて)。

[Answer]: B — 共有ヘルパー(E-B6a 裁定 2026-07-11、6/6 全会一致)。根拠: 元修正 2c2c48a39 自体が markPhaseVerified/PHASE_PROGRESS_FIELD export の共有ヘルパー設計であり、Lifecycle Phase の書き手は advance(:1135)/finalize(:1258)/jump の3経路になるため、独立実装(A)は finalize 漏れで PM1-6 類型を再生産する。W1(FR-2)先行導入→W3(FR-3)消費の順序制約は Wave 編成と整合。裁定の agmsg 配信・開票タイムスタンプ: 2026-07-11T09:50:22Z 配信 / 09:52:43Z 開票(git 検証可能な事実は本 [Answer] 記入を含むチェックポイントコミット)。
【前提訂正 E-B6a-r(2026-07-11、6/6)】本問の前提「書き手は3経路」は product-lead レビューで事実誤認と判明し、正準表現へ訂正: 「Phase Progress flip を要する経路は4本(advance :1135 / finalize :1258 / complete-workflow :1283 / jump)— うち Lifecycle Phase の setField 直書きは advance/finalize の2箇所で、complete-workflow と jump は flip を要するが現行は未配線」。加えて「元修正なし」→「旧系譜 8cf816138 の markPhaseVerified 全経路実装を契約参照可」へ訂正。裁定 (B) は書き手4経路化でむしろ強化されるため維持(再選挙不要、確認ラウンド全会一致)。

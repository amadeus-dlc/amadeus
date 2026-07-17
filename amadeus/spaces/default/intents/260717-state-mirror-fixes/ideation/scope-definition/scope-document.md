# Scope Document — 260717-state-mirror-fixes

上流入力(consumes 全数): intent-statement.md, feasibility-assessment.md, constraint-register.md

## In Scope(スコープ内)

intent-statement.md の Problem Statement と feasibility-assessment.md の GO 判定を受け、以下3点で確定(質問ファイル Q1=A):

1. **#1170 修正**: state 書き込みの後退抑止 — 並行セッションの sync-statusline 経由 set-status が approved 済みステージ・Completed 状態を巻き戻さないようにするガード+リグレッションテスト(前進系が抑止されないことの両側実測を含む — feasibility raid-log R1 の緩和)。ガードの設置位置(handleSetStatus 側 / setCheckbox 側 / 両方)は設計ステージで確定(留保付き持ち越し)
2. **#1172 修正**: `scripts/amadeus-mirror.ts` の `countStageProgress` に `— SKIP` サフィックス行の分母除外を追加+unit テスト(`[S]`+`— EXECUTE` と `[ ]`+`— SKIP` の両様式 fixture)
3. **state 修復**: 260717-mirror-issue-tool record の巻き戻り修復(`- [-] nfr-requirements` → `[x]` ほか 5a0cd1e6e で固定された乖離の復元)。実施単位(修正 PR 同梱か別コミットか)は設計段で確定(raid-log R4)

横断要件(constraint-register 準拠): 正本編集+dist×6/self-install 再生成(T2)、Bun-only(T1)、in-process seam テスト(T4)、落ちる実証(T6)、audit 形式に触れない(T5)。

## Out of Scope(スコープ外)

- state 書き込み機構全体の再設計・単調性検査の一般機構化(#1170 の恒久一般化)— 必要性が設計段で顕在化した場合は別 Issue 起票(質問ファイル Q2)
- amadeus-mirror の機能拡張(状態行以外の変更)
- 他の open Issue の同乗(本 intent は #1170/#1172 の fix バッチに限定 — intent-capture Q1 裁定)
- Inception 以降の作業(本 intent は Ideation まで実施して park — 組織的制約 O1)

## 優先順位と順序付け

- 方針: team.md priority-vs-dependency 既決(優先度=キュー順、依存=実行可能性制約)の機械適用(質問ファイル Q4)
- #1170(P2/S3)がキュー先頭。#1172(P3/S4)は軽量かつクロスレビュー成立済みのため同バッチ同乗
- 依存: 修正2件はファイル非交差(`packages/framework/core/` vs `scripts/`)で並行可。検証のみ「#1172 の実測(approved 18/18)は state 修復に依存」の順序制約(質問ファイル Q3)

## タイムライン

ハードデッドラインなし(質問ファイル Q5)。Construction 進入はユーザー決定待ち(issue-selection-user-decides)。

## Value Stream(価値の流れ)

巻き戻り根絶(#1170)→ 手動修復作業ゼロ+Current Stage 依存ツールの誤拒否解消 → チームモード並行運用の信頼性回復。分母修正(#1172)+state 修復 → mirror Issue の進捗表示正常化(#1179 の `3/32` 表示も解消)→ external 共有面の誤認解消。

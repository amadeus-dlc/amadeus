# Code Summary — fix-1838-1860-mirror-cluster(Bolt 1)

上流入力(consumes 全数): requirements.md

- 実装は `requirements.md` FR-1 / FR-2 の AC 全数に対し Red→Green を実測して完了した。PR: [#1876](https://github.com/amadeus-dlc/amadeus/pull/1876)(branch `bolt/obb5-1-mirror-cluster`、base `c49e385ac`)。

## 変更面

- `packages/framework/core/tools/amadeus-mirror-policy.ts` — `intent-capture-approved` の applicable-operations へ `sync` 追加(対称化)。
- `packages/framework/core/tools/amadeus-mirror-coordinator.ts` — operationForBoundary の create 無条件先行を是正(link 状態で create/sync 選択)。
- `packages/framework/core/tools/amadeus-mirror-executor.ts` — close 短絡の prepared 前進、`:527` applyTransition 戻り値破棄の是正(記録不能の正直な報告)。
- `packages/framework/core/tools/amadeus-mirror-state-reducer.ts` — reducer 拡張(mark-pending が prepared を受理し attemptedAt を now 打刻)、別 Issue への complete 再リンク invalid 化・provenance 保存。
- dist 7面+self-install 再生成。
- テスト: t391 新設(境界6種の個数照合込み層跨ぎ対称性)、t279 / t280 / t275 拡張。**t392 は返上**。

## AC 実測(Red verbatim → Green)

| AC | Red | Green |
|---|---|---|
| AC-1a | 重複 create 発行 → `safety-blocked` / `marker identity does not match provenance`(本番 warning と逐語一致) | t279 34 pass |
| AC-1a(境界層) | coordinator 復元時 `["create"]` / policy 復元時 `[]`(無言の同期喪失) | t280 20 pass |
| AC-1b | policy 復元で sync が not-applicable 抑止 | green |
| AC-1c | `intent-capture-approved: a linked mirror is never re-created` fail | t391 13 pass |
| reducer 対称化 | 別 Issue へ `changed`(再リンク)/ provenance が op-2 へ上書き | t275 21 pass |
| AC-2a | `complete: cannot complete from status 'prepared'` | prepared からの収束 green |
| AC-2b | `warnings: []`(無音) | warning 実在 green |
| AC-2b(補) | 未永続 warning を `retryable:true` で返却 / mark-pending invalid | green |

## 実装方式の記録(要件裁量内の選定)

FR-2 第2欠陥は **reducer 拡張**(mark-pending の prepared 受理+attemptedAt 打刻)を採用。理由: 回復記録の発火可能性を呼び出し元へ複製せず、「remote は成功したが local 書込が失敗した」記録の意味(試行は実際に起きている)と一致し、codec の fail-closed 不変条件を保つ。逸脱ではない(plan に選定理由を記録)。

## 検証

builder 報告の全検証(typecheck / lint / dist:check / promote:self:check / 対象テスト)exit 0。CI は PR #1876 で確認中(conductor 管理)。AC-2c(本 intent の pending receipt retry 収束)は build-and-test 段で conductor が実環境実測する。

## 同根

要件外の同根1件(`persistBlocked` の applyTransition 戻り値破棄)を検出・報告 → [#1878](https://github.com/amadeus-dlc/amadeus/issues/1878) として Issue 化済み(CR-6 充足)。他の棚卸し3観点(境界固有選択・marker 描画・prepared 分岐)は PR 本文の表のとおり残存なし。

## 逸脱

なし。

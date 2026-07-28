# RAID Log — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): intent-statement

intent-statement の成功指標(収束性)と支持条件(安全性・診断可能性)を脅かす要因を Risks / Assumptions / Issues / Dependencies で登録する。各項に実測状態を明記する(実測 or 推定 — 未実測項は live risk として扱う)。

## Risks(リスク)

| ID | リスク | 影響 | 緩和 | 実測状態 |
|----|--------|------|------|---------|
| R-1 | Issue 本文更新成功後に Project Status 更新が失敗し、部分成功状態が残る | ボード表示と intent 状態の乖離(成功指標の毀損) | Issue 既定の pending 記録+次回 eligible boundary での冪等 reconcile。Project 別 receipt で成功/未完了を判別 | 構造的に必然(別 mutation — C-T3)。設計で吸収 |
| R-2 | 期待 Status 選択肢の未解決(改訂後の既定 `Ideation`/`Inception`/`Construction`/`Operation` は実 Project #5 に不存在 — `Done` のみ実在。Project 側再構成か上書き設定が済むまで解決不能) | 構成エラーで同期不能、completion close 阻止 | safety-blocked 化+照合規則と診断メッセージを requirements で固定。運用手順(Project 再構成 or 上書き設定)をドキュメント化 | **実測で現存確認済み**(2026-07-27、Project #5。Issue 改訂で不一致の範囲が拡大) |
| R-3 | 書込系 mutation の未実測 — `updateProjectV2ItemFieldValue`(Status 設定)に加え、仕様変更 B で `addProjectV2ItemById`(item 追加)も対象。書込経路に未知の制約(org project への書込権限粒度等)がありうる | walking skeleton で初めて露出 | skeleton Bolt の最初の end-to-end 実証対象(追加→設定の連鎖)に含め、失敗時は halt-and-ask | **未実測 = live risk**(read-only 方針のため。cid:code-generation:unverified-raid-is-live-risk 準拠で skeleton の最初の検証面に指定) |
| R-4 | GraphQL rate limit / 一時障害 | sync が pending 化 | retryable 分類+次回 boundary 再試行(既存 gateway のエラー分類に GraphQL 面を追加) | 推定(high confidence — 同期は少数リクエスト) |
| R-5 | 複数 Project 所属時の一部成功 | Project 単位の乖離 | Project ごとに独立 receipt / reconcile(Issue 既定) | 実測(照会 API は Project 単位で独立に応答) |

## Assumptions(前提)

| ID | 前提 | 実測状態 |
|----|------|---------|
| A-1 | 運用者の gh token は `project` scope を保有する(不足時は診断のみで自動変更しない) | 現行環境は**実測で保有確認済み**。配布先環境は保有を仮定せず診断で対応 |
| A-2 | mirror Issue の所属 Project 数は少数(1〜数個)で、Status 解決のリクエスト数は boundary あたり一桁 | 推定(medium — 実運用は Project #5 の1個。上限設計は requirements で扱う) |
| A-4 | Project への item 追加は Amadeus が行う(仕様変更 B)。GitHub 側 auto-add workflow には依存しない(「Item added to project」はユーザーが無効化済みを実測、「Auto-add to project」も無効化予定と表明) | workflow 状態は 2026-07-27 実測。auto-add 無効化後の追加経路は Amadeus のみ |
| A-3 | parked は Status を変更しない(park 前の Status を常に維持 — 明示マッピングの仕組み自体を持たない) | Issue #1560(2026-07-27 改訂版)既定 |

## Issues(顕在問題)

| ID | 問題 | 状態 |
|----|------|------|
| I-1 | (現時点でブロッカーとなる顕在問題なし) | — |

## Dependencies(依存)

| ID | 依存 | 実測状態 |
|----|------|---------|
| D-1 | gh CLI(GraphQL サブコマンド対応版)| **実測**: `gh api graphql` 到達成功(2026-07-27) |
| D-2 | 既存 mirror モジュール群(gateway / executor / state codec / reducer / lifecycle / repair)| **実測**: packages/framework/core/tools/ に16ファイル実在(HEAD) |
| D-3 | GitHub ProjectV2 GraphQL API(fields / items / mutation)| 照会系は**実測**済み。mutation は R-3 のとおり未実測 |

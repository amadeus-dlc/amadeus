# Decision Log — Ideation フェーズ(260727-mirror-project-status)

上流入力(consumes 全数): intent-statement, scope-document, intent-backlog, feasibility-assessment, constraint-register

Ideation フェーズで確定した全裁定の台帳。詳細は各ステージの questions ファイルと成果物(intent-statement / feasibility-assessment / constraint-register / scope-document / intent-backlog)を正とする。

## 裁定一覧

| # | 日時(UTC) | ステージ | 裁定 | 記録先 |
|---|-----------|---------|------|--------|
| D-1 | 2026-07-27T03:54:50Z | intent-capture | 対象顧客 = Mirror+Projects ボード運用者(一次はソロ運用者) | intent-capture-questions.md Q1 |
| D-2 | 2026-07-27T03:54:50Z | intent-capture | 成功指標の主軸 = 収束性(安全性・診断可能性は支持条件) | 同 Q2 / intent-statement |
| D-3 | 2026-07-27T03:54:50Z | intent-capture | スコープ = Issue #1560 全体、段階分割なし | 同 Q3 |
| D-4 | 2026-07-27T03:54:50Z | intent-capture | トリガー = mirror 実運用化後の Project Status 手動更新ギャップ解消 | 同 Q4 |
| D-5 | 2026-07-27T04:00:32Z | (mirror lifecycle) | mirror Issue create を承認 → #1563 作成 | 監査シャード |
| D-6 | 2026-07-27T04:05:06Z | feasibility | 0問様式承認。外部前提は実測で確定(GO)、mutation のみ skeleton へ | feasibility-questions.md / feasibility-assessment.md |
| D-7 | 2026-07-27T04:13:31Z | scope-definition | MoSCoW = 全項目 Must / シーケンス = risk-first | scope-definition-questions.md Q1/Q2 |
| D-8 | 2026-07-27T04:19:38Z | scope-definition(revision 1) | **写像対象の訂正**: 作業進行状態 → lifecycle フェーズ(Ideation/Inception/Construction/Operation/Done)。Issue #1560 本文同時改訂、受入条件17項目化、parked 明示マッピング廃止。上流成果物へ波及更新 | Change Request(監査)/ scope-document 改訂版 |
| D-9 | 2026-07-27T04:25:30Z | approval-handoff | 0問様式承認、Go 推奨で brief 編纂 | approval-handoff-questions.md |
| D-10 | 2026-07-27T04:33 頃(UTC) | approval-handoff(仕様変更 B) | **Amadeus 側で Project への item 追加を行う**: 「Bだろ。auto-addは無効化しますので、Amadeus側がideationに追加してください。」— 設定済み対象 Project へ create チェーン内で冪等追加+現在フェーズ Status 即設定。非対象「自動追加しない」を撤回(削除・アーカイブは非対象のまま)。実測: 「Item added to project」(Backlog 設定)無効化済み、mirror #1563 は Status 未設定で所属済み | Change Request(監査)/ scope-document In Scope 18 |

## スキップしたステージと根拠

| ステージ | 根拠 |
|---------|------|
| market-research | amadeus-feature スコープ外。内部動機(運用ギャップ)で投資判断可能 — 存在しない競合分析を補完しない |
| team-formation | 同スコープ外。ソロ運用 — staffing は Delivery Planning で確定 |
| rough-mockups | 同スコープ外。UI なし — 出力契約は requirements 以降で固定 |

## 未決事項(Inception へ引き継ぎ)

- Status 選択肢名の照合規則(exact / case-insensitive)と診断メッセージ要件 — requirements-analysis で固定(feasibility 発見事項)
- 上書き設定・既定マッピングの設定置き場所 — 既存 amadeus-mirror-config.ts の3層流儀を実測して requirements/design で固定
- Project #5 の選択肢再構成 or 上書き設定のどちらを一次運用とするか — requirements で運用手順とともに確定
- (仕様変更 B)追加対象 Project の指定方法(設定キー・複数指定・org/user project の扱い)と、追加失敗の failure semantics 詳細 — requirements で固定
- Issue #1560 本文への仕様変更 B の反映(非対象欄・受入条件)— 編集主体をユーザーへ確認中

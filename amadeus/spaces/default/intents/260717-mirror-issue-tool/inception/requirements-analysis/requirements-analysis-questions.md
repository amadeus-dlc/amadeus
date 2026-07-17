# Requirements Analysis — Questions(260717-mirror-issue-tool)

モード: Guide me

## 上流入力

上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md、team-practices.md — 各問は scope-document の Could(重複ガード)と RE 実測(完了2シグナル、Project フィールド)から導出。

E-OC1 証跡: ソロモード — ユーザーの AskUserQuestion 直答(実 HUMAN_TURN)による裁定であり選挙不要。ユーザー承認タイムスタンプ: Q4 2026-07-17T14:01:26Z / Q1/Q2/Q3 とも 2026-07-17T13:53:26Z(AskUserQuestion 直答・同一バッチ)

## Q1. create の重複実行時の挙動

既にミラー Issue を持つ intent へ create を再実行した場合。

A. exit 1 の loud エラー(既存 Issue 番号を表示。「作り直したい」は人間が Issue を closeしてから)— 二重起票を構造的に防ぐ
B. 既存検知時は sync に自動フォールバック(冪等 create)
C. 無条件に新規起票(重複許容)
X. Other (please specify)

[Answer]: A(loud エラー — 既存番号を表示して exit 1。二重起票の構造的防止)— 2026-07-17T13:53:26Z, Mode: guided

## Q2. close の着地機械検査の権威シグナル

RE 実測: intent 完了は単一トランザクションで intents.json(status=complete)と state.md(Status=Completed)の両方を書く(amadeus-state.ts:1652-1667)。

A. AND — 両シグナル成立で通過(単一トランザクション書き込みのため通常は同時成立。片方のみ成立=異常状態として exit 1 で保護)
B. OR — どちらか成立で通過(部分書き込み事故に寛容だが偽陽性リスク)
C. intents.json のみ(単一ソース)
X. Other (please specify)

[Answer]: A(AND — 両シグナル成立で通過、片方のみは異常として exit 1 の fail-closed)— 2026-07-17T13:53:26Z, Mode: guided

## Q3. ミラー Issue 番号の記録先

create が起票した Issue 番号を intent 側のどこに永続化するか(sync/close が対象 Issue を特定する正)。

A. amadeus-state.md の Project Information 節に `- **Mirror Issue**: #<n>` フィールドを追加(getField で機械可読、record と同居、チェックポイントコミットで共有)
B. intents.json のエントリへ mirrorIssue フィールド追加(space レベル台帳。ただし書き込みは WORKSPACE lock 契約下)
C. record 直下の専用ファイル(mirror-issue.md)
X. Other (please specify)

[Answer]: A(amadeus-state.md の Project Information 節へ Mirror Issue フィールド追加)— 2026-07-17T13:53:26Z, Mode: guided

## Q4. create が付与するラベル(レビュー指摘の裁定)

レビューが FR-2.1 の `enhancement` ラベル併記を無申告のスコープ追加として指摘(上流成果物はすべて `intent-mirror` 単独)。ただし先行の手動起票 #1161 は intent-mirror + enhancement の2ラベルで運用済み。

A. intent-mirror 単独に戻す(上流成果物と一致。種別ラベルは起票後に人間/トリアージが判断)
B. intent-mirror + enhancement の2ラベルを正式要件化(auto-label-triage の「起票時に種別を付ける」をツール起票にも適用、根拠を FR に明記)
X. Other (please specify)

[Answer]: B(intent-mirror + enhancement の2ラベルを正式化。根拠 = auto-label-triage『起票時に種別ラベルを必ず付ける』のツール起票への適用、#1161 の先行実績)— 2026-07-17T14:01:26Z, Mode: guided

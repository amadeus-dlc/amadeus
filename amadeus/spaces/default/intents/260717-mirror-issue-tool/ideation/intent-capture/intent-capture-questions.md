# Intent Capture — Questions(260717-mirror-issue-tool)

モード: Grill me(grilling-protocol.md §2 — 動的起草・1問ずつ・事前一括起草なし)

E-OC1 証跡: ソロモード — 全5問はユーザーの AskUserQuestion 直答(実 HUMAN_TURN)による裁定であり、選挙は不要(判定根拠: 各問がユーザー本人の決定事項)。ユーザー承認タイムスタンプ(audit QUESTION_ANSWERED 実測): Q1 2026-07-17T12:22:21Z / Q2 2026-07-17T12:23:04Z / Q3 2026-07-17T12:23:42Z / Q4 2026-07-17T12:25:24Z / Q5 2026-07-17T12:40:05Z

## Q1. 配布形態 — このツールは誰のためのものか

amadeus フレームワークの配布物(`packages/framework/core/tools/amadeus-mirror.ts` → 全ハーネス dist/self-install へ出荷、テスト・ドリフトガード対象)とするか、まずこの repo ローカルのユーティリティ(`scripts/`)として作るか。

A. フレームワーク配布物として出荷(全 amadeus ユーザーが intent-first 運用を使える。出荷面・テスト・ドリフトガードの増分が乗る)
B. まず repo ローカル(`scripts/`)で作り、運用が安定したら別 intent で framework へ昇格(増分最小、試運転の趣旨に合う)
C. framework 配布物だが実験フラグ付き(中間)
X. Other (please specify)

[Answer]: B(repo ローカル、scripts/ で開始。安定後に別 intent で framework 昇格を検討)— 2026-07-17, Mode: grill

## Q2. intent 完了時のミラー close の権限設計

close-after-landing ノルムは「着地実測後にのみクローズ」を要求する。ツールの close サブコマンドをどう位置づけるか。

A. close はツールが実行するが、呼び出し自体が人間/leader の確認後という運用契約(ツール内に対話確認なし。着地実測はツールが機械検査して不成立なら拒否)
B. close サブコマンドは着地検査のみ行い、gh issue close は常に人間が手で実行
C. close は完全自動(intent complete 検知で無確認クローズ)
X. Other (please specify)

[Answer]: A(確認後ツール実行+機械検査。着地実測はツールが行い不成立なら exit 1、呼び出し可否は人間確認後の運用契約)— 2026-07-17, Mode: grill

## Q3. sync の書き込み面 — ミラーの状態はどこに現れるか

A. Issue 本文の状態セクションを書き換え(カードとして常に最新。履歴は record/audit が持つ)
B. コメント追記(Issue 上に履歴が残るが本文が古び、通知ノイズが出る)
C. 本文書き換え+節目のみコメント(両方)
X. Other (please specify)

[Answer]: A(Issue 本文の状態セクションを書き換え。履歴は record/audit が正本)— 2026-07-17, Mode: grill

## Q4. 成功指標(見立て確認)

見立て: 本 intent の成功指標は (1) intent birth からミラー Issue 起票までが1コマンドで完了する (2) ミラー本文が定型3要素(概要+record リンク+状態行)のみを保ち設計詳細ゼロ (3) close は着地機械検査を通過した場合のみ成功する — の3点(確信度: 高。運用ノルム cid:intent-first-mirror-issue の要件から直接導出)。

A. はい、この3点で進める
B. いいえ、違う(通常の判断問題として立て直す)
X. Other (please specify)

[Answer]: A(3点で確定: 1コマンド起票/定型3要素のみ/close は着地機械検査通過時のみ)— 2026-07-17, Mode: grill

## Q5. ミラー Issue 起票後のレビューをどう扱うか

従来ノルム(issue-cross-review)は起票 Issue に2名の独立実測レビューを要求する。ミラー Issue にも適用するか。

A. ミラーはクロスレビュー対象外 — 定型3要素のみで検証すべき主張を含まず、中身の検証は workflow のステージレビュー(reviewer・ゲート・センサー)が担う。従来の Issue-first 経路(bug 等)のクロスレビューは不変。チームモードでは起票の事実を leader へ即時報告(autonomous-decision-immediate-report 準拠)
B. ミラーにも2名クロスレビューを適用(起票の重複ガードとして)
C. 起票時に1名の軽い形式確認のみ(定型3要素が守られているか)
X. Other (please specify)

[Answer]: X(ユーザー裁定 2026-07-17: クロスレビューは intent birth PR で行う — park 時に record 成果物を record PR として出し、起票者以外の独立2名が実測 verdict を PR 上に残す。実装着手は record PR マージが前提。ミラー Issue に verdict は書かない。PR #1159 に同旨を追記済み)— Mode: grill

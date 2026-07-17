# Intent Capture 質問ファイル — 260717-state-mirror-fixes

<!-- E-OC1 選挙不要判定の証跡(eoc1-evidence-in-questions-header 準拠)
判定申告: 全4問について選挙不要と判定(根拠は各問の判定行を参照 — いずれも Issue 本文・コメント・leader 指示の既決事実からの転記であり、新規の判断を含まない)。申告 agmsg: 2026-07-17T17:35:14Z e1→leader
leader 承認: 2026-07-17T17:35:26Z leader→e1 agmsg【E-OC1 承認】(4問全て承認 — 既決・実測由来で未決判断なし)
-->

## 上流入力(consumes 全数): (なし — 本ステージは consumes 宣言なし)

## Q1: どのビジネス課題を解決するか?

- A. Issue #1170: 並行セッションの sync-statusline フックが共有 amadeus-state.md を古いスナップショットで上書きし、Current Stage/checkbox が audit と乖離する方向へ巻き戻る(learnings gate 等の Current Stage 依存ツールが誤 slug で拒否される実害)
- B. Issue #1172: amadeus-mirror.ts の状態行集計がスコープ SKIP ステージ(`— SKIP` サフィックス行)を分母に含め、`approved 18/32` のような誤表示になる
- C. A と B の両方(fix バッチ intent)
- D. その他のフレームワーク不具合も含める
- E. 上記のいずれでもない
- X. Other

[Answer]: C

選挙不要判定: leader のタスク割当(2026-07-17T17:32:09Z agmsg)が両 Issue を対象とする fix バッチ intent と明示 — 既決事実の転記。

## Q2: 顧客(利用者)は誰で、どんなペインか?

- A. amadeus フレームワークをチームモードで運用する開発チーム(並行セッション下で state 巻き戻りに遭遇し手動修復を強いられる)+ mirror Issue の閲覧者(誤った進捗分母を見せられる)
- B. エンドユーザー(フレームワーク外部の一般利用者)
- C. フレームワーク開発者のみ
- D. CI/CD パイプライン
- X. Other

[Answer]: A

選挙不要判定: #1170 本文(intent 260717-mirror-issue-tool の Construction 中に2回実測+手動修復)と #1172 本文(dogfooding #1161 の sync 実測で発見)からの転記 — 既決事実。

## Q3: 成功の定義・計測可能な指標は?

- A. #1170: 並行セッション稼働下で amadeus-state.md の Current Stage/checkbox が後退方向へ書き戻されないこと(巻き戻り再現手順で非再現+リグレッションテスト green)。#1172: `— SKIP` サフィックス行が分母から除外され in-scope 分母(例: 18/18)で表示されること(unit テスト green)
- B. 全 32 ステージの表示が変わること
- C. audit ログ形式の変更
- D. 定性的な改善のみ(テスト不要)
- X. Other

[Answer]: A

選挙不要判定: #1170 の症状記述(learnings gate 拒否・修復コマンド列)と #1172 の修正案(1行条件追加+unit テスト1件、期待 18/18)からの導出 — Issue 記載の既決事実。org.md バグ修正テスト規範(リグレッションテスト追加)の機械適用。

## Q4: この取り組みのトリガーは?

- A. dogfooding(intent 260717-mirror-issue-tool の実運用)中に実測された不具合 2 件 — #1170 は3回の巻き戻り実測+書き手特定済み(sync-statusline フック、確定度: 高)、#1172 は #1161 sync 実測で発見。ユーザー指示による着手(issue-selection-user-decides 準拠、scope=amadeus のユーザー明示指示あり)
- B. 市場圧力
- C. 規制対応
- D. 技術的負債の一般的解消
- X. Other

[Answer]: A

選挙不要判定: Issue 本文の経緯欄+leader 経由のユーザー指示(2026-07-17T17:32:39Z 訂正: scope=amadeus はユーザー明示指示)からの転記 — 既決事実。

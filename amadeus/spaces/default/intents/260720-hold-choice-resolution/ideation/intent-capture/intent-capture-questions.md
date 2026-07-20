# Intent Capture — 明確化質問(260720-hold-choice-resolution)

<!-- E-OC1 選挙不要判定ヘッダ -->
> **選挙不要判定(E-OC1)**: 全3問を選挙不要と判定する。根拠種別は各問の判定行に記載。真に未決の設計判断(choice 指定の CLI 構文・二値語彙の後方互換・ユーザー可視契約該当性)は RA/design 段の選挙・エスカレーション事項として diary に予告済み。
> 判定申告: 2026-07-20T02:50Z 頃 leader へ agmsg 送信。leader 承認: 【承認待ち】

上流入力(consumes 全数): (本ステージは consumes 宣言なし)

## Q1: 解決するギャップは何か?

- 判定: 選挙不要 — Issue #1267 本文(E-TCRCG e4 留保の転記)と E-TCRRA2 裁定の既決事実
- A. 多肢 choice tie 由来の hold を人間解決する際、HOLD_RESOLUTIONS の choice-blind 二値語彙(adopted/rejected)では勝者 choice を表現できない — E-TCRRA2(tie→hold 正規経路)採用により将来必ず顕在化する構造ギャップ
- B. tally の自動集計の誤り
- C. verify の検査漏れ
- D. timeline の非単調
- E. GoA 集計の誤り
- X. その他

[Answer]:

## Q2: 利用者と価値は何か?

- 判定: 選挙不要 — 選挙運用の実構造(hold 裁定の実施者=ユーザー/leader)からの導出
- A. hold 裁定を行う人間(ユーザー・leader)— 多肢 tie の裁定を CLI 語彙で直接表現でき、record.md へ勝者 choice が正確に永続化される(human-ruling-persist-through)
- B. 投票メンバーの投票体験
- C. CI パイプライン
- D. 外部サービス連携
- E. npm 利用者
- X. その他

[Answer]:

## Q3: 成功の定義は何か?

- 判定: 選挙不要 — Issue 対応方向+既決ノルム(human-ruling-persist-through)の機械的導出
- A. (i) choice tie の hold に対し勝者 choice 指定の resolution が受理・永続化され record.md の裁定行に勝者 choice が描画される(閉包テスト固定) (ii) E-TCRCG=A の既存二値経路の扱いは設計裁定に従う (iii) 既存テストスイート green 維持
- B. hold の発生自体を防ぐ
- C. 裁定の自動化
- D. record 様式の全面刷新
- E. 二値語彙の即時廃止
- X. その他

[Answer]:

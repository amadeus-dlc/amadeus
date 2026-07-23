# Requirements Analysis Questions — 260719-mirror-productization

<!-- E-OC1 選挙不要判定ヘッダ -->
> **処理方式**: Q1〜Q3 は複数の妥当解を持つ真の未決(U-04 の requirements 委任+CLI 出力契約)であり裁定対象。裁定経路(P-02 ユーザー直接 or 選挙)は leader へ照会済み(2026-07-23T01:13Z 頃 agmsg)— 裁定受領後にのみ [Answer] 記入(cid:election-answer-after-ruling)。既決事項(G-1〜G-7 / C-01〜C-08 / D-01〜D-08 / S-01〜S-07 / W-01〜W-05)は質問化しない(cid:no-election-for-decided-norms)。
> **判定申告**: 2026-07-23T01:13Z 頃(agmsg e3→leader)
> **裁定経路の確定**: 選挙方式(ユーザー裁定、leader 経由 agmsg 2026-07-23T01:13:32Z — P-02 は継続分に限り選挙へ改定、constraint-register 改定履歴に申告済み)

## Q1. phase 境界ミラー ask の発火粒度(U-04a)は?【E-MPRRA1 裁定済み】

- A. phase-check 対象3境界(ideation / inception / construction の各完了時)— PHASE_CHECK_REQUIRED_PHASES(amadeus-state.ts:165-169)と同集合で機械的に一致
- B. 全 phase 境界(operation 完了 = workflow 完了時も含む4境界)
- C. construction 完了時のみ(実装着地 = ミラー状態行が最も動く節目に限定)
- X. Other (please specify)

判断点: intent-first-mirror-issue ノルムの節目定義は「park・phase 完了・complete」。A は既存機構(verifyPhaseCheckArtifact)との対称性が最大。B は complete 時の close 導線を ask に含められる(ただし close は常に ask — C-05)。C は発火回数最小。

[Answer]: A — phase-check 対象3境界(ideation / inception / construction の各完了時)で ask 発火(E-MPRRA1 裁定 A、2-1。記入 2026-07-23T01:19:13Z、裁定受領後)

## Q2. auto-mirror 有効かつミラー未作成 intent の phase 境界挙動(U-04b)は?

- A. ask へ降格(create 選択肢込みの通常 ask — auto は sync のみという G-7 の厳格読み。未作成時に無音で進まない)
- B. advisory print(「ミラー未作成のため auto-sync をスキップ」の stderr 注記)で続行 — ask なし
- C. loud エラーで停止(auto 設定と未作成状態の矛盾を設定エラー扱い)
- X. Other (please specify)

判断点: G-7 は「auto で無確認実行するのは sync のみ」— create を auto しないことは既決だが、未作成時に人間を呼ぶ(A)か静かに進む(B)かは未決。C は park/未作成の正常系(intent-first で ideation 中は未作成が普通)を誤ってエラー化するリスク。

[Answer]: A — ask へ降格(create 選択肢込みの通常 ask。auto は sync のみの G-7 厳格読み)(E-MPRRA2 裁定 A、3-0。記入 2026-07-23T01:19:13Z、裁定受領後)

## Q3. status verb の exit code 契約は?

- A. 0 = 乖離なし / 1 = 乖離あり(3クラスのいずれか検出)/ 2 = 前提エラー(gh 不在・未認証・record 不在)— 機械消費(CI・スクリプト)可能な3値
- B. 診断出力のみで常に exit 0(前提エラーのみ非ゼロ)— 人間向け診断に徹する
- C. 乖離クラスごとに exit code を分ける(1=状態行 stale / 2=未作成 / 3=手動変更、前提エラー=4)
- X. Other (please specify)

判断点: 兄弟 CLI の既習様式は amadeus-mirror.ts 本体 = fail は一律 exit 1(fail :231-234)、usage=2。doctor は常に人間向け出力。ui-less-mockups-as-output-contract により本問の裁定が受け入れ基準とテスト文言の導出元になる。

[Answer]: A — 0 = 乖離なし / 1 = 乖離あり / 2 = 前提エラーの3値契約(E-MPRRA3 裁定 A、3-0。記入 2026-07-23T01:19:13Z、裁定受領後)

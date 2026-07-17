# Scope Definition 質問ファイル — 260717-state-mirror-fixes

<!-- E-OC1 選挙不要判定の証跡(eoc1-evidence-in-questions-header 準拠)
判定申告: 全5問について選挙不要と判定(各問の判定行を参照 — いずれも Issue・クロスレビュー・上流成果物・既決ノルムからの転記であり、新規の判断を含まない)。申告 agmsg: 2026-07-17T17:57:26Z e1→leader
leader 承認: 2026-07-17T17:58:00Z leader→e1 agmsg【E-OC1 承認】(5問全て承認 — 既決・実測由来で未決判断なし)
-->

## 上流入力(consumes 全数): intent-statement.md, feasibility-assessment.md, constraint-register.md

## Q1: 価値を出す最小スコープは?

- A. (i) #1170: state 書き込みの後退抑止ガード+リグレッションテスト (ii) #1172: `— SKIP` 行の分母除外+unit テスト (iii) 260717-mirror-issue-tool record の state 修復(feasibility raid-log I1) — の3点で完結。それ以外(state 機構の再設計・mirror の機能拡張)はスコープ外
- B. #1170 のみ
- C. #1172 のみ
- D. state 書き込み機構全体の再設計を含める
- X. Other

[Answer]: A

選挙不要判定: 両 Issue の修正案+feasibility raid-log I1/R4(state 修復の必要はクロスレビュー e3 実測)からの転記 — 既決事実。(iii) の実施単位(同一 PR か別か)は設計判断として持ち越し(raid-log R4)。

## Q2: must-have と nice-to-have の区分は?

- A. must: Q1 の3点+落ちる実証(org.md Mandated)+両様式 fixture(e2/e3 レビュー所見)。nice(スコープ外へ): #1170 恒久対策の一般化(state 書き込み単調性の機構化)を別 Issue 化するか否かは設計段で判断
- B. すべて must
- C. テストは nice-to-have
- X. Other

[Answer]: A

選挙不要判定: org.md Mandated(落ちる実証)・Issue クロスレビュー所見(fixture 両様式)の機械適用+intent-statement の Success Metrics 転記 — 既決事実。

## Q3: ケイパビリティ間の依存関係は?

- A. #1170 修正と #1172 修正はファイル非交差(core/hooks+core/tools vs scripts/)で独立。#1172 の実測検証(approved 18/18)のみ state 修復(I1)に依存(feasibility raid-log D3)。並行実装可、検証順序のみ制約
- B. #1170 → #1172 の直列必須
- C. 依存なし(検証も独立)
- X. Other

[Answer]: A

選挙不要判定: feasibility raid-log D2/D3 の転記+対象ファイルの非交差は Issue 記載のファイルパス実測(packages/framework/core/ vs scripts/)— 既決事実。

## Q4: 順序付けの方針(リスク先行/価値先行/依存先行)は?

- A. 優先度=キューの並び順、依存=実行可能性の制約の2層(team.md priority-vs-dependency 既決)— P2 の #1170 が先頭、P3 の #1172 は軽量のため同バッチ同乗可(クロスレビュー2名成立済みで編入前提は充足)
- B. 価値先行で #1172 を先に
- C. ランダム
- X. Other

[Answer]: A

選挙不要判定: team.md priority-vs-dependency 既決の機械適用+P ラベル実測(#1170=P2、#1172=P3)— 既決事実。

## Q5: 特定ケイパビリティに紐づくハードデッドラインは?

- A. なし(feasibility Q4 裁定の転記)。Construction 進入自体がユーザー決定待ち
- B. あり
- X. Other

[Answer]: A

選挙不要判定: feasibility questions Q4 裁定(E-OC1 承認済み 17:48:22Z)の転記 — 既決事実。

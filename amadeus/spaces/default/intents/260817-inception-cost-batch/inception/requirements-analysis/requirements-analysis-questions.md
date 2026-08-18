# Requirements Analysis 質問ファイル — 260817-inception-cost-batch

> 実装形の選定(#3181 の3案 / #2415 の除外集合)は Issue 本文が application-design の設計裁定事項と明示するため、本ステージでは問わない(cid:requirements-analysis:c5)。本ステージの material 裁定は効果測定の測定可能化2点のみ。Intent Autonomy Mode = full につき、両問は `amadeus-bolt decide-question` 梯子で裁定する(cid:scope-definition:c1-semi-ladder-routing)。
>
> リーダー承認(Intent autonomy grant 経由): 2026-08-17T23:05:00Z — full グラント `intent-grant-edcb102bc13cb317c58295042495ae77`(ユーザー実 HUMAN_TURN によるセレモニー確定)配下の梯子裁定 AUTO_DECIDED ×2 で回答を確定(E-OC1)。各 [Answer] に decision id を記録済み。

## Q1: #3181 完了条件4(効果測定)の N と目標値をどう確定するか

Issue #3181 は「実装 intent の requirements で N と目標低下幅を観測レンジ内で確定」と規定する。観測レンジ(Issue 本文の audit 実測): 単一 Issue intent の RE+RA active は 24〜73 分(20件)、直近時代中央値 47 分/intent。

A. N=5(導入後の issue-first self-fix 5 intent)、目標 = RE+RA active 中央値 35 分未満(観測レンジ 24〜73 の内側、baseline 47 分比 −25%)
B. N=5、目標 = 中央値 47 分未満(baseline を下回ればよい)
C. N=10、目標 = 中央値 35 分未満(評価が遅くなる)
X. Other (please specify)

[Answer]: A — full autonomy 梯子 AUTO_DECIDED `auto-decision-c07be782efbca26ddd74f925eb78aede`(grant `intent-grant-edcb102bc13cb317c58295042495ae77`、2026-08-17)。根拠: cid:code-generation:c1-threshold-inside-observed-range(35 分は観測レンジ 24〜73 の内側)+ ユーザーの急務性言明(2026-08-18 実 HUMAN_TURN)に B の弱目標が不整合

## Q2: #2415 完了条件2(入力縮小)に数値下限を課すか

Issue #2415 は「縮小率が記録されること」を要求(数値下限は未規定)。直近7区間の実測では排出物比が 46.5〜86.5%、intents 単独でも 39.0〜72.6% と区間構成に強く依存する。

A. 数値下限は設けない — 縮小率の実測記録+除外集合の帰属検査(除外された行が全て宣言済み除外クラスへ帰属し、未帰属の除外がゼロ)を AC とする(閾値レンジ外の全赤/全緑罠を回避)
B. 下限 35% を課す(観測 intents 比最小 39.0% の内側だが、コード比重の大きい将来区間で偽赤化しうる)
X. Other (please specify)

[Answer]: A — full autonomy 梯子 AUTO_DECIDED `auto-decision-027632c7887ca3f395eb5b0bba17fab0`(grant `intent-grant-edcb102bc13cb317c58295042495ae77`、2026-08-17)。根拠: 縮小率は区間構成依存(排出物比 46.5〜86.5% — xrev-2415-20260818 実測)で制御不能量への固定下限は構造的偽赤(c1-threshold-inside-observed-range)。帰属検査 AC は cid:code-generation:c-measure-not-prose の既存様式適用。数値下限の追加は Issue 原文完了条件の無断強化にも当たる

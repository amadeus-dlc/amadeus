# Requirements Analysis — 質問(260814-open-bug-batch-6)

> 承認記録: 3問すべて intent autonomy=full(grant `intent-grant-9c648ea11210c53198c6a9365b93f961`)の decide-question 梯子で AUTO_DECIDED — Q1=`auto-decision-36575e73dedf71c53dbc60e12a1788e0`、Q2=`auto-decision-fd8b91a041292780a7eba0849ac5af27`、Q3=`auto-decision-b56785373a939a75fc540a5d00bac3ec`(2026-08-15T00:19:20Z 記録)。人間への直接提示は不要(2026-08-15 ユーザー裁定「推奨明確な判断は梯子」)。

クロスレビュー収束(xrev-260815-*、全 Issue 2名成立)と RE 差分リフレッシュ(observed `a49f9e9f`)を前提に、実装バッチの構成に影響する判断のみを問う。既決事項(対象5 Issue の選定、in-progress 4件の除外、units-generation/delivery-planning EXECUTE 化)は再質問しない。

## Q1: #3031(t-worktree-gc flake)の扱い — 収束結果が REFRAME_REQUIRED

クロスレビュー2名が症状の実在を確認する一方、Issue の観測「stderr がログに残っていない」を両名が一次証跡で REFUTED し、完了条件2の retry は PR #3056 で実質着地済み。残存スコープの書き換えが必要。

A. リフレーム後スコープで本バッチに含める — 残存作業を「既着地 retry の射程検証(発火条件が観測失敗の stderr を覆うか)+決定的化の残余是正+fixture の git worktree add を使う対称面の棚卸し(修正でなく起票)」として FR 化する
B. 本バッチから除外し、リフレーム済みコメントを残して次回トリアージへ委ねる
C. Issue をクローズ提案し、残存調査は新規 Issue へ切り出す
X. Other (please specify)

[Answer]: A

## Q2: #3032(監査シャード汚染)の扱い — 機序未実証の調査型

現行バイトの経路読解では仮説(OTel ピン経由の無音別 workspace 着地)は成立しにくく、当時断面での再現が機序特定の必須条件(RE §2.5、レビュー両名一致)。

A. 調査ユニットとして本バッチに含める — repo 外 scratch で当時断面(2026-08-07 近傍)を再現試行し、機序確定なら「emit 宛先が呼出時 projectDir と常に一致(不一致は loud fail または no-op)」の是正+回帰テスト、再現しなければ Issue の完了条件3(実測ログ添付のクローズ準備+既着地2行の revert 要否申し送り)へ進む
B. 本バッチから除外し次回へ委ねる
X. Other (please specify)

[Answer]: A

## Q3: #3062 の是正方式の裁定タイミング

レビュー2名が「landed 拒否は stage 文書に明記された意図的設計であり、Merge Queue 必須ノルム・landed 第一級 verdict と契約衝突」と精緻化した。是正方式(landed の self report 許可/override 許可/センサー側の landed+merge commit 検証合格 等)は複数の妥当解を持つ設計判断。

A. requirements では「merged PR の self record 最終化経路を提供する」ことだけを要求として固定し、方式選定は application-design ステージで選挙(設計逸脱・複数妥当解)にかける
B. requirements の時点で方式まで固定する
X. Other (please specify)

[Answer]: A

# Requirements Analysis — 質問(intent 260815-per-unit-outcome)

> Issue #3099・クロスレビュー 2 名(ESTABLISHED_WITH_REFINEMENTS)・RE 差分スキャンで既決の事項は再質問しない(cid:requirements-analysis:c5)。以下は実装を左右する未決 3 点のみ。修正方式 (a)/(b)/(c) の選定は intent 開始指示により選挙対象のためここでは扱わない。
>
> 回答承認: 2026-08-15T08:37:00Z — 実 HUMAN_TURN(AskUserQuestion ガイドモード)で 3 問一括回答(Q1=C / Q2=A / Q3=A)。

## Q1. 回復手順文書(#3099 完了条件 3)の配置面

停止済み intent(260814-open-bug-batch-6)の回復手順 — pool イベントを後から捏造しない形 — をどこに文書化しますか。

A. `docs/guide/` 配下の運用ガイドへ新節を追加(恒久文書・全利用者向け)
B. 本 intent record 内の成果物のみ(一次記録として十分)
C. 両方 — docs へ一般手順、record へ本件への適用実測
D. Issue #3099 のクローズコメントに手順を記載
E. 対象外にする(回復はステップ4の作業ログで代替)
X. Other (please specify)

[Answer]: C(両方 — docs へ一般手順、record へ本件への適用実測)

## Q2. 同根面 ci-pipeline(enterprise 限定)の扱い

クロスレビュー R2 が特定した同根面: `ci-pipeline.md` も code-summary を required consume する(enterprise スコープのみ)。読み口側の修正なら 7 consumer / 19 edge 全体が構造的に治りますが、落ちる実証(Red→Green)の再現テストは build-and-test 面だけで足りるとしますか。

A. 落ちる実証は build-and-test のみ。ci-pipeline は修正の構造的帰結として requirements に明記(テストは fanout 単体層でエッジ横断を担保)
B. ci-pipeline にも独立の落ちる実証を追加(enterprise スコープの integration 再現)
C. ci-pipeline は対象外と明記し、別 Issue を起票
X. Other (please specify)

[Answer]: A(落ちる実証は build-and-test のみ。ci-pipeline は構造的帰結として明記、fanout 単体層でエッジ横断を担保)

## Q3. ラベル是正(S2→S1 / P1→P0 疑義)の扱い

クロスレビュー両名がラベル定義との不整合(「恒久停止・回避策なし」は S1-FATAL/P0 の語義)を指摘しています。本 intent のスコープに含めますか。

A. 本 intent 対象外。ラベル変更はユーザーの GitHub 操作事項として requirements の Out of scope に記載
B. 本 intent の完了条件に含める(クローズ前にラベルを S1/P0 へ変更)
X. Other (please specify)

[Answer]: A(本 intent 対象外。Out of scope に記載)

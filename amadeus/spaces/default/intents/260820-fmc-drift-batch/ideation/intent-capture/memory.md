# Stage Diary — intent-capture

## Interpretations

- 2026-08-20T07:20:00Z — issue-first の self-feature intent として、#3186/#2289/#2929/#3187 の4件を1 intent に束ねると解釈; ユーザーが本セッションの実 HUMAN_TURN でバッチ構成(選択肢1)と full grant を明示指示。クロスレビューは #3186(REFRAME 済み改訂)、#2289/#2929(本セッションで ESTABLISHED_WITH_REFINEMENTS)成立済み、#3187 はユーザー裁定(退役)成立済み。

## Deviations

- 2026-08-20T07:20:00Z — TaskUpdate によるステージタスク遷移は本ハーネスセッションに Task 管理ツールが存在しないため省略; 状態同期は engine の report 経路が担う。

## Tradeoffs

- 2026-08-20T07:20:00Z — 質問フローは Intent Autonomy full の宣言待ち; full 成立後は decide-question 梯子で解決し、mode 選択質問は人間へ提示しない(§3 semi/full 規定)。grant の PROVENANCE_REQUIRED により人間の実ターンを1回だけ要する。

## Open questions

- 2026-08-20T07:20:00Z — #2289 の FR-010 replace 意味論のユーザー裁定(クロスレビュー申し送り)は、本 intent のバッチ承認(選択肢1、実 HUMAN_TURN)を replace-by-name 追加の裁定として requirements-analysis で明文化する予定; 矛盾があれば requirements で再エスカレーション。

## §13 記録

- 2026-08-20T07:27:10Z — §13 学習選定選挙 E-260820-FMC-IC-S13 が 2-0(両票 GoA 1)で「0件で可」established; 3候補とも session固有/既存規則の重複と両票が独立判定。persist なし。record: amadeus/spaces/default/elections/260820-e-260820-fmc-ic-s13/record.md

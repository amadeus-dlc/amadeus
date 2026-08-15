# Intent Capture — Questions(intent 260815-rfc-autonomy-modes)

> 承認: 2026-08-15T15:35:00Z — full 梯子 AUTO_DECIDED auto-decision-bda7cf4174bdc74e682844e2a9023af5(定型 4 問は承認済み RFC-0001 から一意導出 — 既決事項の再質問回避、cid:requirements-analysis:c5)。回答の一次資料は `amadeus/spaces/default/specs/rfc/0001-intent-autonomy-modes.md`(status: approved、approved-by: j5ik2o、approval-ref: 2026-08-15 実 HUMAN_TURN 付録 A 指示 8)。

## Q1: What business problem are we solving?

- A. Intent Autonomy Mode の実装が宣言と乖離し、機構起因の人間停止・空振り・縮退進行を生んでいる
- B. 新しい autonomy 軸の追加
- C. UI の改善
- X. Other

[Answer]: A — RFC Motivation の実測(人間停止の大半が判断の難しさでなく機構側理由: semi の権限範囲に milestone 種が構成上不在の 172 件、full 宣言と projection の乖離、§13 の 0 件確認選挙 79 件)+ コンセプト適合性監査の逸脱 D1〜D11。

## Q2: Who is the customer? What pain?

- A. Amadeus を運用するユーザー(=本人)と、その代理で回る conductor/エージェント群
- B. 外部エンドユーザー
- X. Other

[Answer]: A — ユーザーは「full なのになぜ質問するのか」(#2899/#2974)類の是正を繰り返し要求。conductor は膠着(D5)・park 制限逆転(D1)・縮退進行(D4)に直面する。

## Q3: What does success look like? What metrics matter?

- A. RFC-0001 のモード定義どおりに全裁定点が動く(full = 推奨一意なら自動、非一意は対話裁定/非対話中断。semi = full + 人間ゲート 2 種のみ)。bound-surfaces の実装が RFC と一致し、機構起因の人間停止クラス(付録 B の 172 件・79 件クラス)が構造的に消える
- B. 停止回数の削減のみ
- X. Other

[Answer]: A — 受け入れの正本は RFC の Guide/Reference-level 説明と D1〜D11 の解消。人間専権(仕様変更・選挙 hold・マージ)の境界は不変であること。

## Q4: What is the trigger for this initiative?

- A. RFC-0001 承認(2026-08-15)と Q16 裁定「単一 full intent で実装」— 実装待ちの approved RFC
- B. 障害対応
- X. Other

[Answer]: A — 先行 RE(autonomy-refactor worktree)は並行修正(#3099/#3101/#3113)との bound-surfaces 交差により破棄・仕切り直し。本 intent が最新 main 断面から再開する(リカバリ計画ステップ 5)。

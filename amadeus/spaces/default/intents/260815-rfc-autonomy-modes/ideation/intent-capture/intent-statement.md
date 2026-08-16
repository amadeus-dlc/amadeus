# Intent Statement — RFC-0001 Intent Autonomy Modes の実装

> 一次資料: `amadeus/spaces/default/specs/rfc/0001-intent-autonomy-modes.md`(status: approved, version 1, approved-by j5ik2o 2026-08-15)。本 intent はその実装であり、要求の再発明をしない。ミラー Issue: #3116(tracking-issue として RFC frontmatter へ記入する — 実装 Bolt で同梱)。

## Problem Statement

Intent Autonomy Mode(none / semi / full)の現行実装が RFC-0001 の再定義と乖離している。実測(RFC 付録 B — intent record 179・選挙 441)では、人間停止の大半が判断の難しさではなく機構起因: (1) semi の権限範囲に milestone 種が構成上不在なことによる人間行き 172 件(phase-gate 106 / walking-skeleton 66、同一ゲート最大 5 回の重複発火・空振り含む) (2) full 宣言と projection の乖離による全ゲート人間化 (3) §13 の 0 件確認選挙 79 件。さらにコンセプト適合性監査(付録 C)で D1〜D11 の 11 逸脱(park 制限の逆転、外部ゲート待ち膠着、縮退進行、mode 外設定軸の混在、対話 full の人間裁定経路不在ほか)。

## Target Customer

- **ユーザー(j5ik2o)**: 「full なのになぜ質問するのか」(#2899/#2974)の是正 — 宣言どおりの自律性と、真に人間の判断が要る 1 割未満の面(仕様変更・選挙 hold・マージ)だけが人間へ届く体験
- **conductor / エージェント**: 膠着・空振り・縮退進行のない裁定順序(専権判定 → 推奨一意なら自動 → 非一意は対話裁定 or 記録つき中断)

## Success Metrics

- RFC の Guide-level モード定義どおりの挙動: full = 全裁定点が推奨選択で進み、非一意のみ人間(対話)/中断(非対話)。semi = full + フェーズ境界・walking-skeleton の 2 ゲートのみ人間承認。none = 現行どおり
- D1〜D11 の各逸脱が解消され、それぞれ落ちる実証つきテストで pin される
- 付録 B の機構起因停止クラス(172 件・79 件クラス)が構造的に発生し得ない
- 人間専権境界(仕様変更・goal 改訂・選挙 hold・委任条件外マージ)の無退行
- bound-surfaces(RFC frontmatter 列挙)の実装と RFC 記述の一致(文書検査)

## Initiative Trigger

RFC-0001 の承認(2026-08-15、実 HUMAN_TURN)と Q16 裁定「単一 full intent で実装」。先行 RE(autonomy-refactor worktree、未コミット)は並行着地(#3099/PR #3105・#3101・#3113)との bound-surfaces 交差で破棄済み — 本 intent が最新 main(`2eb94f1e39e` 以降)断面から RE 差分リフレッシュで仕切り直す(リカバリ計画 260815 ステップ 5)。

## Initial Scope Signal

`self-feature`(既存挙動の意図的変更 = 新仕様の実装。walking-skeleton gate は最初の Construction Bolt に維持)。単一 intent・複数 Unit 想定(bound-surfaces が広いため units-generation / delivery-planning を EXECUTE)。

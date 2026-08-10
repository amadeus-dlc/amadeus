# Stakeholder Map — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: intent-capture (1.1)

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない)。intent-statement.md と同じ一次入力(#2785・クロスレビュー2件・質問票回答)に基づく。

## 主要ステークホルダーと関心

| ステークホルダー | 種別 | 関心 |
|---|---|---|
| リポジトリオーナー(j5ik2o) | 意思決定者 | grilling の深掘り価値の回復。Rust ナレッジ起草(直近の実需)を dogfood として完走できること。#2063 で得たセッション長の有界性を全損しないこと |
| Amadeus 開発チーム(本 repo の conductor/エージェント) | 一次利用者 | 全ステージのゲート対話(Grill me)と standalone 議論の実用性。質問ファイル・監査契約の互換維持 |
| Amadeus 導入外部チーム | 二次利用者 | 全ハーネスで同一の grilling 体験。standalone Free 既定 = 上流 grilling と同一挙動という予測可能性 |
| 上流(mattpocock/skills、MIT) | 骨格の出典 | 帰属表示の維持(MIT・取り込み SHA 記録)。逐語骨格採用により将来の上流進化へ差分追随可能 |
| #2683(depth 制御全体アーキテクチャ)の裁定 | 隣接イニシアチブ | 本 intent は L2(質問上限)面を単独で変更する — 着地後に #2683 へ反映報告する(Q1 裁定)。局所最適の防止という親 Issue の目的と整合させる責務は本 intent 側が負う |
| #2063 / #1999 の既決裁定 | 既存契約 | 動機(無上限質問生成によるセッション長時間化の抑止)は回路遮断器+枝刈り閾値として引き継ぐ。t415 の逐語 pin は無断で壊さず仕様裁定とセットで明示改訂 |

## 意思決定者と影響者

- **意思決定者**: ユーザー(リポジトリオーナー)。ステージゲート承認・仕様裁定(要件段の未決3点)・PR マージはすべてユーザー(autonomy = none、ソロ運用)。
- **影響者**: クロスレビュー2名の verdict(REFRAME 済み・要件段への裁定委譲事項を明示)、上流リポジトリの設計(骨格の正)、question-budget センサー・t415 等の機械契約(変更コストの実態を規定)。

## コミュニケーション要件

- 仕様変更の裁定はエスカレーション正準リスト(4)によりすべてユーザーへ AskUserQuestion で諮る(autonomy none)。
- 要件段の未決3点((a) Free の語彙上の位置づけ (b) §8 との緊張一意化 (c) semi 除外契約)は requirements-analysis の質問票で裁定を取る。
- 着地時: #2785 クローズ判定(close-after-landing-verification)、#2683 への L2 変更反映コメント、ミラー Issue #2792 は record→Issue の一方向同期。

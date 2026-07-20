# Logical Components — U1 tie-choice-resolution

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md — 論理構成は business-logic-model.md の2フロー(受理/render)を実装ブロックへ対応付け、各ブロックの NFR 担当(P/S/SC/R)を明記して NFR→コードの写像を一枚にする(全14件 = P3+S4+SC3+R4 の個数機械照合済み — 下表の担当列に全コード出現)。

## 構成(election.ts 内)

| ブロック | 内容 | 担当 NFR |
| --- | --- | --- |
| parseChoiceResolution(新規 module 純関数) | regex 1回+Number(unit テスト対象) | P-1、S-1(一段目) |
| handleHoldResolved tie 分岐(新規 if 側) | 実在照合+resumedTo="tallied"+fail(valid 列挙) | P-2、S-1(二段目)、S-4、SC-2、R-4 |
| handleHoldResolved else 側(移設) | 現行テーブル検証の字句移設 | R-2(不変保証) |
| DURABLE append〜遷移(無変更) | 既存ブロック | R-1、S-2、SC-1(選挙1件のみの load/append — store 本数非依存) |
| handleRender override 合成(拡張) | choice 分岐+label find | P-3、FR-3 |
| SKILL.md 3面(docs) | 使い分け1行 | (機能面 — FR-4) |
| (変更なしの確認事項 — コードブロック非対応) | S-3: 新規外部境界・秘匿情報アクセスなし(変更面全体の構造属性) / SC-3: SLO 機構 N/A(単発 CLI — 追加ブロックなしがその実装形) | S-3、SC-3 |
| store sweep(build-and-test 工程 — 本 unit のコードブロック外) | 実装時点 worktree glob 全数の load/verify 実測(reliability-design R-3 の検証手順) | R-3 |

## 依存方向

新規ブロックは model(Choice 読取)のみに依存 — record.ts/store.ts へ依存追加なし(AD ADR-2 の構造保証を ND 粒度で再確認)。循環なし。

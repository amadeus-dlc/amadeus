# Scope Document：Amadeus skill 英語化実施計画

## 対象

この Intent は、Amadeus skill 英語化を小さい土台 PR から段階的に進めるため、#399 の子 Issue と残り `SKILL.md` 全面英語化の完了までを追跡する。

対象に含める Issue と rollout unit は、#395、#400、#401、#402、#391〜#394、RU002〜RU006 である。

## 最小スコープ

#395、#400、#401、#402 の順序、依存関係、完了証拠を追跡できる計画成果物を作る。

この Intent は、子 Issue の完了と Amadeus 系 `SKILL.md` の全面英語化完了までを対象に含める。

子 Issue の完了は、対応 PR の merge または明示的な Issue close で観測する。

## 順序

| 順序 | Issue | 目的 | 依存 |
|---:|---|---|---|
| 1 | #395 | Amadeus skill の SKILL.md 英語化方針と注意事項を定義する。 | なし |
| 2 | #400 | 代表 skill で SKILL.md 英語化の小さい土台 PR を作る。 | #395 |
| 3 | #401 | 英語化後の AI-DLC v2 差分対応順序を #391〜#394 に反映する。 | #400 |
| 4 | #402 | 残り Amadeus skill の段階的英語化単位を決める。 | #401 |

## 対象外

| 対象外 | 理由 |
|---|---|
| 残り skill 英語化の一括実施 | 小さい土台 PR から段階的に進める方針と衝突するため。 |
| 英語化そのものの一括実施 | 小さい土台 PR から段階的に進める方針と衝突するため。 |
| Operation phase skill の実装 | Amadeus scope 外であるため。 |

## 完了証拠

| Issue | 完了証拠 |
|---|---|
| #395 | 対応 PR の merge または明示的な Issue close |
| #400 | 対応 PR の merge または明示的な Issue close |
| #401 | 対応 PR の merge または明示的な Issue close。#391〜#394 の扱いが追跡できること。 |
| #402 | 対応 PR の merge または明示的な Issue close |
| #391、#393、#392、#394 | 対応 PR の merge、明示的な Issue close、または対象外判断 |
| RU002〜RU006 | 対象 skill、昇格フロー、検証結果を含む英語化 PR の merge |
| #399 | B005〜B010 の完了証拠がそろっていること |

## 制約

- 日本語生成成果物契約を維持する。
- source skill から昇格先成果物への反映は昇格フローを使う。
- PR 作成後は CI、レビューボット、コメントを監視する。
- merge は人間が行う。

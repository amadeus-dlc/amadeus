# G003: Unit の境界戦略と粒度

## 概要

- 状態: completed
- 反映先: [units-generation/unit-of-work.md](units-generation/unit-of-work.md)

Units Generation で、Unit の境界戦略と粒度を確定した。
実行指示により人間への逐次質問を行わず、推奨回答を実行指示による事前承認として確定した。

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD008 | Unit の境界戦略はドメイン領域別にし、glossary の 3 領域（商品選択、注文作成、在庫参照）を境界にする | active | [units-generation/unit-of-work.md](units-generation/unit-of-work.md) | |
| GD009 | 粒度は粗くし、3 Unit に留める | active | [units-generation/unit-of-work.md](units-generation/unit-of-work.md) | |

## 質問記録

### Q001

- 確認したいこと: Unit の境界戦略はどれか（サービス別、機能別、ドメイン別、デプロイ対象別）。
- 確認が必要な理由: Unit 境界は Construction の設計、実装、Bolt の束ね方の基礎になる。
- 推奨回答: ドメイン領域別にする。
- 推奨理由: glossary の 3 領域が要求とコンポーネントの境界（GD005〜GD007）と一致しており、技術レイヤーによる分割を避けられる。
- ユーザー回答: 実行指示による事前承認（推奨回答を採用）。
- 確定判断: GD008

### Q002

- 確認したいこと: 粒度はどちらに寄せるか（粗い、細かい）。
- 確認が必要な理由: 粒度は Unit ごとの設計、レビュー、進捗管理のコストを左右する。
- 推奨回答: 粗くする（3 Unit）。
- 推奨理由: 単独開発者の feature スコープであり、細分化は依存管理のコストだけを増やす。
- ユーザー回答: 実行指示による事前承認（推奨回答を採用）。
- 確定判断: GD009

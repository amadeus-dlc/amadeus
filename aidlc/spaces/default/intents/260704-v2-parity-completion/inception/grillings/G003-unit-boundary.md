# G003：Unit 境界戦略と粒度

## 概要

- 状態: completed
- 対象: Intent `260704-v2-parity-completion` の Units Generation
- 反映先: [unit-of-work.md](units-generation/unit-of-work.md)

夜間自律進行の事前指示（構築まで自動承認、質問最小化）に基づき、推奨案を自動確定した。

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD012 | Unit 境界は機能単位（成果のまとまりでコンポーネントを束ねる）とし、粒度は粗め 8 Unit にする。技術レイヤでの分割はしない | active | units-generation/unit-of-work.md | なし |

## 質問記録

### Q001

- 確認したいこと: Unit 境界戦略と粒度。
- 確認が必要な理由: Bolt 計画と walking skeleton の境界に効く。
- 推奨回答: 機能単位、粗め 8 Unit。
- 推奨理由: 各 Unit が独立に検証できる成果（エンジン動作、結線、skill 一覧、検査 green など）に対応し、requirements との対応が単純になる。
- ユーザー回答: 推奨案を採用（事前の包括承認による自動確定）。
- 確定判断: GD012

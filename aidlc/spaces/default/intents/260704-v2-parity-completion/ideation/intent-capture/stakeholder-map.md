# Stakeholder Map：260704-v2-parity-completion

## 利害関係者

| 利害関係者 | 関心 | 役割 |
|---|---|---|
| Amadeus 本体開発者（Maintainer） | 散文駆動入口のコンテキスト消費と不安定さの解消、本家乖離の追跡コスト削減 | 決定者 |
| 将来の利用チーム | 本家互換の導入体験、日本語の記述系成果物 | 影響者 |
| 本家 awslabs/aidlc-workflows | 上流仕様の変更がパリティ検査の基準を動かす | 影響者（上流） |

## コミュニケーション要件

- gate 承認と skill 処遇の最終判断は Maintainer が行う。
- 本家参照は branch 名でなく commit を記録し、パリティ検査の基準 commit を成果物に残す。
- 判断の経緯は Issue #396 のコメントと本 record の audit で追跡できるようにする。

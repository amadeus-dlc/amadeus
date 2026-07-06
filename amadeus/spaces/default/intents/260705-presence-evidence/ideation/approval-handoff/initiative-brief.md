# Initiative Brief（260705-presence-evidence）

対象 Issue: [#506](https://github.com/amadeus-dlc/amadeus/issues/506)

## 概要

docs-only 宣言の evidence 検証に presence 相関を足すか否かを、実測に基づく材料で判断し（契約級 = 人間個別確認）、採用なら eval 先行実装・不採用なら設計境界の文書化で完了する。

| 領域 | 要点 | 出所 |
|---|---|---|
| 課題 | evidence の自作可能性（Bugbot 指摘） | [intent-statement.md](../intent-capture/intent-statement.md) |
| 解決範囲 | 既存資産の内側（ledger 再利用 or 文書化）に限定 | [build-vs-buy.md](../market-research/build-vs-buy.md) |
| 主要発見 | 実測 1 = 転記 evidence の先行 HUMAN_TURN 不在（候補 1 は mint 規律拡張とセットでのみ成立）、実測 2 = 同秒ティアで秒窓相関化 | [feasibility-assessment.md](../feasibility/feasibility-assessment.md) |
| 構造 | 採否 gate 分岐の単一 PR。BL-3（mint 規律拡張）は条件付き | [scope-document.md](../scope-definition/scope-document.md) |
| 体制 | engineer2 単独、採否のみ個別確認、Construction 前ピア連絡 | [team-assessment.md](../team-formation/team-assessment.md) |

## Inception への引き渡し

- requirements-analysis で採否判断の材料を要求として整理し、**gate で人間の個別確認**を得る（auto 例外）。
- 判断材料の中核: 3 候補 × 実測 2 件 × 論点 3 件の突き合わせ表。

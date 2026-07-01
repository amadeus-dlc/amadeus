# Domain Entities

## 目的

U002 の Domain Entity は、policy 参照、検出候補、人間判断対象を分けて扱う。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Policy Reference | Intent 成果物または PR 説明から参照する policy path を表す。 | BR001 |
| DE002 | Detection Candidate | validator または evaluator で検出できる候補を表す。 | BR002, BR003 |
| DE003 | Human Judgment Boundary | merge 可否、例外妥当性、人間承認を機械検査から分離する境界を表す。 | BR004 |

## 関係

Policy Reference は Detection Candidate の入力になる。

Detection Candidate は validator または evaluator の責務に分かれる。

Human Judgment Boundary は Detection Candidate に含めない判断を明示する。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| BC001 自己開発運用 | Domain Map | policy 参照と検出境界を BC001 内の運用判断として扱う。 | 既存 BC001 の役割内に収まるため、Domain Map の新規行は追加しない。 | [domain-map.md](../../../../../domain-map.md) |
| Context Map | Context Map | 新しいコンテキスト間依存は導入しない。 | Context Map は更新しない。 | [context-map.md](../../../../../context-map.md) |

## 未確認事項

- なし。

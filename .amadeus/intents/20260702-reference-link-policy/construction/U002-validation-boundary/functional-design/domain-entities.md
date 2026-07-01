# Domain Entities

## 目的

U002 の Domain Entity は、PR記録と検出境界を表す概念を扱う。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Construction Completion State | Construction の完了状態または gate passed を表す。 | BR001 |
| DE002 | Pull Request Record | Bolt ごとの `pr.md` と Pull Request 参照を表す。 | BR001, BR002 |
| DE003 | GitHub Pull Request Link | `[PR #nnn](https://github.com/<owner>/<repo>/pull/<nnn>)` 形式のリンクを表す。 | BR002, BR003, BR004 |
| DE004 | Detection Boundary | validator、eval、人間判断の分担を表す。 | BR005, INV001 |

## 関係

Construction Completion State は Pull Request Record を必須にする条件である。

Pull Request Record は GitHub Pull Request Link を含む。

GitHub Pull Request Link は `pr.md` と `construction/traceability.md` の PR 欄で使われる。

Detection Boundary は、構造的に検出できる条件を validator へ割り当てる。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| BC001 自己開発運用 | Domain Map | PR記録欠落検出を BC001 内の成果物品質ルールとして扱う。 | 既存 BC001 の役割内に収まるため、Domain Map の新規行は追加しない。 | [domain-map.md](../../../../../domain-map.md) |
| Context Map | Context Map | 新しいコンテキスト間依存は導入しない。 | Context Map は更新しない。 | [context-map.md](../../../../../context-map.md) |

## 未確認事項

- なし。

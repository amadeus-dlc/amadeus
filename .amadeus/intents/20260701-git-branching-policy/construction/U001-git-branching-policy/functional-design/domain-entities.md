# Domain Entities

## 目的

U001 の Domain Entity は、Git ブランチ戦略 policy の構成要素と責務境界を扱う。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Git Branching Policy | Git ブランチ戦略の長期方針、branch lifecycle、例外、参照方針を保持する。 | BR001, BR002 |
| DE002 | Working Branch | Issue または phase に対応する Agent の作業 branch を表す。 | BR003 |
| DE003 | Branch Lifecycle | branch 作成、`origin/main` 追従、PR 作成前検証、merge 後処理を一連の判断として扱う。 | BR003, BR004 |
| DE004 | Operational Instruction Boundary | AGENTS.md の操作指示と steering policy の長期方針の分担を表す。 | BR005 |

## 関係

Git Branching Policy は Branch Lifecycle を定義する。

Working Branch は Branch Lifecycle に従って作成、更新、PR 化される。

Operational Instruction Boundary は、AGENTS.md と Git Branching Policy の重複を抑える。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| BC001 自己開発運用 | Domain Map | Git ブランチ戦略 policy を BC001 内の運用 policy として扱う。 | 既存 BC001 の役割内に収まるため、Domain Map の新規行は追加しない。 | [domain-map.md](../../../../../domain-map.md) |
| Context Map | Context Map | 新しいコンテキスト間依存は導入しない。 | Context Map は更新しない。 | [context-map.md](../../../../../context-map.md) |

## 未確認事項

- なし。

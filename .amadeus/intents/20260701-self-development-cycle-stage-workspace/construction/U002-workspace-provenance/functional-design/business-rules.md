# Business Rules

## 目的

workspace provenance の業務ルールを、Task 生成と実装判断の根拠として固定する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | build workspace と target workspace を同じ意味で扱わない。 | R003、U002 Unit Design Brief | active |
| BR002 | provenance は、path、commit、利用 skill、validator、開発用スクリプト、stage 判定、人間判断から追跡できるようにする。 | R003、R004 | active |
| BR003 | PR 準備条件には、validator と標準検証結果の記録を含める。 | R004、B002 | active |

## 例外

- 利用した開発用スクリプトがない場合は、`なし` と記録してよい。
- PR 作成前は PR URL が存在しないため、`pr.md` は作らず、PR 作成後に追記する。

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | 対応する GitHub Issue と対象 Intent が存在する。 | R003 | active |
| INV001 | 不変条件 | build workspace、host environment、target workspace、target artifacts は別概念として扱う。 | R003、BR001 | active |
| POST001 | 事後条件 | PR 準備条件から workspace 対応記録と検証結果を追跡できる。 | R003、R004 | active |

## 未確認事項

- machine-readable evidence の導入は、この Bolt では行わない。

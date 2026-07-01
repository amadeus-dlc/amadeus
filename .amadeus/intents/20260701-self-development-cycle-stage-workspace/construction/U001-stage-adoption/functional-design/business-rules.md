# Business Rules

## 目的

stage 採用判断の業務ルールを、Task 生成と実装判断の根拠として固定する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | stage2 は Maintainer の承認なしに次回 stage0 として扱わない。 | R002、U001 Unit Design Brief | active |
| BR002 | stage0 採用条件には、対象 PR の merge、基準 commit、build workspace の参照 commit、人間判断を含める。 | R001、R002 | active |
| BR003 | stage 判定語彙は `.amadeus/glossary.md` と `.amadeus/steering/policies.md` から追跡できるようにする。 | R001、B001 | active |

## 例外

- PR が merge 済みでも、build workspace が merge 後の基準 commit を参照していない場合は、次回 stage0 として扱わない。
- validator または標準検証が未確認の場合は、stage0 採用判断の証拠不足として扱う。

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | 対象 PR と対象 Intent が追跡できる。 | R002 | active |
| INV001 | 不変条件 | stage2 は Maintainer の承認なしに stage0 へ自動昇格しない。 | R002、BR001 | active |
| POST001 | 事後条件 | stage0 採用判断の条件と証拠が `.amadeus/` または PR 説明から追跡できる。 | R002、R004 | active |

## 未確認事項

- stage0 採用判断の machine-readable evidence 形式は、この Bolt では導入しない。

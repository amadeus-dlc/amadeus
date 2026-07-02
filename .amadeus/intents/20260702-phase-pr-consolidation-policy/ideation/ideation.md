# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | gate の判定は phase ごとに `state.json` で行われており、PR の単位と独立している。統合 PR にしても validator の phase 状態検証（gate、必須成果物）は state で成立する。雛形生成（Intent 20260702-state-json-scaffolding）により、複数 phase 分の state 更新を 1 branch でまとめても構造 fail が起きにくい前提が整っている。 |
| 運用 | feasible | 直近の cycle 観察では、2 Intent の完走に phase PR 13 本と人間 merge 13 回を要し、内容の作成よりも merge 待ちが律速だった。docs-only の Intent で Ideation から Inception までを 1 PR に統合できれば、往復を大きく減らせる。 |
| セキュリティ | feasible | steering policy の文書変更のみで、実行時入力や権限を扱わない。 |
| 依存 | feasible | Git Branching Policy（Intent 20260701-git-branching-policy）が branch 命名と PR 運用の定義元であり、整合確認の対象が明確である。docs-only 変更の統合判断は、レビュー支援契約の粒度制約（skill 変更 PR の構成）と矛盾しない形で定義する必要がある。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | 統合を許可する条件の強度と、統合 PR の merge 判断を行う。 |
| Agent | 実行者 | 統合条件に該当する Intent で、phase 成果物を 1 branch にまとめて PR 化する。 |
| Reviewer | 参照者 | 統合 PR の説明から、含まれる phase 成果物と gate の状態を判断する。 |
| Validator | 構造検出者 | 統合後も phase ごとの state 検証（gate、必須成果物）を成立させる。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | 統合条件の判定から、統合 PR の作成、記録、phase ごとの gate 判定までの流れを示す。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- 統合を許可する条件の最終形（条件候補 3 件を必須にするか、一部を推奨にするか）は Inception で判断する。
- 統合単位の境界（どの phase まで 1 PR に統合できるか）は Inception で判断する。
- 統合 PR の branch 命名（`codex/issue-<n>-<phase>` との整合）は Inception で判断する。
- policy の記載先（Git Branching Policy への追記か、新しい policy 文書か）は Inception で判断する。

## 学習候補

- 小さい Intent の律速は内容の作成ではなく PR の往復と merge 待ちであり、phase gate の判定単位（state）と PR の単位を分離すれば、gate を弱めずに往復を減らせる。
- 統合の許可条件は、scaffold-only の許可条件（確定判断の記録の実在）と同じ型で書けるため、判定の語彙を揃えると契約が読みやすくなる。

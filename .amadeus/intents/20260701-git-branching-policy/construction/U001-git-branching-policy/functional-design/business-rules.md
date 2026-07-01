# Business Rules

## 目的

U001 の業務ルールは、Git ブランチ戦略 policy の配置、branch lifecycle、操作指示との責務分担を固定する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | `.amadeus/steering/policies.md` は Git ブランチ戦略の概要と個別 policy への導線を扱う。 | [U001 Unit Design](../../../inception/units/U001-git-branching-policy/design.md) | adopted |
| BR002 | `.amadeus/steering/policies/git-branching.md` は branch lifecycle の具体ルールを扱う。 | [B002](../../../inception/bolts/B002-branch-lifecycle-rules.md) | adopted |
| BR003 | Agent の作業 branch は `codex/` prefix を既定にし、`origin/main` を基点に作る。 | [B002](../../../inception/bolts/B002-branch-lifecycle-rules.md) | adopted |
| BR004 | merge 操作は人間に委譲し、Agent は merge 後に最新の `origin/main` へ追従して次作業へ進む。 | [U001 Unit Design](../../../inception/units/U001-git-branching-policy/design.md) | adopted |
| BR005 | AGENTS.md は実行操作指示を扱い、steering policy は Intent 成果物から参照する長期方針を扱う。 | [R003](../../../inception/requirements/R003-agents-policy-responsibility.md) | adopted |

## 例外

docs-only または緊急修正でも、例外理由は PR 説明または対象 Intent の traceability に残す。

既存 worktree と branch の所有が衝突する場合は、最新の `origin/main` から新しい作業 branch を作り、他作業の branch を流用しない。

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | 対応する GitHub Issue または対象 Intent がある。 | [R001](../../../inception/requirements/R001-policy-placement.md) | adopted |
| PRE002 | 事前条件 | 作業 branch の基点として使う `origin/main` が取得済みである。 | [R002](../../../inception/requirements/R002-branch-lifecycle.md) | adopted |
| POST001 | 事後条件 | PR と対象 Intent が対応付けられ、検証結果を追跡できる。 | [R002](../../../inception/requirements/R002-branch-lifecycle.md) | adopted |
| INV001 | 不変条件 | Agent は merge 操作を実行しない。 | [U001 Unit Design](../../../inception/units/U001-git-branching-policy/design.md) | adopted |

## 未確認事項

- なし。

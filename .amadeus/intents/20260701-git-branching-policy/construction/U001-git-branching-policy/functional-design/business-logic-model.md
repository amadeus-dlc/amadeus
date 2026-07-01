# Business Logic Model

## 目的

U001 は、Amadeus 本体の自己開発で使う Git ブランチ戦略 policy の配置と branch lifecycle を扱う。

この Functional Design では、`.amadeus/steering/policies.md` を概要と導線、`.amadeus/steering/policies/git-branching.md` を具体ルールの管理元として分ける。

## 対象 Unit

- U001 Git ブランチ戦略 policy

## 業務ロジック

1. 対応する GitHub Issue を作業の起点にする。
2. Agent の作業 branch は `origin/main` を基点にし、`codex/` prefix を使う。
3. 1つの Issue でも phase ごとに別 PR が必要な場合は、phase または目的が分かる branch 名へ分ける。
4. PR 作成前に対象 Intent の validator と標準検証を実行し、証拠を Intent 成果物または PR 説明に残す。
5. merge 操作は人間に委譲し、merge 後は最新の `origin/main` を取得して次の作業 branch を切る。

## 入力

- GitHub Issue
- 対象 Intent
- `origin/main` の commit
- target workspace
- PR URL
- CI 結果
- review comment
- merge 状態

## 出力

- Git ブランチ戦略 policy の概要
- 個別 policy への導線
- branch lifecycle の判断基準
- AGENTS.md と steering policy の責務分担
- docs-only または緊急修正の例外判断

## 未確認事項

- なし。

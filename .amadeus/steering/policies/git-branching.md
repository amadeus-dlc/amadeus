# Git Branching Policy

## 目的

この policy は、Amadeus 本体の自己開発で使う Git ブランチ戦略を扱う。

Intent 成果物、PR 説明、review 対応から参照できる長期方針として、branch 作成、`origin/main` 追従、PR 作成前検証、merge 後処理を定義する。

## 対象

- Amadeus 本体リポジトリの target workspace。
- GitHub Issue 起点の自己開発作業。
- Ideation、Inception、Construction など、Intent phase ごとの PR 作成。
- Agent が作業 branch を作成、更新、push、PR 化する場面。

## 責務分担

AGENTS.md は、現在の作業環境で Agent が従う操作指示を扱う。

この policy は、Amadeus DLC 成果物から参照する Git ブランチ戦略の判断基準を扱う。

両者が重なる場合は、AGENTS.md の操作指示を実行上の制約として守り、この policy を Intent 成果物での説明と追跡の参照先として使う。

## Branch Lifecycle

### 起点

作業は GitHub Issue または対象 Intent を起点にする。

Issue がある場合は、branch 名、PR 説明、Intent traceability のいずれかから Issue を追跡できるようにする。

### 基準 branch

基準 branch は `main` である。

Agent が作業 branch を作る前に、`origin/main` を取得する。

作業 branch は、最新の `origin/main` を基点に作る。

### branch 名

Agent が作る branch は `codex/` prefix を既定にする。

branch 名には、Issue 番号または Intent の目的が分かる短い語を含める。

同じ Issue でも phase や目的が異なる PR は、別 branch として扱う。

例は次である。

```text
codex/issue-254-ideation
codex/issue-254-inception
codex/issue-254-construction
codex/issue-254-specification
```

`codex/issue-<n>-specification` は、phase PR の統合条件を満たす場合に仕様側（Discovery〜Inception）の成果物をまとめる branch に使う。

### 追従

PR 作成前に `origin/main` との差分を確認する。

作業 branch が単独所有で、review 文脈を壊さない場合は rebase を選べる。

複数の作業者または review が関わる branch では、履歴を書き換える前に人間判断を挟む。

作業 branch へ merge commit を入れる運用は既定にしない。

fast-forward は、ローカル branch が単に `origin/main` に遅れている場合の追従手段として扱う。

### PR 作成前検証

PR 作成前に、対象 Intent の validator を実行する。

標準検証として `npm run test:all` を実行する。

検証結果は、対象 Intent の `test-results.md`、traceability、または PR 説明から追跡できるようにする。

検証を省略する場合は、理由と後続確認先を PR 説明または対象 Intent の成果物に残す。

### PR 作成

PR は対応 Issue と対象 Intent をリンクする。

PR タイトルと説明文は日本語で書く。

PR 説明には、対象 Issue、対象 Intent、変更範囲、検証結果を含める。

必要に応じて、この policy への参照を含める。

### phase PR の統合

PR の既定の単位は phase ごととする。

次の 3 条件をすべて満たす場合だけ、仕様側の phase 成果物（Discovery、Ideation、Inception）を 1 つの PR に統合してよい。

- 対象 Intent の実行スコープが `refactor` または docs 系である。
- 変更対象が文書だけであり、実装コードとテストコードを含まない。
- Ideation の未確定事項が、事前の grilling または Issue の確定判断で解消済みである。

統合できる範囲は仕様側（Discovery〜Inception）に限る。
Construction 実装は Task Generation Gate の人間承認を挟むため、finalization は merge イベントを挟むため、いずれも従来どおり別 PR とする。

統合 PR の説明には、次を明記する。

- 含まれる phase 成果物の一覧。
- 各 phase の gate 状態。

gate の判定は phase ごとに `state.json` で行う。
PR の統合は gate の統合を意味しない。

統合の対象は仕様成果物（`.amadeus/**` の文書）である。
skill 変更を含む PR は、[steering policies](../policies.md) の粒度制約に従い、この統合の対象外とする。

統合 branch の途中で grilling が必要な未確定事項が見つかった場合は、統合条件を満たさなくなるため、その phase までで PR を区切り、以降は既定に戻る。

### PR 監視

PR 作成後は CI を先に確認する。

CI エラーがある場合は、review comment より先に CI エラーを解消する。

review comment は、Issue と Intent の範囲に合うかを判断してから対応する。

目的と異なるが有効な指摘は、後続 Issue 候補として扱う。

### merge

merge 操作は人間が行う。

Agent は merge を実行しない。

merge 可否、例外の妥当性、人間承認は、人間判断として扱う。

### merge 後処理

merge 後に作業を続ける場合は、最新の `origin/main` を取得する。

次の作業 branch は、merge 後の `origin/main` を基点に新しく作る。

merge 済み PR の branch を、次の Issue または次の phase の作業 branch として流用しない。

## 例外

docs-only 変更でも、対象 Issue または対象 Intent と対応している場合は通常の branch lifecycle に従う。

緊急修正で通常の検証を完了できない場合は、未実行の検証、理由、後続確認先を PR 説明または対象 Intent の成果物へ記録する。

既存 worktree と branch の所有が衝突する場合は、他の作業 branch を流用せず、最新の `origin/main` から新しい branch を作る。

## policy 参照

対象 Intent の traceability では、branch lifecycle に関係する Task または証拠からこの policy を参照する。

acceptance では、要求が Git ブランチ戦略に関係する場合だけ、この policy を証拠の一部として参照する。

PR 説明では、branch 戦略そのものが変更対象、または例外運用を説明する必要がある場合にこの policy を参照する。

## 検出境界

validator で検出する候補は、実行時に参照できる構造条件に限定する。

候補は次である。

- 必須成果物 path が存在すること。
- Intent traceability から必要な成果物を参照できること。
- `state.json` と成果物の phase、status、required artifacts が整合していること。

evaluator で検出する候補は、文書内容の説明不足や論理不整合に限定する。

候補は次である。

- PR 説明に対象 Issue、対象 Intent、検証結果が不足していること。
- branch lifecycle の説明が policy と矛盾していること。
- 例外理由があるのに、後続確認先が記録されていないこと。

人間判断に残す候補は次である。

- merge 可否。
- 例外理由の妥当性。
- review comment を現在の Intent で扱うか、後続 Issue にするか。
- stage0 採用判断。

validator の `pass` は、実行時に参照できる最低限の構造条件を満たすという意味である。

内容承認や merge 承認として扱わない。

## 根拠

- [Issue #254 Intent](../../intents/20260701-git-branching-policy.md)
- [U001 Unit Design](../../intents/20260701-git-branching-policy/inception/units/U001-git-branching-policy/design.md)
- [U002 Unit Design](../../intents/20260701-git-branching-policy/inception/units/U002-policy-traceability-validation/design.md)

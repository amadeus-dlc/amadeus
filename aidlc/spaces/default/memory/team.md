# チームの働き方

この文書は、チームの働き方を扱う。
org.md の既定を上書きし、project.md に上書きされる。

## 方針

- target workspace の root `.amadeus/` を、Amadeus 本体開発用の steering layer として扱う。
- Intent ごとに対応する GitHub Issue を持つ。
- Issue 本文は要約設計を持ち、詳細な Requirement、Acceptance、Traceability、Decision は `.amadeus/` に置く。
- skill 変更、validator 変更、example 更新、語彙追加、docs 更新を変更種別として扱う。
- build workspace、host environment、target workspace、target artifacts を分けて記録する。
- Git ブランチ戦略は [Git Branching Policy](policies/git-branching.md) に従う。
- 複数 worktree の並行運用は [並行運用ポリシー](policies/parallel-operation.md) に従う。
- AGENTS.md は操作指示を扱い、steering policy は Intent 成果物から参照する長期方針を扱う。

## 禁止事項

- `git submodule` で同じ Amadeus リポジトリを入れ子にしない。
- `.target-amadeus/` のような別名ディレクトリを作らない。
- `host` を workspace 名として使わない。
- stage2 を次回作業の stage0 に自動昇格しない。
- 作業 branch を次の Issue または次の phase へ暗黙に流用しない。

## 判断基準

- stage2 を次回 stage0 として扱うには、対象 PR が現在の基準 branch に merge 済みであり、build workspace が merge 後の基準 commit を参照し、人間が採用を承認している必要がある。
- stage0 採用判断は Maintainer が行い、validator pass や CI pass だけで stage2 を次回 stage0 に自動昇格しない。
- stage0 採用判断の証拠には、対象 PR、基準 commit、build workspace の参照 commit、対象 Intent、検証結果を含める。
- 検査責務の境界は、validator = 成果物構造の検証、evaluator = 意味と接続性の評価として扱う。
- 初回導入では、skill、validator、example snapshot、ハーネスの実装変更を後続 Intent に分ける。
- 作業 branch は最新の `origin/main` を基点に作る。
- PR merge 後は、最新の `origin/main` に追従してから次の作業 branch を作る。
- PR 作成前には、対象 Intent の validator と標準検証の結果を記録する。
- skill 変更 PR は、skill 変更だけで構成することを既定とする。source skill と昇格先成果物の同期は skill 変更の一部であり、常に同一 PR に含める。
- 他の変更種別を skill 変更と同一 PR に含めてよいのは、分割するとどちらかの PR 単独で検証が fail する不可分な場合だけである。
- 粒度制約の例外を使う場合は、理由と後続確認先を PR 説明に記録する。記録の型は [Git Branching Policy](policies/git-branching.md) の例外記録に合わせる。
- merge 操作は人間が行う。

## Git Branching Policy

## 目的

この policy は、Amadeus 本体の自己開発で使う Git ブランチ戦略を扱う。

Intent 成果物、PR 説明、review 対応から参照できる長期方針として、branch 作成、`origin/main` 追従、PR 作成前検証、merge 後処理を定義する。

## 対象

- Amadeus 本体リポジトリの target workspace。
- GitHub Issue 起点の自己開発作業。
- Ideation、Inception、Construction の phase PR と、Construction の Bolt PR の作成。
- Agent が作業 branch を作成、更新、push、PR 化する場面。

## 責務分担

AGENTS.md は、現在の作業環境で Agent が従う操作指示を扱う。

この policy は、Amadeus DLC 成果物から参照する Git ブランチ戦略の判断基準を扱う。

両者が重なる場合は、AGENTS.md の操作指示を実行上の制約として守り、この policy を Intent 成果物での説明と追跡の参照先として使う。

複数 worktree にまたがる並行の判断（並行させる単位、共有成果物の統合、ゲート承認の運用、同一 worktree での直列化）は [並行運用ポリシー](parallel-operation.md) が扱う。
この policy は単一 branch の lifecycle を扱い、並行の可否と順序は並行運用ポリシーに従う。

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

`codex/issue-<n>-specification` は、phase PR の統合条件を満たす場合に仕様側（Ideation と Inception）の成果物をまとめる branch に使う。

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

PR の既定の単位は、Ideation と Inception では phase ごと、Construction では Bolt ごととする。

次の 3 条件をすべて満たす場合だけ、仕様側の phase 成果物（Ideation と Inception）を 1 つの PR に統合してよい。

- 対象 Intent の scope が `refactor` または docs 系である。
- 変更対象が文書だけであり、実装コードとテストコードを含まない。
- Ideation の未確定事項が、事前の grilling または Issue の確定判断で解消済みである。

統合できる範囲は仕様側（Ideation と Inception）に限る。
Construction は、walking skeleton の Bolt PR を必ず人間が承認し、以降の Bolt も Bolt PR の merge を gate evidence にするため、従来どおり別 PR とする。

統合 PR の説明には、次を明記する。

- 含まれる phase 成果物の一覧。
- 各 phase の `phaseGates` の記録予定。

gate の判定は phase ごとに `state.json.phaseGates` で行う。
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

- Issue #254（policy 初版の導入判断）
- [Issue #369](https://github.com/amadeus-dlc/amadeus/issues/369)（v2 互換ライフサイクルへの改訂。旧 Intent 成果物は git 履歴を参照する）

## 並行運用ポリシー

## 目的

この policy は、Amadeus 本体の自己開発を 1 人の人間と複数エージェント（複数 worktree）で並行に進めるときの判断基準を扱う。

並行させる単位の判断、共有成果物の統合、ゲート承認の運用、同一 worktree での直列化を、Intent 成果物、PR 説明、review 対応から参照できる長期方針として定義する。

判断基準は、観察済みの実例に根拠がある範囲だけを扱う。
並行運用で新しい実例（統合の失敗、想定外の衝突）が観察された場合は、実例の根拠付きで判断基準を更新する。

## 対象

- Amadeus 本体リポジトリの target workspace。
- 1 人の人間と複数エージェント（複数 worktree）による並行の自己開発作業。
- 複数 Intent の並行、フェーズパイプライン（ある Intent が Construction の間に別の Intent が Ideation を進める形）、ゲート承認の運用。

複数人チームでの並行と、複数 workspace での組織利用は扱わない。

## 責務分担

[Git Branching Policy](git-branching.md) は、単一 branch の lifecycle（起点、基準 branch、branch 名、追従、PR 作成前検証、PR 作成、phase PR の統合、PR 監視、merge、merge 後処理）を扱う。

この policy は、複数 worktree にまたがる並行の判断（並行させる単位、共有成果物の統合、ゲート承認の運用、直列化）を扱う。

両方にまたがる判断では、branch の操作は Git Branching Policy に、並行の可否と順序はこの policy に従う。

## 並行させる単位

並行は Intent 単位で行い、worktree を Intent ごとに分ける。

並行を開始する前に、候補 Issue の変更対象（skill、ファイル群、promote 単位）を列挙し、進行中の Intent の変更対象（Bolt の実装対象、PR）と突き合わせる。

接触面がない場合は並行してよい。

同一 skill への変更集中は避ける。
promote はスキルディレクトリを丸ごと置き換えるため、同じ skill を触る 2 つの branch は promote 単位で衝突する。

索引行の追加だけの接触（`policies.md` や README への行追加など）は、統合手順で解消できる小さい接触として並行してよい。

phase をまたぐパイプライン（ある Intent の Construction と別の Intent の Ideation の並行）は、変更対象が分かれていれば並行してよい。

接触面の有無を成果物から判断できない場合は、並行を開始せず、変更対象の記録を先に確認する。

## 共有成果物の統合

並行 branch のマージ後は、次の順で共有成果物を整合させる。

1. 最新の `origin/main` を取得し、継続中の作業 branch を追従させる（追従の操作は [Git Branching Policy](git-branching.md) の追従に従う。新しい作業を始める場合は merge 後処理に従い、merge 後の `origin/main` を基点に branch を作る）。
2. 共有インデックス（`intents.md`）に影響する変更がある場合は、再生成を実行して整合させる。
3. 標準検証で整合を確認してから作業を再開する。

steering 共有資産の索引行が両 branch で追加されていた場合は、行追加同士の衝突として通常の conflict 解消で統合し、再生成対象であれば再生成を正とする。

## ゲート承認の運用

フェーズパイプラインでは、人間の役割はゲート審査官へ寄る。

承認待ちの確認には、`.amadeus/intents/*/state.json` を横断して、`awaiting_approval` のステージ、approval evidence が未記録の completed ステージ、gate が未記録の Bolt、`phaseGates` が未記録の phase を確認する。

承認待ちが複数ある場合は、内容を確認してまとめて処理してよい。

承認のたびに、承認判断を decision として記録し、承認 evidence を `state.json` に追加する。

実装やマージが先行して承認記録が取り残された場合は、遡及承認として承認判断を decision に記録し、`state.json` の approval evidence を補正してから phase 境界処理へ進む。

## 同一 worktree での直列化

同一 worktree 内では、Bolt と検証を直列に実行する。

標準検証（`npm run test:all` など）は作業ツリー全体を対象にするため、同一 worktree 内の並行実行は検証結果の信頼性を壊す。

並行は worktree 単位で行い、同じ worktree の中では順番に進める。

## 根拠

この policy の判断基準は、次の観察済みの実例に基づく。

| 判断基準 | 実例 | 参照 |
|---|---|---|
| 並行させる単位（接触面による並行可否） | Issue #350 の Construction 中に、開いている Issue 群を接触面（amadeus-validator への変更集中、promote 単位、`package.json` の共有行）で並行可否に分類し、Issue #351 の Ideation と並行した。 | Issue #350、[PR #359](https://github.com/amadeus-dlc/amadeus/pull/359)、[PR #362](https://github.com/amadeus-dlc/amadeus/pull/362) |
| 共有成果物の統合（追従と再生成） | Issue #334 で共有インデックスを生成物化し、並行 branch の統合後に再生成することで手動コンフリクト解消が不要になった。 | Issue #334、[PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) |
| ゲート承認の運用（キュー確認と遡及承認） | 承認待ちキュー一覧の導入直後に、承認記録が取り残された Intent の滞留 3 件を検出し、遡及承認（decision 記録と state 補正）で解消した。 | Issue #351、[PR #363](https://github.com/amadeus-dlc/amadeus/pull/363) |
| 同一 worktree での直列化 | Issue #334 の Construction で、検証競合を避けるために同一 worktree 内の Bolt を直列実行し、並行は worktree 間で行った。 | Issue #334、[PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) |

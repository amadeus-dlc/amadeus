# チームの働き方

この文書は、チームの働き方を扱う。
org.md の既定を上書きし、project.md に上書きされる。

## 方針

- target workspace の `amadeus/spaces/default/` を、Amadeus 本体開発用の Space として扱う。
- Intent ごとに対応する GitHub Issue を持つ。
- Issue 本文は要約設計を持ち、詳細な Requirement、Acceptance、Traceability、Decision は `aidlc/` に置く。
- skill 変更、validator 変更、example 更新、語彙追加、docs 更新を変更種別として扱う。
- build workspace、host environment、target workspace、target artifacts を分けて記録する。
- Git ブランチ戦略はこの文書の「Git Branching Policy」節に従う。
- 複数 worktree の並行運用はこの文書の「並行運用ポリシー」節に従う。
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
- 検査責務の境界は、validator = 実行時の成果物構造の検証、sensors = gate 時の接続性・品質の決定論的検査（`SENSOR_FIRED` として記録）として扱う。
- 初回導入では、skill、validator、example snapshot、ハーネスの実装変更を後続 Intent に分ける。
- 作業 branch は最新の `origin/main` を基点に作る。
- PR merge 後は、最新の `origin/main` に追従してから次の作業 branch を作る。
- PR 作成前には、対象 Intent の validator と標準検証の結果を記録する。
- skill 変更 PR は、skill 変更だけで構成することを既定とする。source skill と昇格先成果物の同期は skill 変更の一部であり、常に同一 PR に含める。
- 他の変更種別を skill 変更と同一 PR に含めてよいのは、分割するとどちらかの PR 単独で検証が fail する不可分な場合だけである。
- 粒度制約の例外を使う場合は、理由と後続確認先を PR 説明に記録する。記録の型はこの文書の「Git Branching Policy」節の例外記録に合わせる。
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

複数 worktree にまたがる並行の判断（並行させる単位、共有成果物の統合、ゲート承認の運用、同一 worktree での直列化）はこの文書の「並行運用ポリシー」節が扱う。
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

Agent が作る branch は、作業を実行する Agent に対応する prefix を付ける。

Codex は `codex/`、Claude は `claude/` を使う。

その他の Agent は、人間が識別できる短い lowercase prefix を使う。

branch 名には、Issue 番号または Intent の目的が分かる短い語を含める。

同じ Issue でも phase や目的が異なる PR は、別 branch として扱う。

例は次である。

```text
codex/issue-254-ideation
claude/issue-254-inception
codex/issue-254-construction
claude/issue-254-specification
```

多体連携の運用（並行運用ポリシーの「多体連携の運用」節を参照）では、エージェント実装名（`codex/`、`claude/`）の代わりにロール名 prefix（`leader/`、`eng1/`〜`eng3/`）を使う。ロール名は agmsg のロールと固定 worktree に対応し、人間がどのロールの作業かを識別できる。エージェント実装軸とロール軸は置換ではなく並記とし、多体連携で作業する場合はロール軸を選ぶ。

```text
eng1/issue-497-trial
eng2/issue-502-steering
```

`<agent>/issue-<n>-specification` は、phase PR の統合条件を満たす場合に仕様側（Ideation と Inception）の成果物をまとめる branch に使う。

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
- 各 phase の `PHASE_VERIFIED` イベントの記録予定。

gate の判定は phase ごとに `PHASE_VERIFIED` イベント（Phase Progress の `Verified`）で行う。
PR の統合は gate の統合を意味しない。

統合の対象は仕様成果物（`aidlc/**` の文書）である。
skill 変更を含む PR は、この文書の判断基準の粒度制約に従い、この統合の対象外とする。

統合 branch の途中で grilling が必要な未確定事項が見つかった場合は、統合条件を満たさなくなるため、その phase までで PR を区切り、以降は既定に戻る。

### PR 監視

PR にコメントが付いている場合、返答・解決なしの放置やマージを許容しない。
PR 作成後は監視を行い、詳細手順は `.agents/amadeus/knowledge/amadeus-shared/pr-gate-discipline.md` に従う。
merge は人間が行う（次項）。
検証設定（カバレッジなど）を緩めて pass させない。

例: レビューボットは CodeRabbit、Bugbot、Devin（Devin は遅いが必ず待つ）。検証設定はカバレッジの codecov.yml（変更による回避の禁止）。

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
- `amadeus-state.md` と成果物の phase、status、required artifacts が整合していること。

PR レビュー（人間とレビューボット）で検出する候補は、文書内容の説明不足や論理不整合に限定する。

候補は次である。

- PR 説明に対象 Issue、対象 Intent、検証結果が不足していること。
- branch lifecycle の説明が policy と矛盾していること。
- 例外理由があるのに、後続確認先が記録されていないこと。

gate 時の stage 成果物に対する接続性・品質の決定論的検査は、エンジンの sensors（`required-sections` / `upstream-coverage` / `linter` / `type-check`、`SENSOR_FIRED` として記録）が担う。

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

worktree（特に primary checkout）の占有は、開始時に他セッションへ通知し、作業終了時に引き渡す。

## 共有成果物の統合

並行 branch のマージ後は、次の順で共有成果物を整合させる。

1. 最新の `origin/main` を取得し、継続中の作業 branch を追従させる（追従の操作は [Git Branching Policy](git-branching.md) の追従に従う。新しい作業を始める場合は merge 後処理に従い、merge 後の `origin/main` を基点に branch を作る）。
2. 共有台帳（`intents.json`）で entry 追記同士が衝突した場合は、upstream の entry を保持し自分の entry を末尾へ接続する union で解消する（人間向け索引は廃止済みで、必要なら都度生成する）。
3. 標準検証で整合を確認してから作業を再開する。

steering 共有資産や生成物で衝突した場合は、生成物であれば再生成を正とし、追記型の台帳であれば union を正とする。

ファイル非接触でも、挙動変更（エンジン・skill）とその文書化が並行して進む場合は、意味的接触として申し送る。完了済み Intent の cursor・hooks 状態も、並行運用の接触面として扱う。

## ゲート承認の運用

フェーズパイプラインでは、人間の役割はゲート審査官へ寄る。

承認待ちの確認には、`amadeus/spaces/<space>/intents/*/amadeus-state.md` を横断して、`[?]`（AwaitingApproval）のステージ、`STAGE_COMPLETED` イベントが未記録の `[x]` ステージ、`BOLT_COMPLETED` イベントが未記録の Bolt、`PHASE_VERIFIED` イベントが未記録の phase（Phase Progress が `Verified` になっていない phase）を確認する。

承認待ちが複数ある場合は、内容を確認してまとめて処理してよい。

承認のたびに、承認判断を decision として記録し、`GATE_APPROVED` と `STAGE_COMPLETED` を `audit/audit.md` に追記する。

実装やマージが先行して承認記録が取り残された場合は、遡及承認として承認判断を decision に記録し、`audit/audit.md` に `GATE_APPROVED` と `STAGE_COMPLETED` を追記してから phase 境界処理へ進む。

承認とタスク分配の指示系統は、Maintainer → 代理セッション → worker セッションの委任構造で一元化してよい。代理セッションが接触面の判断とタスクの割り当てを担う。

## 多体連携の運用

### 適用条件

本体制（leader + engineer1〜3 の多体連携）は、既定の働き方ではなく、チーム構成を取れる場合だけに選択する働き方である。「並行させる単位」節が扱う既存の適用範囲（1 人の人間と複数エージェントによる並行）の内側で成立する運用であり、複数人チームでの並行を新たに扱うものではない。

前 Intent（260705-agmsg-trial-docs、Issue #497）が引き継いだ「team.md（steering）への統合は後続 Intent で行う」（同 Intent FR-3.2）を、本節で解消する。

### エージェント固定 worktree

leader、engineer1〜3 の各ロールに、常設の worktree を 1 個ずつ固定する。Intent はロール（の worktree）へディスパッチで割り当てる。

この運用は、「並行させる単位」節の原則と次の 3 点で両立する。

1. 変更作業が 1 Intent = 1 worktree に閉じる点は維持する。Intent の変更作業（branch、成果物、steering 編集）は、ディスパッチされた担当 engineer の worktree 1 個の中だけで行う。
2. ロール固定は worktree の割り当て方の運用である。Intent ごとに新しい worktree を切る代わりに、常設のロール worktree へ Intent をディスパッチで割り当てる。既存原則の例外ではなく、割り当て手段の具体化である。
3. 他ロールは対象 Intent のファイルを変更しない。leader と他 engineer は、自分の worktree からピア協議・承認中継・レビューで参加するだけであり、対象 Intent の worktree に対する並行編集は生じない。

### 質問プロトコル

質問は内容によって経路を分ける。

- 技術的な内容確認は、ピア協議で解決してよい。宛先は leader と他 engineer、期限は 15 分、回答 1 件の到着で成立とする。採用判断は質問した engineer が行い、協議記録（協議参加者、採用案、採用理由）を decision に残す。
- 承認系の判断は、leader 経由で人間へエスカレーションする（「承認中継」節に従う）。

運用細目は次のとおりとする。

- 回答 1 件が先着しても即確定とせず、期限内に届いた後続回答も採用判断の材料に含める。
- 分割単位や questions ファイルの省略可否のような小さな構造判断は、ピア協議にかけず担当 engineer の自己判断で進め、gate の人間承認で確定する。
- ピア回答も鵜呑みにせず、実コードや証跡で事実確認する。ピア協議の採用案を実コードで裏取りしてから確定した実例が試行 1 周（Issue #497）で観察されている。

### 承認中継

承認経路は一貫して人間 → leader → engineer とする。leader は定型文 2 種で承認を engineer へ中継する。

- ディスパッチ定型文: Intent 承認（Intent 化の可否判断）の中継に使う。必須項目は承認者、承認日時、対象 Issue と scope、承認要旨の 4 点である。
- 中継承認定型文: gate 承認の中継に使う。必須項目は承認者、承認日時、対象（Intent と対象ステージまたは Bolt）、承認要旨、HUMAN_TURN mint 指示の 5 点である。

HUMAN_TURN は、中継承認定型文の受信直後だけ mint する。ピア協議の回答受信では mint しない。人間が同席しないセッションでは、`amadeus-learnings` の §13 persist は実行せず、surface 候補を gate 報告に含めて leader へ送る。

定型文のテンプレート本体と実機確認の表は本節に複製しない。判断基準の正は次の 2 つを区別して参照する。

- 試行規約の正: Issue #497 の転記コメント（https://github.com/amadeus-dlc/amadeus/issues/497#issuecomment-4886584459 ）
- 定型文・実機確認の本体: `amadeus/spaces/default/intents/260705-agmsg-trial-docs/construction/agmsg-trial-docs/code-generation/multi-agent-trial-record.md`（完了済み record であり書き換えない）

## 同一 worktree での直列化

同一 worktree 内では、Bolt と検証を直列に実行する。

標準検証（`npm run test:all` など）は作業ツリー全体を対象にするため、同一 worktree 内の並行実行は検証結果の信頼性を壊す。

並行は worktree 単位で行い、同じ worktree の中では順番に進める。

## worktree の階層と Bolt 実行契約

Intent worktree は、並行の外側の隔離単位である（「並行させる単位」節の既定どおり、並行は Intent 単位で行い、worktree を Intent ごとに分ける）。

Bolt worktree は、Construction 内の実行隔離である。エンジンの `amadeus-bolt.ts` の `start --worktree` / `complete --merge` サブコマンドが所有し、Bolt 開始時に Intent worktree の内側へ作られ、gate 承認時に Intent worktree へ merge される（実装: `.agents/amadeus/tools/amadeus-bolt.ts` の `start` / `complete` サブコマンド、`.agents/amadeus/tools/amadeus-worktree.ts` の `create` / `merge` / `discard`）。

Bolt worktree の fork・merge はエンジンが所有する処理であり、「同一 worktree での直列化」節が禁じる手動の並行実行の例外ではなく、その内数である。この節は、人間や Agent が同一 worktree 内で複数 Bolt を手動並行実行してよいという意味ではない。

`WORKTREE_CREATED` / `WORKTREE_MERGED` / `WORKTREE_DISCARDED`、`STATE_FORKED` / `STATE_MERGED`、`AUDIT_FORKED` / `AUDIT_MERGED` は、エンジン内部の attestation イベントである（`.agents/amadeus/knowledge/amadeus-shared/audit-format.md` の Bolt worktree イベント節、118〜128 行目）。PR gate 運用が要求する gate evidence は、これらのイベントではなく、従来どおり Bolt PR の merge と `BOLT_COMPLETED` のままとする。理由は、人間が検証できる単位は PR であり、fork・merge 内部の整合はエンジンと eval（engine e2e）が保証する範囲だからである。

本家 AI-DLC v2 の `aidlc-worktree.ts` 相当の deterministic tool は、`amadeus-worktree.ts`（`create` / `merge` / `discard` / `list` / `verify` の 5 subcommand）としてすでに実装済みである。`WORKTREE_CREATED` / `WORKTREE_MERGED` / `WORKTREE_DISCARDED` イベントも同ツールが emit し、`audit-format.md` の該当節（118〜124 行目）が実装ツールとして明記している。`amadeus-bolt.ts` の `start --worktree` / `complete --merge` は、この `amadeus-worktree.ts` と `amadeus-state.ts`（fork / merge）、`amadeus-audit.ts`（audit-fork / audit-merge）をまとめて呼ぶ Bolt ライフサイクルの orchestrator である。したがって「独立 tool を新設しない」という意図的な不採用ではなく、独立 tool（`amadeus-worktree.ts`）はすでに存在し、新設の要否そのものが解消済みである。

### #407 の判断項目と本節の対応

| #407 の判断項目 | 本節の記述 |
|---|---|
| 1. Intent ごとの target workspace と、Bolt ごとの worktree のどちらを実際の隔離単位として優先するか | 「Intent worktree は、並行の外側の隔離単位である」の段落（優先ではなく階層関係として両方を使う） |
| 2. Intent worktree の内側で Bolt worktree を作るのか、Intent worktree を Bolt 実行の基点にするのか | 「Bolt worktree は、Construction 内の実行隔離である」の段落（Intent worktree の内側に作られる） |
| 3. 複数 Bolt を subagent で並行する場合、同一 worktree 内の直列化 policy とどう整合させるか | 「Bolt worktree の fork・merge はエンジンが所有する処理であり」の段落（直列化規定の例外ではなく内数） |
| 4. `WORKTREE_*`、`STATE_*`、`AUDIT_*` のイベント契約を、現行の PR gate 運用でどこまで要求するか | 「`WORKTREE_CREATED` / `WORKTREE_MERGED`…」の段落（gate evidence は Bolt PR の merge と `BOLT_COMPLETED` のまま） |
| 5. 本家 AI-DLC v2 の deterministic tool 差分を埋めるべきか、意図的差分として記録するべきか | 「本家 AI-DLC v2 の `aidlc-worktree.ts` 相当の…」の段落（埋める必要はない。`amadeus-worktree.ts` としてすでに実装済み） |

## 根拠

この policy の判断基準は、次の観察済みの実例に基づく。

| 判断基準 | 実例 | 参照 |
|---|---|---|
| 並行させる単位（接触面による並行可否） | Issue #350 の Construction 中に、開いている Issue 群を接触面（amadeus-validator への変更集中、promote 単位、`package.json` の共有行）で並行可否に分類し、Issue #351 の Ideation と並行した。 | Issue #350、[PR #359](https://github.com/amadeus-dlc/amadeus/pull/359)、[PR #362](https://github.com/amadeus-dlc/amadeus/pull/362) |
| 共有成果物の統合（追従と再生成） | Issue #334 で共有インデックスを生成物化し、並行 branch の統合後に再生成することで手動コンフリクト解消が不要になった。 | Issue #334、[PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) |
| ゲート承認の運用（キュー確認と遡及承認） | 承認待ちキュー一覧の導入直後に、承認記録が取り残された Intent の滞留 3 件を検出し、遡及承認（decision 記録と audit 補正）で解消した。 | Issue #351、[PR #363](https://github.com/amadeus-dlc/amadeus/pull/363) |
| 同一 worktree での直列化 | Issue #334 の Construction で、検証競合を避けるために同一 worktree 内の Bolt を直列実行し、並行は worktree 間で行った。 | Issue #334、[PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) |
| 並行させる単位（worktree 占有の通知・引き渡し） | 2026-07-05、Intent `260705-github-kanban-sync` の Construction（Bolt PR #471〜#475）と、並行する Intent `260705-hooks-state-bugfix`（PR #479）の期間中、primary checkout の占有を開始時に通知し、作業終了時に引き渡した。 | PR #471、PR #472、PR #473、PR #474、PR #475、PR #479 |
| 共有成果物の統合（完了済み Intent の状態も接触面） | 完了済み Intent `260704-engine-namespace` へ hooks が誤動作し（mint-presence の HUMAN_TURN 追記、stop hook の督促）、完了済み workflow の cursor・hooks 状態も並行運用の接触面であると判明した。 | Issue #476、[PR #479](https://github.com/amadeus-dlc/amadeus/pull/479) |
| 共有成果物の統合（意味的接触の申し送り） | Intent `260705-hooks-state-bugfix`（PR #479、エンジンの Phase Progress 自動更新）と Intent `260705-ledger-pr-docs`（Issue #477 → PR #480、台帳運用の文書化）が並行し、ファイル非接触でも #479 の挙動変更を #480 の文書が参照する意味的接触が生じた。 | Issue #477、[PR #479](https://github.com/amadeus-dlc/amadeus/pull/479)、[PR #480](https://github.com/amadeus-dlc/amadeus/pull/480) |
| ゲート承認の運用（指示系統の委任） | Issue #481 の修正着手前に代理セッションへ相談し、Maintainer の包括委任に基づいて worker セッションへタスクを分配した（PR #482）。Construction 中に検出したギャップの記録・割り当て運用（#478）も同じ委任構造で処理した。 | Issue #481、[PR #482](https://github.com/amadeus-dlc/amadeus/pull/482)、Issue #478 |
| 多体連携の運用（ロール固定 worktree・質問プロトコル・承認中継） | Issue #497 の試行 1 周（Intent `260705-agmsg-trial-docs`）で leader + engineer1〜3 の 4 体構成が実働し、ゲート承認中継 4 回・ピア協議 2 回を経て PR #500 が merge された。本 Intent（`260705-steering-learnings`、Issue #502）は同じ体制で 2 周目を実働させ、観察済みの実例を steering へ反映した。 | Issue #497、[PR #500](https://github.com/amadeus-dlc/amadeus/pull/500)、[#497 転記コメント](https://github.com/amadeus-dlc/amadeus/issues/497#issuecomment-4886584459) |

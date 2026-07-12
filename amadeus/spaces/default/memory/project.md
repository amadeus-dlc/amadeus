# Project-Level Rules

> プロジェクト固有の上書きと是正事項。team.md と org.md を上書きする。practices-discovery と自己学習ループによって記入される。
>
> 控えめに使うこと: 多くのチームにはプロジェクト層は不要。このプロジェクトだけがチーム全体のプラクティスから安定的・恒久的に逸脱する場合にのみ使う(例:「このモノレポはチームのデフォルトがスカッシュでもリベースする」「このレガシープロジェクトは既存スイートが救済不能なためテスト下限を免除し、それを受け入れている」)。

## Way of Working

<!-- プロジェクト固有の上書き。例: -->
<!-- このモノレポはスカッシュマージではなくリベースする。パッケージ単位のコミット履歴が部分ロールバック判断の監査証跡だから。この上書きはこのプロジェクトにのみ適用される。 -->

## Walking Skeleton

<!-- プロジェクト固有の上書き。例: -->
<!-- このプロジェクトは walking skeleton をスキップする。既存サービスのインプレース書き換えであり、ゲートすべきグリーンフィールドのブートストラップが存在しないため。 -->

## Testing Posture

<!-- プロジェクト固有の上書き。 -->

## Deployment

<!-- プロジェクト固有の上書き。 -->

- Version-controlled append-only生成物の誤りは、履歴rewrite・force push・branch protection緩和をせず、人間承認付き通常PRのgit revertで回復する。collector/schema defectなら修正test/codeとrevertを同一PRにし、一時入力異常のみ単独revertを許容する。conflict時は停止する。秘密漏洩等の緊急削除は別手順で扱う。 (learned 2026-07-12) <!-- cid:deployment-pipeline:c3 -->
- Deployment Executionの結果は、N/A（反証可能な不存在/非適用根拠あり）、NOT EXECUTED（対象/操作を認識したが禁止または未実施。理由を併記）、PENDING（後続の実行・観測条件待ち。閉包条件を併記）、PASS（実行証跡に基づく検証成功）を相互代用せず分離する。必要な外部操作を省略した完了根拠には使わない。 (learned 2026-07-12) <!-- cid:deployment-execution:c3 -->
## Code Style

<!-- プロジェクト固有の上書き。 -->

- DECIDED: このプロジェクトのドメインモデリングは `amadeus/spaces/default/knowledge/amadeus-shared/software-design/functional-domain-modeling-ts/`(class-free、type+コンパニオンオブジェクト、ブランド型+スマートコンストラクタ、判別ユニオン Result)を採用する。普遍原則(tell-dont-ask、parse-dont-validate、first-class-collection 等、索引 `software-design/README.md` の常時適用群)はこのスタイルの上で適用する (adopted 2026-07-08、installer-distribution intent にてユーザー指示)

## Tech Stack

- ランタイム / パッケージマネージャ: Bun(TypeScript、ESM)。フレームワークの hooks / tools はすべて bun で直接実行する
- 言語: TypeScript(typescript ^6、`tsc --noEmit` で型検査)
- リンター: Biome 2.4系(フォーマッタ無効)
- テスト: bun test ベースの自作ランナー `tests/run-tests.sh`(smoke / unit / integration / e2e の4層)
- 主要開発依存: @anthropic-ai/claude-agent-sdk、node-pty、@xterm/headless(e2e のターミナル駆動用)
- 構成: `core/`(ハーネス中立のソースオブトゥルース)、`harness/<name>/`(ハーネス別表層)、`scripts/package.ts`(ビルド)、`dist/<harness>/`(生成・コミット・ドリフトガード対象)、`docs/`

## Decided

- DECIDED: 新しい `/amadeus --*` ユーティリティハンドラを実装する前に `docs/reference/11-contributing.md` の「Adding a Utility Handler」チェックリストに従う
- DECIDED: バージョンバンプは release.yml(workflow_dispatch → release-it)だけが行う。`after:bump` の `scripts/release-version-sync.ts` が全バージョン面(`packages/setup/package.json`、`amadeus-version.ts`、README バッジ、`dist/`、セルフインストールツリー)を機械的に同期するため、PR や amadeus ワークフローが個別ファイルのバージョンを上げることはない (user decision 2026-07-09)

## Scope Overrides

<!-- このプロジェクト用のカスタムスコープルール。 -->

## Forbidden

- NEVER 手書きの `CHANGELOG.md` をリポジトリに復活させない — 2026-07-09 に削除済み。リリースノートは release.yml の GitHub Release 自動生成ノートが唯一のソース (user decision 2026-07-09)

- NEVER hand-edit `dist/<harness>/` as an implementation shortcut. (affirmed 2026-07-07)
- NEVER let source, distribution, and self-install trees drift across commits when installer behavior changes. (affirmed 2026-07-07)
- NEVER rely on a local-only manual checklist for installer release readiness when a deterministic drift guard already exists. (affirmed 2026-07-07)
- NEVER add runtime dependencies to the shipped framework without documenting why the user-side Bun-only premise changes. (affirmed 2026-07-07)
- NEVER `dist/<harness>/` を layout 変更の近道として手編集しない。 (affirmed 2026-07-07)
- NEVER root `core/` / `harness/` の維持または移動を、ADR/設計記録なしに暗黙決定しない。 (affirmed 2026-07-07)
- NEVER `dist/` relocation を internal refactor として扱わない。README、docs、tests、self-promotion、CI への user-facing impact を棚卸しする。 (affirmed 2026-07-07)
- NEVER `packages/setup` の不在をローカル filesystem evidence として捏造しない。 (affirmed 2026-07-07)
## Mandated

- ALWAYS リリース(バージョンバンプ・タグ発行・GitHub Release ノート・npm publish)は release.yml の workflow_dispatch 一本で行う。PR ではバージョン・バッジ・リリースノートに一切触れない(`tests/unit/t68-version-changelog-sync.test.ts` が version.ts↔CLI↔README バッジの同期を強制) (user decision 2026-07-09)

- ALWAYS edit `core/` or `harness/<name>/` as the source of truth, then regenerate `dist/` with `bun scripts/package.ts`. (affirmed 2026-07-07)
- ALWAYS run `bun run promote:self` after source changes that affect the self-installed `.claude/`, `.codex/`, `.agents/`, or `CLAUDE.md` trees. (affirmed 2026-07-07)
- ALWAYS include `bun run dist:check` and `bun run promote:self:check` in installer-related validation because the installer depends on generated distribution parity. (affirmed 2026-07-07)
- ALWAYS validate installer changes with `bun run typecheck`, `bun run lint`, and the relevant `tests/run-tests.sh` profile before merge. (affirmed 2026-07-07)
- ALWAYS treat the first installer Construction Bolt as a small end-to-end package setup slice and gate it before broader installer expansion. (affirmed 2026-07-07)
- ALWAYS layout-normalization の判断では `code-structure`, `technology-stack`, `dependencies`, `code-quality-assessment`, `architecture`, `business-overview` の CodeKB 根拠を参照する。 (affirmed 2026-07-07)
- ALWAYS `dist/`、`.claude/`、`.codex/`、`.agents/` の path を変える案では `dist:check` と `promote:self:check` の維持方法を同じ成果物に書く。 (affirmed 2026-07-07)
- ALWAYS `packages/setup` は別 intent の sibling dependency として扱い、この intent の実装スコープに吸収しない。 (affirmed 2026-07-07)
- ALWAYS markdown artifact は日本語で書く。ただし path、CLI、コード識別子、tool が要求する heading は正確性を優先して保持する。 (affirmed 2026-07-07)
- ALWAYS 新設パッケージ(`packages/*`)は lint(Biome)と型検査(`tsc --noEmit`)の配線をパッケージ追加と同一 PR で加え、既存の狭い CI lint スコープ(`tests/` のみ)を継承しない (affirmed 2026-07-08)
## Corrections

<!-- 人間のフィードバックによるプロジェクト固有の是正。 -->
<!-- 形式: NEVER/ALWAYS [behavior] (learned [date]) -->
- 既存codekbがある場合、reverse-engineering はフルスキャンでなく前回スキャンコミットからの差分リフレッシュで実行し、Always rerun for freshness 条項を差分更新で満たす (learned 2026-07-07) <!-- cid:reverse-engineering:c1 -->
- インストーラ/配布系 intent の reverse-engineering では package.ts・promote-self.ts・dist 構造・VERSION ファイルを重点的にスキャンする(後続ステージが配布資産の理解に依存するため) (learned 2026-07-07) <!-- cid:reverse-engineering:c2 -->
- reverse-engineering は Developer(スキャン)→ Architect(合成)の2サブエージェント直列で実行する(Architect がスキャン結果に依存するため並列化しない) (learned 2026-07-07) <!-- cid:reverse-engineering:c3 -->
- Requirements Analysis では、version resolution / CLI contract / force semantics / install manifest / upgrade boundary のようなユーザー可視契約を設計詳細として後続 stage へ先送りせず、requirements.md でテスト可能に固定する (learned 2026-07-07) <!-- cid:requirements-analysis:c3 -->
- 新しい配布可能パッケージを導入する intent では、パッケージ自身のバージョンライフサイクル(誰が・いつ・どうバンプし、framework 版とどう関係するか)と公開物の内容検証(シミュレーションではなく実ツール — `npm pack --dry-run` 等 — による検証)を requirements でテスト可能に固定する (learned 2026-07-08)。一般化(PM1-7 2026-07-10): 新設パッケージ・契約変更の要件では「規模増(件数・ページング)・クラッシュ耐性(アトミック性)・別 OS・消費側棚卸し」の将来条件をチェックリストとしてテスト可能に固定する — installer-distribution intent にバグ5件が集中した実測より <!-- cid:requirements-analysis:c4 -->
- 公開・配布系 intent の feasibility では、外部前提(npm レジストリのパッケージ名/スコープ、外部サービス到達性など)をユーザーに問わず実ツール(レジストリ照会等)で直接検証し、確定できない部分は確信度付きの推定として提示する (learned 2026-07-08) <!-- cid:feasibility:c1 -->
- 前 intent の RAID ログを引き継ぐときは、各 Issue の現存を作業ツリーで再実測してから転記する。解消済みの Issue は証跡(確認日時・確認方法)付きでクローズし、未解消はその旨を実測日付きで記す (learned 2026-07-08) <!-- cid:feasibility:c2 -->
- CLI コマンド体系の設計ではサブコマンド文法を対称(MECE)に保ち、破壊的になりうる操作を暗黙デフォルトにしない(例: install/upgrade は両方明示サブコマンド、サブコマンドなしはヘルプ表示) (learned 2026-07-08) <!-- cid:scope-definition:c1 -->
- approval-handoff 等のハンドオフゲートでリスクを説明する際は代替緩和策も併せて提示し、ゲートで合意できた緩和策の強化はその場で raid-log へ反映してから承認へ進む (learned 2026-07-08) <!-- cid:approval-handoff:c1 -->
- フェーズ境界検証の成果物は verification/phase-check-<phase>.md に統一する(ステージファイル準拠。governance 文書の [phase-boundary]-verification.md 表記より優先) (learned 2026-07-08) <!-- cid:approval-handoff:c2 -->
- practices-discovery の証跡スキャンは、同日の RE codekb がスキャン面(CI・テスト・コードスタイル・セキュリティ)をカバーしている場合はそれを代用し、affirm 済み team.md との差分ギャップのみ質問する (learned 2026-07-08) <!-- cid:practices-discovery:c1 -->
- team.md の再実行 practices-discovery では、変更のあったセクションだけを含む部分ドラフトで practices-promote し、無変更セクションの live 温存(churn 回避)を利用する (learned 2026-07-08) <!-- cid:practices-discovery:c2 -->
- 再スタート系 intent では、前 intent のレビュー済み成果物(レビュー指摘の修正を含む)を git 履歴から取得してベースにし、差分のみ更新する — レビューで獲得した契約の精密さをゼロから作り直さない (learned 2026-07-08) <!-- cid:requirements-analysis:c1 -->
- CLI/ツール系 intent の user-stories はジャーニー別エピック(導入/更新/運用など)で分割する — ペルソナと E2E テスト設計への対応が自然になり、FR 別分割より価値の見通しが良い (learned 2026-07-08) <!-- cid:user-stories:c1 -->
- functional-domain-modeling-ts スタイルの役割分担: ドメイン型は type にインスタンスメソッドを宣言し(実装は内部ファクトリ+クロージャの frozen リテラル)、コンパニオン namespace は static 相当(parse/build/コレクション演算)のみを持つ。貧血型(裸 type+外部関数)も全面 static 寄せ(第一引数レシーバのコンパニオン関数)もどちらも誤り (learned 2026-07-08) <!-- cid:functional-design:c11 -->
- 概念の改名・所有移管を含む修正では、旧名・旧所属を全成果物(上流の unit 定義・関係図・questions ファイル含む)で grep してから再レビューに出す — 伝播漏れはレビューイテレーションを1回消費する最頻出の欠陥 (learned 2026-07-08) <!-- cid:functional-design:c3 -->
- NFR 具体化では、ファイル名・タイムスタンプ等の設計値を実行環境の制約(Windows 予約文字、API の実在バージョン)と照合し、性能数値は強制メカニズム(タイムアウト等)から導出する — 照合なしの数値・形式は実装で破綻する (learned 2026-07-08) <!-- cid:nfr-requirements:c3 -->
- 概念移動時の全成果物 grep には修正中のユニット自身のファイルも含める — 伝播漏れは消費側だけでなく発生元にも残る(functional-design:c3 の補強) (learned 2026-07-08) <!-- cid:nfr-requirements:c5 -->
- framework 版同期の検証は t68(dist/claude コピーの内部整合)と dist:check/promote:self:check(全 dist ツリー+セルフインストールへの core 反映)の相補2機構で扱う — core/tools/amadeus-version.ts を触る変更は後者なしに完了と見なさない (learned 2026-07-08) <!-- cid:nfr-requirements:c1 -->
- 「修正対象ファイルの目録」「無改修」「実行回数・予算」等の断定的インベントリは、全設計決定が確定した後に導出して書く — 設計途中の早期断定は修正のたびに偽り、レビューイテレーションを消費する(nfr-design で3度観測) (learned 2026-07-08) <!-- cid:nfr-design:c7 -->
- 「構造的保証」を謳う設計記述は一枚岩の断定を避け、モジュール別に保証機構(ポート不保持/限定ポート/呼び出し順序契約など)を層別に書く — 例外を含む全称命題は自己矛盾の温床 (learned 2026-07-08) <!-- cid:nfr-design:c4 -->
- レビュー是正で新しい概念・共有物・所有関係(ヘルパー、環境変数、契約など)を導入するときは、その提供側と消費側の全成果物(他ユニット・他ステージ含む)を同時に棚卸しして伝播させ、伝播先一覧を是正コミットに含める — 是正自体が次の伝播漏れの発生源になる(infrastructure-design で2回観測) (learned 2026-07-08) <!-- cid:infrastructure-design:infrastructure-design:review-fix-propagation -->
- 選別・ガード機構(環境変数、フラグ、スキップ条件)を設計したら、その起動者(誰が・どの手順で設定するか)を同じステージで確定し、起動者側の成果物にも明記する — 起動者不在の安全網は恒久スキップされ空文になる (learned 2026-07-08) <!-- cid:infrastructure-design:infrastructure-design:guard-activator -->
- ビルダー/レビュアーの検証報告は、最終変更後に全検証コマンドを再実行し exit code を添えて行う。conductor は申告と実測に齟齬が出た検証を必ず自分でも1回再実行して裏取りしてから次工程へ進む (learned 2026-07-08) <!-- cid:code-generation:code-generation:evidence-discipline -->
- 「不在時のみビルド」型の遅延ビルドヘルパー(ensureSetupCliBuilt 等)を跨ぐ検証では、ブランチ切替・エントリポイント置換の後に生成物(packages/setup/dist/cli.js)を削除してから実行する — ステールバイナリは新コードを一切テストしない偽緑/偽赤を作る (learned 2026-07-08) <!-- cid:code-generation:code-generation:stale-binary -->
- 既存 codekb への diff-refresh では、新 intent の節を追記する前に、旧 intent の節に残る現在時制マーカー(「(本 intent)」等)を履歴ラベル(intent 名+日付)へ更新する — 現在マーカーの複数併存は後続ステージの参照を誤らせ、並行 intent の codekb 更新で merge 衝突も誘発する(260710 RE で9箇所の実害を観測) (learned 2026-07-10) <!-- cid:reverse-engineering:c3-relabel -->
- ポート契約・API パス形の変更時は、パス文字列を exact match する fixture を持つ兄弟テストへ repo 全域 grep で伝播させる — functional-design:c3(概念改名の全成果物 grep)のテスト fixture 面への拡張(PM1-11 2026-07-10、バッチ2 U1 で setup 系5ファイル未伝播 → 統合赤を実測) <!-- cid:code-generation:fixture-propagation-grep -->
- spawn-blindspot-seam-export への追補(PM1-10 2026-07-10): 判定ロジックの exported 純関数化だけでは handler 内の呼び出し配線行が未カバーに残る — handler 本体(handleXxx / main)も argv パラメータ化して export し in-process 駆動する(正本行は batch C record の main 反映時に同 cid へ統合) <!-- cid:code-generation:seam-export-handler-amend -->
- 選挙・ゲートの手続きは結果が自明に見えても省略しない。質問ファイルの [Answer] タグへの記入は選挙裁定の受領後にのみ行う — 既定候補が確実に見えることは記入の根拠にならない(bughunt-fix-batch requirements-analysis で conductor が未実施選挙の結果を記入しかけ、コミット前に自己是正した実ヒヤリハットより。E-L2 裁定 4/6) (learned 2026-07-10) <!-- cid:requirements-analysis:election-answer-after-ruling -->
- agmsg 上の選挙・裁定を成果物から参照するときは、git で検証可能な事実(delegate コミット SHA 等)と agmsg 出典の事実(配信・裁定タイムスタンプ)を明示的に分離して書く — レビュアーの独立検証(git grep)で裏取り不能な主張を成果物に残さないため(product-lead レビューが E-L1 参照を git から裏取りできず REVISE した実例より。E-L2 裁定 4/6) (learned 2026-07-10) <!-- cid:requirements-analysis:agmsg-git-evidence-split -->
- 要件・受け入れ基準に時間・回数等の数値を書くときは、実在する対照実装の named constant を file:line で引くか、選択を design へ明示的に委ねる — 実在しない要約帯(例: 10-30秒)は開発者に新しいマジックナンバーを作らせる(nfr-requirements:c3『数値は強制メカニズムから導出』の requirements-analysis 版類例。FR-4 レビュー実例より。E-L2 裁定 4/6) (learned 2026-07-10) <!-- cid:requirements-analysis:constants-from-code -->

## Testing
- Standardの中核はunit/integrationとし、performance/securityは承認済みNFRと実在境界へtraceして選定する。戦略名だけで検査を機械追加しない。既決strategy再述に留めず、stage定義の曖昧さは別途追跡する。 (learned 2026-07-12) <!-- cid:build-and-test:c1 -->
- 攻撃面・依存・承認NFRを成果物で実測明記した場合のみ検査を比例選定する。既存必須scanや要求済み検査の省略根拠にはしない。 (learned 2026-07-12) <!-- cid:build-and-test:c3 -->

## CI/CD
- Snapshot jobはPR blocking集約外とするが、main上のjob失敗は赤く可視化する。適用時はjobの非blocking目的とloud-fail契約を成果物へ明記し、一般の必須CI gateを除外する根拠にはしない。 (learned 2026-07-12) <!-- cid:ci-pipeline:c3 -->
- Code Generationで既存workflowへ実装済みなら、CI Pipelineで新規workflowを二重生成せず、既存workflowを唯一の正本として文書化・検証する。 (learned 2026-07-12) <!-- cid:ci-pipeline:c2 -->

## Provisioning
- Provisioning inventoryでは実在対象とN/A対象を分離し、N/Aには人間決定・承認scope・上流成果物等の反証可能な不存在/非適用根拠を併記する。N/Aを未検証やPASSと表現せず、実在resourceや必須検査の省略理由にしない。 (learned 2026-07-12) <!-- cid:environment-provisioning:c3 -->

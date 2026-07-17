# Project-Level Rules

> このプロジェクト固有の技術・構造・運用上の追加規則と是正事項。org.md、team.md に矛盾しない規則を加算し、practices-discovery と自己学習ループによって記入される。
>
> ランタイム、リポジトリ構造、CI、配布経路など、このプロジェクトを離れると成立しない規則をここに置く。チーム共通の判断・レビュー・エスカレーション規則は team.md、一時的な intent 制約は intent record に置く。

## Way of Working

実装時は `packages/framework/core/` または `packages/framework/harness/<name>/` を編集元とし、`dist/` とセルフインストールツリーは生成物として `bun scripts/package.ts` と `bun run promote:self` で同期する。

## Walking Skeleton

スコープ別の walking-skeleton 既定は org.md に従う。greenfield 要素(新パッケージ・新配布経路など)を含む intent では、最初の Construction Bolt を小さな end-to-end スライスとして扱い、以後の拡張前に人間がゲートで確認する。

## Testing Posture

テストは TypeScript で `tests/` 配下に追加し、Bun ベースの既存ランナーで検証する。PR/CI の基準は `bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`。ユーザー可視の契約(CLI 契約・配布物ドリフト・セルフインストール互換など)は該当領域を触る変更で必ずカバーする。

既存テストが赤い場合は変更前のベースラインを確認する。自分の変更による失敗は必ず直し、既存の無関係な失敗は安全かつ低コストなら修正し、それ以外は Issue に記録してスコープを不必要に膨張させない。

## Deployment

デプロイ基盤は持たず、リリースは npm パッケージ配布と GitHub 上のタグ/PR 履歴で管理する。GitHub Actions は push と pull_request で typecheck、lint、dist/self-install drift guard、smoke+unit+integration tests を実行する。

リリースは release.yml の workflow_dispatch 一本で行う。release-it がバージョン同期、`vX.Y.Z` タグ、GitHub Release ノート、npm publish を実行する。手書きの `CHANGELOG.md` は持たず、PR や amadeus ワークフローからバージョンを上げない。

- Version-controlled append-only生成物の誤りは、履歴rewrite・force push・branch protection緩和をせず、人間承認付き通常PRのgit revertで回復する。collector/schema defectなら修正test/codeとrevertを同一PRにし、一時入力異常のみ単独revertを許容する。conflict時は停止する。秘密漏洩等の緊急削除は別手順で扱う。 (learned 2026-07-12) <!-- cid:deployment-pipeline:c3 -->
- Deployment Executionの結果は、N/A（反証可能な不存在/非適用根拠あり）、NOT EXECUTED（対象/操作を認識したが禁止または未実施。理由を併記）、PENDING（後続の実行・観測条件待ち。閉包条件を併記）、PASS（実行証跡に基づく検証成功）を相互代用せず分離する。必要な外部操作を省略した完了根拠には使わない。 (learned 2026-07-12) <!-- cid:deployment-execution:c3 -->
## Code Style

TypeScript/ESM と Bun 直接実行を前提に、既存の `amadeus-` プレフィックス、`packages/framework/core/` のハーネス中立層と `packages/framework/harness/<name>/` のハーネス別表層という境界を守る。フォーマッタは無効、lint は Biome、型検査は `tsc --noEmit` で行い、ツール・フックには実行ビットを要求しない。

- DECIDED: このプロジェクトのドメインモデリングは `amadeus/spaces/default/knowledge/amadeus-shared/software-design/functional-domain-modeling-ts/`(class-free、type+コンパニオンオブジェクト、ブランド型+スマートコンストラクタ、判別ユニオン Result)を採用する。普遍原則(tell-dont-ask、parse-dont-validate、first-class-collection 等、索引 `software-design/README.md` の常時適用群)はこのスタイルの上で適用する (adopted 2026-07-08、installer-distribution intent にてユーザー指示)

## Tech Stack

- ランタイム / パッケージマネージャ: Bun(TypeScript、ESM)。フレームワークの hooks / tools はすべて bun で直接実行する
- 言語: TypeScript(typescript ^6、`tsc --noEmit` で型検査)
- リンター: Biome 2.4系(フォーマッタ無効)
- テスト: bun test ベースの自作ランナー `tests/run-tests.sh`(smoke / unit / integration / e2e の4層)
- 主要開発依存: agent SDK、node-pty、@xterm/headless(e2e のターミナル駆動用)
- 構成: `packages/framework/core/`(ハーネス中立のソースオブトゥルース)、`packages/framework/harness/<name>/`(ハーネス別表層)、`scripts/package.ts`(ビルド)、`dist/<harness>/`(生成・コミット・ドリフトガード対象)、`docs/`

## Decided

- DECIDED: 新しい `/amadeus --*` ユーティリティハンドラを実装する前に `docs/reference/11-contributing.md` の「Adding a Utility Handler」チェックリストに従う
- DECIDED: バージョンバンプは release.yml(workflow_dispatch → release-it)だけが行う。`after:bump` の `scripts/release-version-sync.ts` が全バージョン面(`packages/setup/package.json`、`amadeus-version.ts`、README バッジ、`dist/`、セルフインストールツリー)を機械的に同期するため、PR や amadeus ワークフローが個別ファイルのバージョンを上げることはない (user decision 2026-07-09)

## Scope Overrides

<!-- このプロジェクト用のカスタムスコープルール。 -->

- DECIDED: この repo の amadeus ワークフローで intent を開始・再開するときの利用スコープは `amadeus`(Self-hosted Amadeus framework development without infrastructure operations)を既定とする。別スコープ(bugfix 等)を使う場合はユーザーの明示指示による (user decision 2026-07-16、intent 260709-canonical-settings の feature→amadeus 切替指示より) <!-- cid:scope-definition:default-scope-amadeus -->
- DECIDED: bug ラベルの Issue を修正する intent は `bugfix` スコープを既定とする(default-scope-amadeus の明文化された例外 — ユーザーの standing 指示)。クロスレビュー2名成立が起動の前提(issue-cross-review)。bugfix 以外(例: 修正が新機能設計を要する場合の amadeus)へ切り替える場合はユーザーの明示指示による (user decision 2026-07-16、260715-parser-checkbox-fixes の bugfix 明示承認→standing 化) <!-- cid:scope-definition:bugfix-scope-for-bug-intents -->

## Forbidden

- NEVER 手書きの `CHANGELOG.md` をリポジトリに復活させない — 2026-07-09 に削除済み。リリースノートは release.yml の GitHub Release 自動生成ノートが唯一のソース (user decision 2026-07-09)
- NEVER 既存テストの赤を「自分と無関係」を理由に無視して作業を続行したり、赤いスイートをグリーン・完了として報告したりしない。変更前のベースラインを確認し、自分の変更による失敗は直す。既存の無関係な失敗は、安全かつ低コストなら修正し、それ以外は Issue に記録して明示的にフラグする。

- NEVER `dist/<harness>/` を実装の近道として手編集しない。 (affirmed 2026-07-07)
- NEVER インストーラの挙動を変更するとき、正本・配布物・セルフインストールツリーをコミット間で不整合にしない。 (affirmed 2026-07-07)
- NEVER 決定的なドリフトガードが存在する検査を、ローカルだけの手動チェックリストで代替しない。 (affirmed 2026-07-07)
- NEVER 利用者側の Bun-only 前提を変更する理由を文書化せず、配布フレームワークへ runtime dependency を追加しない。 (affirmed 2026-07-07)
- NEVER `packages/framework/core/` / `packages/framework/harness/` の維持または移動を、ADR/設計記録なしに暗黙決定しない。 (affirmed 2026-07-07)
- NEVER `dist/` relocation を internal refactor として扱わない。README、docs、tests、self-promotion、CI への user-facing impact を棚卸しする。 (affirmed 2026-07-07)
- NEVER `packages/setup` の不在をローカル filesystem evidence として捏造しない。 (affirmed 2026-07-07)
## Mandated

- ALWAYS リリース(バージョンバンプ・タグ発行・GitHub Release ノート・npm publish)は release.yml の workflow_dispatch 一本で行う。PR ではバージョン・バッジ・リリースノートに一切触れない(`tests/unit/t68-version-changelog-sync.test.ts` が version.ts↔CLI↔README バッジの同期を強制) (user decision 2026-07-09)

- ALWAYS `packages/framework/core/` または `packages/framework/harness/<name>/` を正本として編集し、`bun scripts/package.ts` で `dist/` を再生成する。 (affirmed 2026-07-07)
- ALWAYS セルフインストールされる全ハーネスツリーに影響する正本変更後は `bun run promote:self` を実行する。 (affirmed 2026-07-07)
- ALWAYS インストーラ関連の検証に `bun run dist:check` と `bun run promote:self:check` を含め、生成された配布物との一致を確認する。 (affirmed 2026-07-07)
- ALWAYS インストーラ変更はマージ前に `bun run typecheck`、`bun run lint`、関連する `tests/run-tests.sh` プロファイルで検証する。 (affirmed 2026-07-07)
- ALWAYS インストーラの最初の Construction Bolt を小さな end-to-end package setup slice とし、広範な拡張より前にゲートする。 (affirmed 2026-07-07)
- ALWAYS layout-normalization の判断では `code-structure`, `technology-stack`, `dependencies`, `code-quality-assessment`, `architecture`, `business-overview` の CodeKB 根拠を参照する。 (affirmed 2026-07-07)
- ALWAYS `dist/` またはセルフインストールされるハーネスツリーの path を変える案では `dist:check` と `promote:self:check` の維持方法を同じ成果物に書く。 (affirmed 2026-07-07)
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
- framework 版同期の検証は、パッケージ内コピーの内部整合テストと dist:check/promote:self:check(全 dist ツリー+セルフインストールへの core 反映)の相補2機構で扱う — packages/framework/core/tools/amadeus-version.ts を触る変更は後者なしに完了と見なさない (learned 2026-07-08) <!-- cid:nfr-requirements:c1 -->
- 「修正対象ファイルの目録」「無改修」「実行回数・予算」等の断定的インベントリは、全設計決定が確定した後に導出して書く — 設計途中の早期断定は修正のたびに偽り、レビューイテレーションを消費する(nfr-design で3度観測) (learned 2026-07-08) <!-- cid:nfr-design:c7 -->
- 「構造的保証」を謳う設計記述は一枚岩の断定を避け、モジュール別に保証機構(ポート不保持/限定ポート/呼び出し順序契約など)を層別に書く — 例外を含む全称命題は自己矛盾の温床 (learned 2026-07-08) <!-- cid:nfr-design:c4 -->
- レビュー是正で新しい概念・共有物・所有関係(ヘルパー、環境変数、契約など)を導入するときは、その提供側と消費側の全成果物(他ユニット・他ステージ含む)を同時に棚卸しして伝播させ、伝播先一覧を是正コミットに含める — 是正自体が次の伝播漏れの発生源になる(infrastructure-design で2回観測) (learned 2026-07-08) <!-- cid:infrastructure-design:infrastructure-design:review-fix-propagation -->
- 選別・ガード機構(環境変数、フラグ、スキップ条件)を設計したら、その起動者(誰が・どの手順で設定するか)を同じステージで確定し、起動者側の成果物にも明記する — 起動者不在の安全網は恒久スキップされ空文になる (learned 2026-07-08) <!-- cid:infrastructure-design:infrastructure-design:guard-activator -->
- ビルダー/レビュアーの検証報告は、最終変更後に全検証コマンドを再実行し exit code を添えて行う。conductor は申告と実測に齟齬が出た検証を必ず自分でも1回再実行して裏取りしてから次工程へ進む (learned 2026-07-08) <!-- cid:code-generation:code-generation:evidence-discipline -->
- 「不在時のみビルド」型の遅延ビルドヘルパー(ensureSetupCliBuilt 等)を跨ぐ検証では、ブランチ切替・エントリポイント置換の後に生成物(packages/setup/dist/cli.js)を削除してから実行する — ステールバイナリは新コードを一切テストしない偽緑/偽赤を作る (learned 2026-07-08) <!-- cid:code-generation:code-generation:stale-binary -->
- 既存 codekb への diff-refresh では、新 intent の節を追記する前に、旧 intent の節に残る現在時制マーカー(「(本 intent)」等)を履歴ラベル(intent 名+日付)へ更新する — 現在マーカーの複数併存は後続ステージの参照を誤らせ、並行 intent の codekb 更新で merge 衝突も誘発する(260710 RE で9箇所の実害を観測) (learned 2026-07-10) <!-- cid:reverse-engineering:c3-relabel -->
- RE ステージの宣言センサー3種(required-sections / upstream-coverage / answer-evidence)は codekb 出力パスが sensor filter(**/{amadeus-docs,intents}/** と **/*-questions.md — 各 sensor manifest :8)に構造不適合で常に matches-rejection になり、RE の成果物検証は実質 conductor 手動確認のみ(機械化するなら filter 拡張 or RE 専用センサーの enhancement Issue)。知識クラス、E-1059-CG(manual-sensor-fire-before-gate-report 追補2)の RE 面追補(E-SDE-RE 2026-07-17 採用 — 開票時 3/4、e1 後着で 4/4 全会一致 — e2 実測: 3センサー×9成果物の27発火が全て filter 不適合出力・SENSOR_FAILED 0件、e3/e4 の stage frontmatter :23-26・outputs :37・filter :8 の独立実測。票: 配信 22:49Z 頃 → e2 自票(提案側)22:49:45Z → e3 22:50:02Z → e4 22:50:22Z → 開票 22:50Z 台(3/4)→ e1 後着 22:51:18Z(採用 GoA 1、filter glob 独立実測)で 4/4。GoA[E-SDE-RE]: C1 1x4) (learned 2026-07-17) <!-- cid:reverse-engineering:re-sensors-codekb-filter-mismatch -->
- per-Unit Construction ループの起動条件2点を定型化する: (a) unit-of-work-dependency.md には parseBoltDag 用の YAML edge block(units/depends_on の fenced yaml)が必須 — 欠く/パース不能だと runtime-graph に bolt_dag が載らず {unit-name} directive へ degrade する(amadeus-runtime.ts:299-313 computeBoltDag。units-generation を実行するスコープに適用 — SKIP するスコープでは degrade が正常系) (b) 最初の construction ステージ(skeleton-gate)は最初の next が gate unresolved を返し、report --skeleton-stance の classify round-trip を経て次の next で per-Unit ループが起動する(amadeus-orchestrate.ts:2104-2115、設計コメント :669-701)。units-generation の成果物様式と construction 開始手順の両面に効く(E-CS6 L-FD1 2026-07-16 採用 4/4 全会一致、260709 functional-design の実測 — 引用行は persist 前に leader が再実測確定) <!-- cid:units-generation:per-unit-loop-activation -->
- swarm finalize は check の converged 記録だけでは merge せず、conductor の明示クレーム(--claimed)を要求する — finalize --units のみだと cap-exhausted 扱いになる(amadeus-swarm.ts:38-49 の設計コメント「claimed-converged set が AUTHORITATIVE」の運用化。per-unit-loop-activation の swarm 面補完。E-CS10 L-CG2 2026-07-16 採用 4/4 — 260709 batch 2 finalize の cap-exhausted→--claimed で converged×2 の実測) <!-- cid:code-generation:swarm-finalize-claimed-required -->
- ポート契約・API パス形の変更時は、パス文字列を exact match する fixture を持つ兄弟テストへ repo 全域 grep で伝播させる — functional-design:c3(概念改名の全成果物 grep)のテスト fixture 面への拡張(PM1-11 2026-07-10、バッチ2 U1 で setup 系5ファイル未伝播 → 統合赤を実測) <!-- cid:code-generation:fixture-propagation-grep -->
- spawn-blindspot-seam-export への追補(PM1-10 2026-07-10): 判定ロジックの exported 純関数化だけでは handler 内の呼び出し配線行が未カバーに残る — handler 本体(handleXxx / main)も argv パラメータ化して export し in-process 駆動する(正本行は batch C record の main 反映時に同 cid へ統合) <!-- cid:code-generation:seam-export-handler-amend -->
- チームモードの worktree 間 delegate 配送は定型手順で行う: leader が delegate 発行後に監査シャードをチェックポイントコミットして自ブランチへ push → conductor が fetch し自ブランチへ cherry-pick(issuer シャードを除外しない — 除外すると provenance 検証が fail する。実例: 復元コミット 630134b4)→ シャード衝突時は append-only-shard-conflict-resolution に従い自版が相手版の prefix であることを機械実測してから theirs を採用、自ツリー未存在シャード(DU)は純追加として取り込む → DELEGATED_APPROVAL を grep 確認 → approve(E-PM1 P3 2026-07-16 採用 4/4、260709/260715 で計10回超の実測)。追補(E-PM2 M6 2026-07-16 採用 4/4): human-presence delegate は「gate open が先・leader 実 HUMAN_TURN が後」の時系列でのみ有効 — 発行は3段運用(conductor の gate open 合図 → leader の実 human turn → 発行)で行う(RA delegate 2回拒否→3段で通過の実測。二重規定を避けるため本 cid に統合)。追補2(E-PM3 M1 2026-07-16 採用 4/4): delegate の cherry-pick は発行コミット単体で完結しない場合がある — approve の human-presence 検証は issuer シャード内の issuerHumanTs 実在を要求するため、発行コミットに先行する leader シャード checkpoint コミット列(issuerHumanTs を含む最小コミット列に限定 — 全履歴 pick への肥大回避)も併せて cherry-pick してから approve する(t224 CG delegate の単体 pick 拒否→列同伴で通過の実測)。追補3(E-PM9 C5 2026-07-17 採用 3/3 GoA 1x1 2x2): grant/delegate 取込の cherry-pick は発行コミット単体を pick する — 同梱の main マージ merge-commit は -m なしで pick 不能(fatal: is a merge but no -m option)で、その main 前進分は origin/main fetch で既取得のため pick 不要(46e89ecb 取込の -m エラー→単体 pick 解決+40127789 単体完結の2実測。e4 留保転記: 追補2の issuerHumanTs 同伴 pick 要件は本則の例外として維持 — 単体 pick の一般化が追補2を上書きしない。e1 留保転記: 稀ケースにつき独立 cid でなく本 cid への追補統合 — 本転記がその実施) <!-- cid:requirements-analysis:cross-worktree-delegate-delivery -->
- ノルム PR・record-sync PR は leader/作業ブランチから切らず、origin/main から対象コミットのみの単独ブランチで切る — 作業ブランチ起点は工程記録コミットが同乗し main と衝突する(E-PM1 P4 2026-07-16 採用 4/4、#1014 の CONFLICTING→b2cde40fb 載せ替えの実測) <!-- cid:requirements-analysis:norm-pr-from-main-base -->
- 巨大 PR(dist×4+self-install×2+record 増幅で数百ファイル級)では GitHub diff API が 406 を返し codecov/patch check-run が構造的に生成不能になる — トリアージ4手順: (i) 待ちジョブのログ実文で「未着 timeout」と「赤」を区別 (ii) pulls API(権威)で patch 集計を確定 (iii) 対照として passing PR の head check-runs に codecov/patch の実在を確認 (iv) `Accept: vnd.github.diff` の curl で 406 を直接実測(自己回復クラスとの区別)。恒久対策は Issue #1017(E-PM1 C1 2026-07-16 採用 4/4、PR #982/E-982 実測) <!-- cid:code-generation:mega-pr-codecov-structural-absence -->
- 新 harness dist ツリーを追加する PR と core を変更する PR の並行は、どちらの head CI でも検出できない dist drift(クロスマージ盲点)を作る — (i) 並行 PR の交差判定(c6)に「dist ツリー集合の変化」を含める (ii) 新ツリー追加 PR の最終 rebase 時は全正本面の regen を必須とする (iii) マージ直後の main push CI 赤を loud 監視する。旧 base ローカルの dist:check は新ツリー非対象の構造的偽 green になる点に注意(shared-ledger-insert-collision の dist ツリー版。E-PB5 c1 2026-07-16 採用 4/4 — #1030×#1032 のクロスマージで main dist:check 赤(#1039)→止血 #1040 の実測列) <!-- cid:code-generation:cross-merge-dist-tree-blindspot -->
- spawn-only の CLI モジュールを coverage seam 目的で in-process import しない — import はモジュール全行を lcov に 0-hit で載せ、当該ファイルの patch 行を absent→missed へ反転させる。seam 関数は既計測モジュール(coverage registry 上に実計測実績があるもの)へ移設して import する。本則は spawn-blindspot-two-step((i) リファクタ (ii) waiver)の主経路に従属する「seam 移設先の選定則」であり、seam-export-handler-amend と相互参照(E-PM1 C2 2026-07-16 採用 4/4、#982 の bolt.ts 685 zero-hit 行 lcov 直読→operation-journal 移設の実測) <!-- cid:code-generation:seam-placement-measured-module -->
- phase 最終ステージ(approval-handoff / delivery-planning 等)の approve 前に verification/phase-check-<phase>.md の作成を定型タスクとして含める — エンジンの phase-boundary ガードが実在を要求して approve を拒否する。成果物の正名は approval-handoff:c2 に従う(同項と相互参照。E-PM1 PM-e2-1 2026-07-16 採用 4/4、delivery-planning approve の「phase-check-inception.md does not exist」拒否実測。bolt-pr-taskization 同型の指令ループ外規範)。精密化(E-PM3 M3 2026-07-16 採用 4/4): phase 最終ステージはスコープの EXECUTE 集合に依存して移動する(例: amadeus/chore/bugfix スコープでは build-and-test が construction 最終)— gate open 準備の定型に「本ステージが phase boundary か」の実測を含め、該当時は phase-check-<phase>.md を approve 前に作成する(同日3 intent で phase guard 接地の実測) <!-- cid:approval-handoff:phase-check-before-final-approve -->
- conductor はゲート準備完了報告の前に、宣言センサー(sensors_applicable)を全成果物へ手動発火し、FAILED を是正してから報告する — PostToolUse 依存では発火漏れが起きうる(E-PM1 M2 2026-07-16 採用 4/4、approval-handoff/practices-discovery の2ステージ連続で報告前捕捉の実測)。追補(E-1059-RA c1 2026-07-16 採用 4/4 うち開票時 3/4): センサー verdict は fire の exit code で読まない — fire は dispatcher 起動エラー以外で常に exit 0(amadeus-sensor.ts:511、:29)であり、PASSED/FAILED は audit の SENSOR_PASSED/SENSOR_FAILED 行と FAILED 時のみ生成される detail finding ファイル(:411)で判定する(e4 の exit 0 誤読→実 FAILED 見逃しヒヤリハット+e2 の自 intent 事後裏取り(SENSOR_FAILED 0 件で green 真正確認)の実測)。追補2(E-1059-CG c1 2026-07-16 採用 4/4 うち開票時 3/4): 発火対象は sensor filter 適合ファイルから選ぶ(linter = **/*.{ts,js}、type-check = **/*.{ts,tsx} — 各 sensor manifest :8 実測)。md 成果物への fire は matches-rejection exit 1 になるため、fire は出力を破棄せず実行する — >/dev/null 併用は不発を無音化する(e4 の4連続無音不発→可視再実行捕捉の実測、e2/e1 の同型癖の自己申告2件)。追補3(E-PM3 M5 2026-07-16 採用 4/4 うち留保転記): 非 active intent への sensor fire の audit 行は active intent のシャードへ記録される — verdict の遡及監査時は全 intent シャードの union で読む(通常のゲート準備 = 自 intent への発火は自シャード読みで足りる)。stale FAILED 2件が偽赤に見えた実測 <!-- cid:requirements-analysis:manual-sensor-fire-before-gate-report -->
- ステージ成果物は冒頭に「上流入力(consumes 全数): <artifact 名列挙>」行を置くことを様式定型とする — upstream-coverage センサーは consumed artifact 名の実参照を要求する。冒頭行は実際に消費した artifact 名の列挙に限る(参照実体のない装飾トークンはセンサーを通っても趣旨を空文化するため禁止 — 検証劇場 Forbidden と同族)(E-PM3 M4 2026-07-16 採用 4/4、B&T の upstream-coverage FAILED 6件→冒頭行追記で全 PASS の実測) <!-- cid:code-generation:artifact-upstream-inputs-header -->
- engine の code-generation approve(workspace_requires ガード)は実装が本線コミット面に存在することを要求する — conductor は approve 前に実装を本線へ反映する。反映経路は2分岐: PR 未着地なら bolt ブランチからの content-identical な cherry-pick(-n)ミラー、着地済みなら origin/main の本線マージ(E-PM2 M1 2026-07-16 採用 4/4、e2+e4 同型統合+e4 留保の2分岐明文化。「no source work is evident」拒否→解消の実測3件: e2 260709、e4 #1013/#1015・#1055、e1 team-up CG)。統合追補(E-TU5 c1 2026-07-16 採用 4/4、開票時 3/4+e4 後着 GoA 2): ガードが受理する evidence は3経路 — (a) 直近コミットのコード面 (b) Bolt Refs のブランチ (c) intent の Project フィールドの issue/PR 参照 × birth..HEAD の commit subject 照合(mergedPrSourceWork、amadeus-state.ts:1013・設計コメント :1035-1038)。ミラー/本線マージは経路 (a) を満たすための運用であり、(b)(c) を満たせる場合は不要(過剰ミラー回避)。Project フィールドへの参照追記は実装 PR 番号の事実記載に限り、guard 迂回目的の虚偽参照は検証劇場 Forbidden に該当し禁止 <!-- cid:code-generation:mirror-merge-before-approve -->
- gh pr update-branch は MERGED・head 削除済みの PR に GraphQL エラーを返す — 複数 PR の直列処理では各 PR の state を先に確認してから update-branch を打つ(closed-pr-state-first の gh 挙動面追補。E-PM2 M2 2026-07-16 採用 4/4、#1055 実測) <!-- cid:code-generation:update-branch-state-first -->
- 再接地 force-push 後は旧 head の実行中 CI run を即キャンセルし、run 監視は headSha 照合で run ID を確定してから watch する — 本項は run 特定面の規律であり、SHA 自体の取得規律は sha-no-manual-expansion に従う(E-PM2 M4 2026-07-16 採用 4/4 うち e2 留保=守備範囲限定を転記、#1046 queue 滞留+#1067 監視誤り自己捕捉の実測) <!-- cid:code-generation:stale-run-cancel-headsha-watch -->
- patch gate の UNCOVERED 対処は、対象モジュールの計測状況の実測(head lcov の SF/DA 実在確認 — registry の covered 表示だけで判定しない)を最初に行ってから分岐する — 既にテストから in-process import されているモジュールは seam 抽出が第一手で、allowlist/waiver は残余行のみ(spawn-blindspot-two-step の前段判定明文化。E-PM4 M1 2026-07-16 採用、#1089 実測: utility.ts の spawn-only 誤判断→t67/t68 既存 import 発見で seam 転換・14/16 行 covered) <!-- cid:code-generation:measure-before-blindspot-branch -->
- 並行 builder ディスパッチの逸脱停止文言に「既存様式への準拠と判断する場合も停止対象」を含める — 逸脱該当性の判断自体を実装者単独でしない(E-CTF-U1-DEV【2】裁定の運用化。E-PM4 M2 2026-07-16 採用、builder が「:531 同形だから逸脱でない」と単独判断して不停止実装した実測) <!-- cid:code-generation:deviation-applicability-not-solo -->
- units-generation を SKIP する degrade スコープ(bugfix 等)でも、code-generation 成果物は construction/<fix-slug>/code-generation/ の unit ディレクトリ様式に置く — artifact guard は宣言 produces の {unit-name} を解決して実在検査するため、直下配置は不在扱いで approve が拒否される(E-PM4 M4 2026-07-16 採用、#1081 intent の「none of its declared artifacts exist」拒否→移設通過の実測。stage-artifact-declared-names の配置面補完) <!-- cid:code-generation:degrade-scope-unit-dir-layout -->
- stderr へ新規出力を足す変更は、next 出力を消費する既存テスト・ツールの parse 方式を repo grep で棚卸ししてから出す(stdout-directive-stderr-advisory の変更側チェックリスト面。E-PM4 M5 2026-07-16 採用、t135 破損の実測) <!-- cid:code-generation:stderr-addition-consumer-grep -->
- packages/framework/core/tools/ の CLI を canonical パスで直実行しない — __FILE_DIR 相対の project-root 解決(loadRules 等)が「memory 不在」exit 1 になる。動作確認・E2E 検分は配布コピー(.claude/tools/ 等)経由で行う(E-PM7 M2 2026-07-16 採用 4/4 うち e4/e3 は傍証同意の留保付き、e1 実測: canonical 直 exit 1 vs self-install 経由 exit 0 の対照) <!-- cid:code-generation:no-canonical-direct-execution -->
- エンジン契約として「stdout = directive JSON / stderr = advisory」を明文とする — next 出力を消費するテスト・ツールは directive parse を stdout 限定にする。既存の stdout+stderr 連結 parse は一括改修せず、壊れた時点で stdout 限定へ是正する(実測駆動 — キャンペーン禁止)(E-1080-CG c1 2026-07-16 採用 4/4、orchestrate emit :178-179 の実装事実+t135 が stderr advisory 追加で破損した実測。E-1059-CG(fire 出力可視)と対の stdout/stderr 役割分離) <!-- cid:code-generation:stdout-directive-stderr-advisory -->
- 複雑度ゲートの baseline は匿名関数を ordinal 照合する — 既存匿名より前位置への arrow 追加は既存関数を偽 NEW_VIOLATION にする。第一手は匿名増ゼロの plain loop 化とし、baseline 更新は実複雑度変化時のみ行う(E-PM2 M7 2026-07-16 採用 4/4 うち e2 留保=出典訂正済み。PR #1057 実測(Issue #1027 修正時)、record 260715-state-set-failclosed/construction/code-generation/memory.md:9) <!-- cid:code-generation:complexity-baseline-ordinal -->
- 選挙・ゲートの手続きは結果が自明に見えても省略しない。質問ファイルの [Answer] タグへの記入は選挙裁定の受領後にのみ行う — 既定候補が確実に見えることは記入の根拠にならない(bughunt-fix-batch requirements-analysis で conductor が未実施選挙の結果を記入しかけ、コミット前に自己是正した実ヒヤリハットより。E-L2 裁定 4/6) (learned 2026-07-10) <!-- cid:requirements-analysis:election-answer-after-ruling -->
- agmsg 上の選挙・裁定を成果物から参照するときは、git で検証可能な事実(delegate コミット SHA 等)と agmsg 出典の事実(配信・裁定タイムスタンプ)を明示的に分離して書く — レビュアーの独立検証(git grep)で裏取り不能な主張を成果物に残さないため(product-lead レビューが E-L1 参照を git から裏取りできず REVISE した実例より。E-L2 裁定 4/6) (learned 2026-07-10) <!-- cid:requirements-analysis:agmsg-git-evidence-split -->
- 要件・受け入れ基準に時間・回数等の数値を書くときは、実在する対照実装の named constant を file:line で引くか、選択を design へ明示的に委ねる — 実在しない要約帯(例: 10-30秒)は開発者に新しいマジックナンバーを作らせる(nfr-requirements:c3『数値は強制メカニズムから導出』の requirements-analysis 版類例。FR-4 レビュー実例より。E-L2 裁定 4/6) (learned 2026-07-10) <!-- cid:requirements-analysis:constants-from-code -->

- 事前整理(standalone grilling 等)で裁定済みの intent では、intent-capture の質問を未決の判断のみに絞り、確定済み裁定は前提知識として成果物へ直接反映する — 質問の重複再演をしない(260717-mirror-issue-tool で実践、4+1問で完了) (learned 2026-07-17) <!-- cid:intent-capture:c1 -->

- gh CLI への依存は scripts/ 配下の repo ローカル開発支援ツールに限定して許容する — 配布フレームワーク(packages/framework/、dist/、self-install)へは持ち込まない(Bun-only Forbidden との整合)。gh 不在・未認証は loud エラー(exit 1)、認証は gh keyring へ委譲しトークンを持たない(260717-mirror-issue-tool Q1 裁定) (learned 2026-07-17) <!-- cid:practices-discovery:gh-scripts-boundary -->
- 宣言センサーの手動発火は成果物生成直後・reviewer ディスパッチ前に行う — manual-sensor-fire-before-gate-report の「ゲート報告前」をレビュー前へ前倒しする(reviewer のイテレーションをセンサー検出可能な欠陥に消費させない。260717-mirror-issue-tool で発火漏れ→reviewer が FAILED 検出のロスを2回実測) (learned 2026-07-17) <!-- cid:functional-design:sensor-before-reviewer -->
- 上流入力ヘッダーは「本文に依拠箇所を書いた後」に本文の実参照から転記して作る — 宣言リストからの機械転記が本文未参照の装飾トークン(artifact-upstream-inputs-header 禁止パターン)を生む。consumes-first-drafting(宣言を先に読む)と対の出力側順序(260717-mirror-issue-tool で nfr-requirements/nfr-design の2ステージ連続再発を実測) (learned 2026-07-17) <!-- cid:nfr-design:body-derivation-before-header -->
- エラー経路テストの green は「目的の分岐を実際に踏んだこと」を lcov の DA で実測確認してから完成扱いにする — 別経路が同じ exit code に到達する偽経路 green(260717 で単一 record 自動解決により no-active-intent テストが番号 parse 失敗経路で green だった実測)は assertion だけでは見えない。injection-surface-verify(注入面)と直交するテスト到達面の検査 (learned 2026-07-17) <!-- cid:build-and-test:error-path-reach-lcov -->

- 変更規模に固定の行数上限を置かず、Units Generation の概算行数レンジと変更の凝集性で過大化を判定する。旧 driver stack の一般化を再利用する案より、conductor の三モード選択契約に限定する案を選んだ。 (learned 2026-07-17) <!-- cid:intent-capture:c4 -->
- Codex native subagent の並列 spawn と結果回収は、同一セッションで三つの `ultra` 指定 probe を同時実行して成立した。effort 指定は API に受理されたが、実際に honor された値を示す telemetry は観測できないため、受理と実適用を分けて扱う。 (learned 2026-07-17) <!-- cid:feasibility:c1-2 -->
- `codex-ultra` を直ちに不成立とする案より、API による `ultra` 指定受理を現在の証拠限界として明記する Conditional GO を候補とした。prepared Bolt worktree への隔離書き込みが成立しない場合は代替へ黙って降格せず、Requirements 確約前に停止する。 (learned 2026-07-17) <!-- cid:feasibility:c4 -->
- 公開契約を完結させる六つの proto-capability はすべて Must とし、Should／Could を置かない。Must を削って軽量化する案より、telemetry・汎用 adapter・外部 messaging・referee 再設計を Won't として厳格に除外する案を選んだ。 (learned 2026-07-17) <!-- cid:scope-definition:c2 -->
- raw WSJF より dependency と risk-first を優先し、worktree isolation proof を最初の hard stop とした。未証明の基盤に依存する価値面を先行着地させないためである。 (learned 2026-07-17) <!-- cid:scope-definition:c3 -->
- Team Formation が SKIP された Initiative Approval & Handoff では、未確定の named mob や Construction schedule を捏造しない。Ideation で確約する resource は Inception の分析と人間 gate までに限定し、Unit と依存が確定した後の Delivery Planning で Construction の staffing と schedule を承認する。 (learned 2026-07-17) <!-- cid:approval-handoff:c3 -->
- Initiative Approval & Handoff で optional upstream stage が SKIP されている場合、存在しない competitive analysis・team assessment・wireframes 等を補完しない。各 handoff 成果物で N/A の根拠、代わりに使う内部証拠、後続の decision point を明示する。 (learned 2026-07-17) <!-- cid:approval-handoff:c4 -->
## Testing
- Standardの中核はunit/integrationとし、performance/securityは承認済みNFRと実在境界へtraceして選定する。戦略名だけで検査を機械追加しない。既決strategy再述に留めず、stage定義の曖昧さは別途追跡する。 (learned 2026-07-12) <!-- cid:build-and-test:c1 -->
- 攻撃面・依存・承認NFRを成果物で実測明記した場合のみ検査を比例選定する。既存必須scanや要求済み検査の省略根拠にはしない。 (learned 2026-07-12) <!-- cid:build-and-test:c3 -->

## CI/CD
- Snapshot jobはPR blocking集約外とするが、main上のjob失敗は赤く可視化する。適用時はjobの非blocking目的とloud-fail契約を成果物へ明記し、一般の必須CI gateを除外する根拠にはしない。 (learned 2026-07-12) <!-- cid:ci-pipeline:c3 -->
- Code Generationで既存workflowへ実装済みなら、CI Pipelineで新規workflowを二重生成せず、既存workflowを唯一の正本として文書化・検証する。 (learned 2026-07-12) <!-- cid:ci-pipeline:c2 -->

## Provisioning
- Provisioning inventoryでは実在対象とN/A対象を分離し、N/Aには人間決定・承認scope・上流成果物等の反証可能な不存在/非適用根拠を併記する。N/Aを未検証やPASSと表現せず、実在resourceや必須検査の省略理由にしない。 (learned 2026-07-12) <!-- cid:environment-provisioning:c3 -->

## Observability
- Execution timeoutや処理上限は個別実行の停止guardでありservice SLOではない。Service SLOは実在する利用者向けservice/SLI・観測期間・目標値に基づく契約とし、runtime service/SLI不存在時にtimeoutや単発run成功をservice SLO達成へ昇格させず、根拠付きN/A/PENDINGとする。実在service SLOの省略根拠にはしない。 (learned 2026-07-12) <!-- cid:observability-setup:c3 -->

## Incident Response
- 承認済みincident要件の対象者・通知時機・応答時間・監査証跡を既存repository-nativeなPR/run recordが満たし、閲覧権限・保持・責任主体を実測できる場合は、相関可能なPR/run linkをDetect→Recover→Verify→Recordの正本として再利用し、要求外のcommunication/paging基盤を作らない。明示on-call/SLA/即時通知、secret exposure等の緊急経路、既存必須pagingを省略・置換する根拠にはしない。 (learned 2026-07-12) <!-- cid:incident-response:c3 -->
- units-generation approve 後・construction 進入前に `bun .claude/tools/amadeus-runtime.ts compile` を再実行し、runtime-graph の bolt_dag 非 null を確認する — yaml edge block が正しくても compile 陳腐化(UG 成果物が compile 後に生成)で per-unit ループが無音 degrade する(per-unit-loop-activation (a) の第3条件 = compile 鮮度。amadeus-runtime.ts の bolt_dag optional+parse 失敗時 node omitted の無音経路が機序)。根拠 = 2 record の独立実測(metrics-timeseries FD: bolt_dag null→recompile で解消 / answer-preemption-guard FD: edge block 実在でも unit セグメントなし配置へ degrade)。本項は construction 進入前の conductor 定型手順であり、エンジン側の機械ガード化は別 Issue 判断とする(e3 留保転記)。票: E-APG-FD 対抗候補 2026-07-16 e2 提案 22:29:32Z → e4 採用(1)22:30:38Z → e1 採用(1)22:31:11Z → 開票 22:31:43Z → e3 採用(2、後着) (learned 2026-07-16) <!-- cid:units-generation:recompile-before-construction-bolt-dag -->

# Project-Level Rules

> 2026-08-12 ノルム蒸留(ユーザー直接裁定): 具象ルール・票証跡・チームモード専用ノルムを削除し原理原則へ縮約。旧文面は git 履歴(この整理前のコミット)に保存。
>
> このプロジェクト固有の技術・構造・運用上の追加規則。org.md、team.md に矛盾しない規則を加算する。ランタイム、リポジトリ構造、CI、配布経路など、このプロジェクトを離れると成立しない規則をここに置く。チーム共通の判断・レビュー・エスカレーション規則は team.md、一時的な intent 制約は intent record に置く。

## Way of Working

実装時は `packages/framework/core/`(ハーネス中立の正本)または `packages/framework/harness/<name>/`(ハーネス別表層)を編集元とし、`dist/` とセルフインストールツリーは未追跡のローカル生成物として `bun run build` で再生成する。生成物を独立した正本として編集しない。

- 大規模な initiative を規模だけを理由に複数 intent へ分割しない。1 intent が監査・状態機械・trace の anchor であり、分断すると audit trail が分断される。並行化は Unit 設計と Construction Bolt の並行実装で実現する <!-- cid:intent-capture:c4-2 -->
- Unit・Bolt の定義と粒度は正準(`stage-protocol.md` Glossary と `delivery-planning.md`)に従い、ノルム側で再定義しない。ノルムが定めるのは2点: (a) Unit は独立に実装可能であることを Delivery Planning 前に検証し、片側だけでは価値を出荷できない境界は単一 Unit へ統合する (b) PR 粒度は Bolt ごとを既定とし、複数 Unit・工程記録・無関係リファクタを単一 PR に束ねない。Issue 起点は **1 Issue = 1 Unit** を原則とし、依存・共有ファイル競合のないものは並行化する。Unit 分割では source と test file の ownership を同じ境界へ揃える <!-- cid:units-generation:c1 -->
- ソロ運用でも Bolt 実装は最初から git worktree 分離で行い、本線ツリーのブランチ切替で実装しない。source-only 境界下の新規 worktree は自己インストール面を欠くため、依存インストールと `bun run build` を移設の定型手順に含める <!-- cid:code-generation:solo-bolt-worktree-required -->
- サブエージェントに engine/state の変更操作(`amadeus-orchestrate.ts` の next/report/park、`amadeus-state.ts`、`amadeus-log.ts`、`amadeus-bolt.ts`)をさせない。状態遷移・ゲート提示・レビュー・学習リチュアルは conductor のみが行う。prompt 明示だけに頼らず、調査・レビューは書込不可のサブエージェント種別に限定し、drafting では 1 エージェント = 1 成果物パスに固定する <!-- cid:practices-discovery:c2-engine-mutation-ban -->
- 常任グラント(standing grant)が覆うのはステージゲートの承認のみで、内容裁定の代答には使えない <!-- cid:approval-handoff:c2-grant-gates-only -->
- semi/full の Intent autonomy が有効な間、§13 学習選定やステージ内の判断質問は人間へ直接提示せず `amadeus-bolt decide-question` の梯子で裁定し、fail-closed の結果のみ人間へ回す。常任グラントとは別機構であり適用境界を混同しない <!-- cid:scope-definition:c1-semi-ladder-routing -->
- AskUserQuestion が dismiss された場合は沈黙を承認とみなさず、推奨値も選択扱いにしない。適用可能な最も具体的な既存規則で判定し、根拠を成果物へ明記する <!-- cid:practices-discovery:c2-dismiss-not-approval -->
- units-generation を SKIP する degrade スコープでも、code-generation 成果物は `construction/<slug>/code-generation/` の unit ディレクトリ様式に置く。複数 unit の並行実装では、unit ディレクトリ作成と directive 捕捉を conductor が unit ごとに直列で所有する(全 unit covered 後の再取得は fail-closed) <!-- cid:code-generation:c1-degrade-batch-directive-capture -->
- Issue と承認済み成果物にある決定を再質問しない。質問は矛盾か、実装を阻む要件欠落に限る。UX・互換性など既存実装の流儀で決まる事項は既存パターンを読んで合わせる <!-- cid:requirements-analysis:c5 -->
- ワークフロー完了の確定は、stage body の全 Steps 実行・mirror boundary の receipt 完結・Bolt 配送の確認を経てから行う。state ポインタの前進を実体完了と同一視しない。誤って complete へ進めた場合は履歴 rewrite せず前進 revert(state と ledger のみ、audit 無改変)で回復する <!-- cid:build-and-test:bt-workflow-completion-substance-gate -->

## Walking Skeleton

スコープ別の walking-skeleton 既定は org.md に従う。greenfield 要素(新パッケージ・新配布経路など)を含む intent では、最初の Construction Bolt を小さな end-to-end スライスとして扱い、以後の拡張前に人間がゲートで確認する。

## Testing Posture

テストは TypeScript で `tests/` 配下に追加し、Bun ベースの既存ランナーで検証する。PR/CI の基準は `bun run typecheck`、`bun run lint`、隔離2回ビルドの再現性検査、`bun run source-only:check`、グラフ不変量検査、`bash tests/run-tests.sh --ci` に加え、Project Coverage Gate の固定絶対下限と merge-base 相対許容低下幅の両条件、Patch Coverage Gate、plugin-conformance-e2e を含む現行のブロッキング集合全体を満たすこととする。Project Coverage Gate の絶対条件と相対条件は AND 条件であり、片方だけの通過を coverage 達成と扱わない。ユーザー可視の契約(CLI 契約・Release Asset 配布・セルフインストール互換など)は該当領域を触る変更で必ずカバーする。

既存テストが赤い場合は変更前のベースラインを確認する。自分の変更による失敗は必ず直し、既存の無関係な失敗は安全かつ低コストなら修正し、それ以外は Issue に記録してスコープを膨張させない。

- filesystem / process を使う medium test は unit allowlist を増やさず integration suite に置く <!-- cid:code-generation:c2-doctor-seam -->
- property-based test(fast-check)は unit 層の Developer Testing として既存スイートに常駐させ、別枠の QA スイートを新設しない。PR CI は固定 seed・低 numRuns で即再現可能に保ち、深掘りは別ジョブへ分離して失敗 seed をログ化する。新設・変更する永続化境界(write⇔read、発行⇔消費)には round-trip プロパティを標準観点として付ける <!-- cid:build-and-test:pbt-developer-testing-posture -->
- PBT のオラクルで、検証したい不変量そのものを被検実装から独立に再実装しない。両者が同じ箇所で正しく振る舞うと欠陥が観測面に出ず相殺され、緑のまま欠陥が生存する <!-- cid:build-and-test:pbt-oracle-cancellation -->
- 二層検証(team.md § Testing Posture)の形式検証面: 有限探索(TLA+/TLC)で「検出されなかった」と主張できるのは、宣言済み有限 domain の固定点まで完走した completion marker と state 統計が揃う場合だけで、部分探索・timeout・統計欠損は fail-closed に扱う <!-- cid:application-design:finite-exploration-not-detected-proof -->
- `TEST_TIME_FACTOR` はテスト用 timeout の基準値への乗算を中心契約とし、timeout の成立と検証に対応する sleep・poll・settle にも同じ係数を適用する。乗算を直接書かず `tests/lib/test-time-factor.ts` の `scaleTestTime` を経由する。性能基準や本番 CLI の timeout 契約は対象外 <!-- cid:requirements-analysis:test-time-factor-c1 -->
- 長い本番タイムアウトを持つ性能要件は、実時間の負荷試験ではなく、同じ制御経路を通る短縮可能なタイミングシームとカウンタ検証で構成する <!-- cid:build-and-test:bt-timeout-verification-shape -->
- Test Strategy の水準が高くても、performance / security の検査は承認済み NFR と実在境界へ trace できる範囲だけ生成し、生成しなかった検査は根拠付きで明記する。合否を決める数値目標が要件に宣言されていないテスト種別は、体裁のために実体を作らない — 指示書に「適用可能な NFR が存在しないという判定」であること、根拠、将来この判定を覆す条件を明記する。目標なきベンチマークは検証劇場、無言の省略は黙示の欠落 <!-- cid:build-and-test:c2-no-test-theatre-for-absent-nfr -->
- テストファイル・テストヘルパを新規追加した変更では、範囲を絞った実行の緑で完了としない。conductor がフルスイートを1回通す(横断ゲートは絞り込み実行の射程外) <!-- cid:code-generation:c3-conductor-runs-full-suite -->
- verdict では検証した面と未検証の面を書き分ける(起動の成立を配送の成立へ昇格させない)。未検証面が受け入れ基準の外にあると requirements/RAID の実文照合で確認できる場合は無条件 READY としてよく、未検証面は申し送り節に列挙する <!-- cid:build-and-test:verdict-names-unverified-facets -->
- 要件・RAID が「実装時に実測確認」と規定した項目を後続 intent へ先送りしない。受け入れ基準が名指す経路そのもので確認し、内部関数の単体実行や部分経路で代替しない <!-- cid:build-and-test:no-silent-scope-narrowing -->

## Deployment

デプロイ基盤は持たず、リリースは npm パッケージ配布、GitHub Release Asset、タグ / PR 履歴で管理する。GitHub Actions は push と pull_request で typecheck、lint、隔離2回ビルドの再現性検査、source-only 境界検査、グラフ不変量検査、smoke + unit + integration tests を実行する。

リリースは `release.yml` の `workflow_dispatch` 一本で行う。release-it がバージョン同期、`vX.Y.Z` タグ、GitHub Release ノート、npm publish を実行する。手書きの `CHANGELOG.md` は持たず、PR や amadeus ワークフローからバージョンを上げない。

- バージョン管理下の append-only 生成物の誤りは、履歴 rewrite・force push・branch protection 緩和をせず、人間承認付き通常 PR の `git revert` で回復する。collector / schema の欠陥なら修正と revert を同一 PR にし、conflict 時は停止する <!-- cid:deployment-pipeline:c3 -->
- Deployment Execution の結果は N/A(反証可能な不存在・非適用根拠あり)、NOT EXECUTED(理由併記)、PENDING(閉包条件併記)、PASS(実行証跡に基づく検証成功)を相互代用しない <!-- cid:deployment-execution:c3 -->

## Code Style

TypeScript / ESM と Bun 直接実行を前提に、既存の `amadeus-` プレフィックス、`packages/framework/core/` のハーネス中立層と `packages/framework/harness/<name>/` のハーネス別表層という境界を守る。フォーマッタは無効、lint は Biome、型検査は `tsc --noEmit` で行い、ツール・フックに実行ビットを要求しない。

- DECIDED: ドメインモデリングは `amadeus/spaces/default/knowledge/amadeus-shared/software-design/functional-domain-modeling-ts/`(class-free、type + コンパニオンオブジェクト、ブランド型 + スマートコンストラクタ、判別ユニオン Result)を採用する。普遍原則(tell-don't-ask、parse-don't-validate、first-class-collection 等)はこのスタイルの上で適用する
- ドメイン型は type にインスタンスメソッドを宣言し(実装は内部ファクトリ + クロージャの frozen リテラル)、コンパニオン namespace は static 相当(parse / build / コレクション演算)のみを持つ。貧血型も全面 static 寄せもどちらも誤り <!-- cid:functional-design:c11 -->
- 既存 API の戻り値が実検出値と fallback を同じ表現へ潰す場合、公開互換性を保ちつつ内部 resolution に検出元 provenance を保持し、両者を区別してから後続判定へ渡す <!-- cid:application-design:c1 -->
- md 表への機械可読メタデータは行内 HTML コメントでなく fenced YAML ブロックで持つ(行末コメントのセル境界は処理系依存の無音破損クラス) <!-- cid:functional-design:c4-yaml-block-over-inline-comment -->
- ユーザー向けの質問と成果物では、正式定義されていない略称や専門用語を使わない <!-- cid:requirements-analysis:c3-260802-plugin-optin-parity -->

## Tech Stack

- ランタイム / パッケージマネージャ: Bun(TypeScript、ESM)。hooks / tools はすべて bun で直接実行する
- 言語: TypeScript(`tsc --noEmit` で型検査)/ リンター: Biome(フォーマッタ無効)
- テスト: bun test ベースの自作ランナー `tests/run-tests.sh`(smoke / unit / integration / e2e の4層)
- 主要開発依存: agent SDK、Biome、TypeScript、fast-check。TUI E2E は Bun から tmux バックエンドを駆動する
- 構成: `packages/framework/core/`、`packages/framework/harness/<name>/`、`scripts/package.ts`(ビルド)、`dist/<harness>/`(未追跡)、`docs/`

## Decided

- DECIDED: 新しい `/amadeus --*` ユーティリティハンドラを実装する前に `docs/reference/11-contributing.md` の「Adding a Utility Handler」チェックリストに従う
- DECIDED: バージョンバンプは `release.yml`(workflow_dispatch → release-it)だけが行う。`after:bump` の `scripts/release-version-sync.ts` が全バージョン面を機械的に同期するため、PR や amadeus ワークフローが個別ファイルのバージョンを上げることはない
- DECIDED: 成果物が複数の配送経路(packager 投影 / runtime compose / self-install 等)を通って届く修正では、受け入れ条件をソース断面の述語で書かず、各配送先の実ツリーに対する述語で書く。ソース断面だけの green は、変換器を持たない配送路の退行を構造的に隠す <!-- cid:requirements-analysis:c2-acceptance-at-delivery-tree -->
- DECIDED: `packages/framework/core/` を変更したときの build と再現性検査は、manifest が発見する全ハーネスを対象とする。固定数や一部列挙で止めず、packager の検出集合を正とする <!-- cid:build-and-test:bt-dist-regen-seven-harnesses -->

## Scope Overrides

- DECIDED: Amadeus 自体の新機能や仕様変更を扱う intent には `self-feature` を明示して開始する。既存 intent の再開では state に記録されたスコープを使う <!-- cid:scope-definition:default-scope-amadeus -->
- DECIDED: 既存設計・方針・ハーネス間契約との不一致を限定的に是正する intent は `self-fix` を既定とする(不具合、parity、生成物・文書の drift、既存方針の訂正)。Issue 起点は種別を問わずクロスレビュー2名成立を前提とし、intent-first のミラー Issue は record PR の独立2名レビューを前提とする。新機能・新仕様が必要ならユーザーの明示指示を得て `self-feature` へ切り替える <!-- cid:scope-definition:bugfix-scope-for-bug-intents -->
- DECIDED: 外部から観測できる振る舞いを変えず内部構造を改善する intent には `self-refactor` を明示して開始する <!-- cid:scope-definition:refactor-scope-for-refactor-intents -->
- DECIDED: 正規スコープは `self-feature` / `self-fix` / `self-refactor` / `self-document` とし、旧 `amadeus` / `amadeus-bugfix` / `amadeus-feature` / `amadeus-fix` / `amadeus-refactor` は廃止した。互換エイリアスは提供せず、履歴 record 内の記録値のみ監査履歴として保持する <!-- cid:scope-definition:legacy-amadeus-resume-only -->

## Forbidden

- NEVER 手書きの `CHANGELOG.md` を復活させない。リリースノートは release.yml の GitHub Release 自動生成ノートが唯一のソース
- NEVER 既存テストの赤を「自分と無関係」を理由に無視して続行したり、赤いスイートをグリーン・完了として報告したりしない
- NEVER インストーラの挙動を変更するとき、正本・配布物・セルフインストールツリーをコミット間で不整合にしない
- NEVER 隔離2回ビルドの再現性検査、source-only 境界検査、グラフ不変量検査を、ローカルだけの手動チェックリストで代替しない
- NEVER 利用者側の Bun-only 前提を変更する理由を文書化せず、配布フレームワークへ runtime dependency を追加しない
- NEVER `packages/framework/core/` / `packages/framework/harness/` の維持または移動を、ADR / 設計記録なしに暗黙決定しない
- NEVER `dist/` の追跡境界・配置・配布経路の変更を internal refactor として扱わない。README、docs、tests、self-promotion、CI、installer、release asset への影響を棚卸しする
- NEVER 生成された `dist/` やセルフインストールのコピーを独立した正本として編集しない。これらは破棄可能なローカルビルド出力であり、レビュー・コミット対象ではない
- NEVER ローカル filesystem 上の不在を根拠として、実在しないパッケージ構成を捏造しない
- NEVER walking-skeleton stance が有効なとき、standing grant に walking-skeleton gate を認可させない
- NEVER 想定内の grant 失効・取消・scope 不一致 fallback を、fatal error 経路へ流さない
- NEVER `intent-mirror.github.issue.mode` に boolean 値を受け付けない
- NEVER `intent-mirror.github.issue.mode = auto` の consent を、PR マージ、リリース、publish、デプロイ、無関係な外部操作へ拡張しない
- NEVER Amadeus の所有 provenance が不在または不整合な Issue を自動で編集・クローズしない
- NEVER GitHub mirror の失敗を、同期状態の無音喪失や AI-DLC ワークフローの恒久停止の理由にしない

## Mandated

- ALWAYS `packages/framework/core/` または `packages/framework/harness/<name>/` を正本として編集し、`bun run build` で未追跡の `dist/` とセルフインストール面を再生成する。全ハーネスに影響する正本変更後は build を実行し、追跡ファイルが不変であることを確認する
- ALWAYS framework source、全ハーネス配布、self-install 面、tests、対訳ドキュメントを同じ変更で更新する
- ALWAYS `dist/` またはセルフインストールツリーの path を変える案では、再現性検査、source-only 境界検査、グラフ不変量検査、Release Asset と installer の互換性を同じ成果物に書く。Release Asset はクリーン checkout の release workflow だけが生成し、ローカル生成物との byte parity を追跡ファイルへ要求しない
- ALWAYS 新設パッケージ(`packages/*`)は lint(Biome)と型検査(`tsc --noEmit`)の配線をパッケージ追加と同一 PR で加える
- ALWAYS harness 専用ツールを `packages/framework/core/tools/` に置かない(全ハーネス manifest の coreDirs が tools を投影するため構造的に全 dist へ漏出する)。harness 専用は `packages/framework/harness/<name>/tools/` + harnessFiles 投影に置く <!-- cid:code-generation:harness-tools-placement -->
- ALWAYS active scope が `self-feature` なら、既存コードを変更する場合も最初の Construction Bolt に walking-skeleton gate を維持する
- ALWAYS 認可に関わる変更を directive contract、state transition、audit invariant、race、harness drift のテストで検証する
- ALWAYS 変更が触る path が要求する strict typecheck、Biome lint、関連テスト、coverage gate、complexity 検査、配布 drift 検査で検証する
- ALWAYS Intent record を正本とし、GitHub mirror は record → Issue の一方向で同期する。retry は GitHub の部分成功とローカル state 書込失敗を跨いで冪等にする
- ALWAYS mirror Issue を自動クローズする前に Amadeus の所有 provenance とワークフローの着地を検証する
- ALWAYS GitHub の可用性・認証・権限・rate-limit・コマンド失敗の後もワークフローを継続し、未同期の警告と retry 状態を可視に記録する
- ALWAYS 明示的な `intent-mirror.github.issue.mode = auto` は、active Intent に限定した mirror の create / sync / 所有 provenance 確認済み close と、ラベル同期への standing consent として扱う。`intent-initialized` と `intent-capture-approved` 境界で関連 Issue に `in-progress` を付与し、`workflow-completed` 境界で除去する。ラベル同期は fail-open とし、失敗を警告として記録して継続する
- ALWAYS telemetry の export 境界(送出点)でも redaction filter を通す。write-time のみの redaction に留めない <!-- cid:practices-discovery:export-boundary-redaction -->
- ALWAYS markdown artifact は日本語で書く。ただし path、CLI、コード識別子、tool が要求する heading は正確性を優先して保持する
- ALWAYS gh CLI は optional dependency として扱う。利用前に runnable / auth readiness を検査し、不在・未認証・API 障害は当該 invocation を loud fail する。credential は gh の store へ委譲し token を保持・出力しない。create / close の人間承認境界は維持する <!-- cid:practices-discovery:gh-scripts-boundary -->

## CI/CD

- PR を merge-ready と判断する前に、未解決の review thread と未確認のトップレベルコメント / review summary をゼロにする。指摘は対応するか根拠を示して却下したうえで resolve し、resolve 状態を持たないコメントには PR 作者が対応内容または却下理由を返信して確認済みにする。確認文だけで指摘対応を代替しない。最後に最新 HEAD で必須 CI が green であることを実測する <!-- cid:ci-pipeline:review-feedback-closure-before-merge -->
- `main` の Ruleset は Merge Queue を必須とする。PR-level の必須 CI と review feedback closure が green になった PR は、`main` の前進だけを理由に手動 rebase を繰り返さず queue へ投入する。merge-ready の正本は、最新 `main` と queue 内の先行 PR を合成した merge group に対する必須 CI の green とする。自動 PR も Ruleset を bypass せず queue を通す <!-- cid:ci-pipeline:strict-up-to-date-before-merge -->
- CI ゲートを「blocking として実行する」要件は、赤がマージを止めることを要求する。必須 status check が集約ジョブ1件の構成では、集約の `needs` に載らないジョブは advisory に留まる。「いつ走るか」(needs / if を持たない独立性)と「赤が止めるか」(集約の needs への所属)は独立した2面である <!-- cid:code-generation:c1-2814-aggregate-needs-is-blocking -->
- docs を検証対象に含むテストを持つこのリポジトリでは、docs-only の paths-ignore が「doc 変更 → ガード素通り → latent 赤」を構造的に作る。doc-consuming テストが読む doc は paths-ignore から除外するか、ガードを件数フリー契約にする <!-- cid:build-and-test:ci-paths-ignore-doc-guard-blindspot -->
- CI の `TEST_TIME_FACTOR` 既定値は `2` とし、`3` はより低速な実行環境の override として残す <!-- cid:requirements-analysis:test-time-factor-c2 -->
- Snapshot 等の非 blocking job は PR blocking 集約の外に置いてよいが、`main` 上の失敗は赤く可視化する。非 blocking の目的と loud-fail 契約を明記し、一般の必須 CI gate を除外する根拠にしない <!-- cid:ci-pipeline:c3 -->
- 既存 workflow に実装済みなら新規 workflow を二重生成せず、既存 workflow を唯一の正本として文書化・検証する <!-- cid:ci-pipeline:c2 -->
- no-silent-drop ゲートの台帳は追記型 ULID イベント台帳(`tests/no-silent-drop/events/<ulid>.json` — grant / revoke / snapshot)を正本とし、実効集合は順序非依存の集合演算で導く。feature PR は event 追加のみとし、削除・snapshot は maintenance CI 専用。新規 grant は reason 非空と issue 参照1件以上を fail-closed で要求する <!-- cid:code-generation:c1-260803-state-integrity -->

## Corrections

このプロジェクトの構造に根ざす恒久的な是正知識のみを置く。個別 intent の一回性の罠・ツール世代依存の回避策は記録しない(git 履歴と intent record が一次記録)。

- 検査・ゲートの閾値は、対象コーパスへ実述語を適用した**観測レンジの内側**に置く。レンジ外の閾値は全件赤か全件緑になり「どれが外れ値か」を返さない。受け入れテストは**両側**(観測最小値 < 閾値 < 観測最大値)を固定する。水準ごとに位置づけが異なるなら共通規則へ丸めず個別に固定する。ベンチマークの baseline 相対項は、baseline 系列が対象系列と負荷を共有することを実測してから採用する — 空ウィンドウ baseline は絶対判定へ無音退化する <!-- cid:code-generation:c1-threshold-inside-observed-range -->
- 同一 worktree での coverage 計測は branch ごとに単独所有者を決めて直列化する。runner が起動時に coverage ルートを削除するため、並行実行は相互破壊しどちらの verdict も信頼不能になる。フルスイートを合否判定に使う実行中は重いコマンドを並行実行しない — conductor 自身が負荷源になりうる <!-- cid:code-generation:c1-coverage-single-owner -->
- shrink-only ratchet ガードの初期 census は、実装時点の base ではなく**マージ先の最終 base** で採る。増加を admit できない単調ガードでは、base 前進が新規違反を持ち込んだ時点で構造的に赤が確定する。coverage allowlist の行ピンも、行シフトを跨ぐ変更では全エントリを機械 remap したうえで reason と現行行内容の一致を直読照合し、waiver レンジの span 膨張による fail-open も検査する <!-- cid:code-generation:c5-ratchet-census-at-final-base -->
- 帰属の切り分け(自変更由来か既存・環境起因か)は、未改変ベースで**同一条件**を再現し失敗テスト名の集合差で判定する。ベースコミットを自分自身と比較する形は自己参照であり証拠にならない。同一条件には gitignored な外部入力(active-intent cursor、env 等)も含める。生成物依存が疑われる場合は3段で扱う: (1) 許可済み入力のみを植えた ablation を先に試す (2) 存在依存と内容依存を区別する (3) 真に内容依存が残る場合のみベース側で**再生成**して比較する — byte-copy は自変更由来の欠陥を masking するため禁止 <!-- cid:build-and-test:c1-ablation-before-artifact-repro -->
- 消費者の棚卸しは毎回 grep 出力からの転記で作り直し、既存表から複製しない。検索キーは複数軸で持つ: 変数名と展開後リテラル、同一構造への複数アクセス形式、path のセグメント結合形、対訳ドキュメントの実語彙(逐語訳とは限らない)。自然言語 prose の sweep は既定を大小文字非区別とする。全数棚卸しの件数を成果物へ書くときは、再実行して同一結果を得られる検索述語(パターン・対象集合・除外条件)を結果と同じ場所に記録する <!-- cid:application-design:dual-key-consumer-inventory -->
- 実測値(件数・SHA・時刻・pass/fail 数)には取得コマンド・測定対象の ref または tree・列挙元・再計算方法を併記する。再導出できない実測値は実測ではなく主張である。派生値(平均・按分)は算出式を併記し、未実測の推定値を受け入れ基準に使わない
- Bolt の取込(ミラー / マージ)は approve 前ではなく review 前に行う。レビュアーは conductor ツリーを読むため、取込前に出すと成果物が申告する実測を再現できない。取込後は `bun run build` を実行し、配送先ツリーの述語で再実測してからレビュー・ゲートへ出す(`git status` が空でも未追跡の投影の更新は証明されない) <!-- cid:code-generation:c1-mirror-and-rebuild-before-review -->
- 既存 codekb がある場合、reverse-engineering は前回スキャンコミットからの差分リフレッシュで実行する。observed commit にはローカル merge でなく origin/main 系譜のコミットを記録し(squash 運用では非祖先化して base 選定が退行する)、差分 base は HEAD の祖先である observed のうち距離最小を選ぶ。旧 intent の節に残る現在時制マーカーは追記前に履歴ラベルへ更新し、履歴節の file:line はその節が宣言する observed commit で照合する <!-- cid:reverse-engineering:c1 -->
- 再現・検証用の scratch スクリプトは repo 外で実行し、audit / record を書くツールの実験では project-root override を scratch に向ける。resolver・path 解決系の段順を変更するときは、env 変数がテスト隔離シームとして機能している既存契約を変更前に棚卸しする — 段順変更の失敗様式はテストの赤ではなく実 record への無音の書込汚染であり、閉包は当該テストを1本実行して実 record の不変量(audit 行数、memory 層と state の md5)が不変であることで確認する <!-- cid:code-generation:c2-env-isolation-seam-inventory -->
- 台帳ファイルのマージ衝突は、マーカー行の貼り合わせでなく3ステージ blob 全文から再構成する。解決後は競合マーカーの機械検査(`<<<<<<<` / `>>>>>>>` / `|||||||`)を独立ステップで通し、構造化ファイルは parse 検証を併用する。追記型の監査シャードをマージした後は同一行の完全重複検査を1手挟み、重複行は後発出現のみ除去する <!-- cid:code-generation:cg-ledger-blob-reconstruction -->

## Learnings Inbox(未蒸留)

日常の §13 学習・些細なノルム追加はまずこの節へ追記する。定期蒸留ラウンドで本文への昇格(一般化・機械化)または削除を裁定する。蒸留済み本文と未蒸留の具象学習を混在させない。

- bun の lcov は複数行型注釈の継続行を非対称に扱う — targeted 実行(`bun test --coverage` 単体)では DA レコード自体が出ないが、フルパイプライン(`coverage:ci` の合流 lcov)では DA:0 の未カバー行として現れる。patch coverage gate がこの型注釈行だけを赤にした場合、テスト追加では閉じられない — inline の複数行型リテラルを名前付き interface / type へ切り出して行そのものを消すのが正しい閉じ方(実測: PR #2932 で amadeus-state.ts:1760-1763 と cli/git-runner の計 9 行をこの手法で解消)(learned 2026-08-12, intent 260811-pr-convergence-gate pr-convergence, semi 梯子 AUTO_DECIDED) <!-- cid:pr-convergence:lcov-type-annotation-asymmetry -->
- pr-convergence report はマージ後でも `kind: landed` で生成できる — `landed` は第一級 verdict であり、`converged` はマージ前専用(`plugins/pr-convergence/tools/pr-convergence-predicate.ts` の定義: converged は mergeStateStatus CLEAN 等を要求、landed は「マージ済みは収束させる状態でなく記録する事実」)。report の check rollup はマージ後は **merge commit の check-runs** を読むため、PR と無関係な post-merge workflow の失敗で偽 FAILURE 化しうる(実測: Issue #2925(Metrics Snapshot の merge queue 非互換)により rollup PENDING→FAILURE→是正後 SUCCESS の全経路を観測。FAILURE の一次証跡は run 31562759226 の **attempt 1**(`gh api repos/amadeus-dlc/amadeus/actions/runs/31562759226/attempts/1/jobs` で Metrics Snapshot job 94010255732 = failure を再取得可能)— 失敗ジョブの再実行により最新 check-runs では success に置換されているため、attempt 指定なしでは再導出できない)。rollup 赤は PR 自体の欠陥と即断せず、merge commit の failing check を帰属してから対処する (learned 2026-08-12, intent 260812-tla-proof-receipt code-generation, semi 梯子 AUTO_DECIDED `auto-decision-7eadb3d0e5a28b0a04d2457e6e0bfb8a`) <!-- cid:code-generation:c1-landed-rollup-attribution -->

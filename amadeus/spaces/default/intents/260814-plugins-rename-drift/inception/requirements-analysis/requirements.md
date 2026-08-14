# Requirements — 260814-plugins-rename-drift

## 上流入力

- `ideation/intent-capture/intent-statement.md`(問題定義・成功指標)と `ideation/scope-definition/scope-document.md`(In/Out 境界・依存・シーケンシング)— 本書の FR は全てこの2つの能力 A/B/C へ遡れる
- Issue [#2996](https://github.com/amadeus-dlc/amadeus/issues/2996) / [#2997](https://github.com/amadeus-dlc/amadeus/issues/2997)(クロスレビュー2名成立)
- codekb: `architecture.md` の 260814 節(患部 P1〜P5 の逐語確定)と `code-structure.md` の 260814 節(消費者棚卸し 26 件の内訳と述語)— 本 intent の実測はこの2面から引く。`business-overview.md` は本 intent の節を持たないため一般文脈(業務境界: AI-DLC フレームワーク本体)としてのみ参照する
- 実測値は observed = origin/main `cd64486a68c6a1144db50fbe3fde8273f5e18455` 断面(RE が Issue の `c0f9edf27` 断面から更新: パス軸 25→**26**、テスト 19→**20**、config union :58-67→**:58-66**、worktree ガード :146-165→**:143-165**)

## Intent Analysis

達成したいこと(機能の列挙ではなくゴール): (G1) プラグイン命名を依存軸プレフィックス(`github-*` / `git-*`)で予測可能にする、(G2) origin 進行の手戻りを「マージ直前発覚」から「作業中早期検知」へ前倒しする、(G3) 今後の全プラグインが使う設定基盤を最初の実消費者と同時に導入する。失敗様式の中心は「エラーではなく静かな無効化」(scope-bindings キー同期漏れ、宣言綴り誤りの無音デフォルト化)であり、要件は fail-closed / loud 化を一貫して要求する。

## Functional Requirements

### 領域 REN: pr-convergence → github-pr-convergence 改名(#2996、能力 A)

- **FR-REN-1**: プラグインディレクトリを `plugins/pr-convergence/` から `plugins/github-pr-convergence/` へ `git mv` で移設する(13 ファイル — `git ls-files` 実測)。同一変更で `plugin.json` の `name` を `github-pr-convergence` にする。受け入れ: `amadeus-plugin-compose.ts:344` の name=ディレクトリ名検証を green で通過し、`plugins/pr-convergence/` が存在しない。
- **FR-REN-2**: パス軸消費者 26 ファイル(observed 断面実測: プラグイン自身 2 / テスト 20 / coverage-patch-allowlist / complexity-baseline / fixtures README / project.md 歴史引用)のうち、歴史記録(project.md の Learnings 歴史引用)を除く全てを同一 PR で新パスへ同期する。受け入れ: FR-REN-6 の残存参照検査が 0 件。
- **FR-REN-3**: 素の名前軸消費者を同一 PR で同期する: `amadeus/config.json:42` の `plugin.activation.names` 要素、`:60` の `plugin.scope-bindings` プラグイン名キー。受け入れ: 同期後に graph compile の scope-grid で pr-convergence ステージが従前と同一のスコープ行(self-document / self-feature / self-fix / self-refactor)に載ることを実測(`amadeus-graph.ts:1513` の `?? []` silent 脱落が起きていない証明)。
- **FR-REN-4**: `docs/harness-engineering/06-sensors.md:72` / `06-sensors.ja.md:39` のプラグイン名言及を en/ja 同一変更で同期する。受け入れ: 両ファイルにプラグイン名としての旧名参照 0 件(センサー id・ステージ slug としての `pr-convergence` は不変対象)。
- **FR-REN-5**: 次の識別子を変更しない: ステージ slug `pr-convergence`、センサー id `pr-convergence-report-format`、スキル名 `/amadeus-pr-convergence`、ツールファイル名 `pr-convergence-*.ts`。受け入れ: diff にこれら識別子の変更が含まれないことを機械確認(rename PR の diff に対する grep)。
- **FR-REN-6**: 残存参照検査を機械化述語で実測する。パス軸: `git grep -Il "plugins/pr-convergence" -- ':!amadeus/spaces/default/intents' ':!amadeus/spaces/default/elections' ':!amadeus/spaces/default/codekb' ':!amadeus/spaces/default/memory/project.md'` → 0 件(exit 1)。素の名前軸: `amadeus/config.json` と `docs/harness-engineering/` にプラグイン名としての旧名 0 件(不変対象の除外理由を成果物に記録)。受け入れ: 両述語の exit code と除外理由が成果物に記録されている。
- **FR-REN-7**: 既存 workspace の設定移行の扱いを設計段で確定し記録する。`activation.names` は doctor `source-missing` → degraded で loud。`scope-bindings` キーは **silent** のため、移行手順または検証(compile 後の scope-grid 照合等)を必ず手当てする。受け入れ: 設計成果物に方式と根拠が記録され、`plugin-conformance-e2e`・既存スイートが scope-grid の silent 退行を捕捉するかの実測結果が記録されている(捕捉しないなら検証を追加)。
- **FR-REN-8**: `tests/fixtures/pr-convergence/`(7 ファイル)と `t445-stage-frontmatter-compose.integration.test.ts:52`(実プラグイン名 `"pr-convergence"` を直接被検体にしている — RE 実測)の追随可否を設計段で明示的に決定し、FR-REN-6 の除外リストへ反映する。受け入れ: 決定と根拠が設計成果物に記録され、除外リストと整合。

### 領域 SET: plugin.settings 設定機構(#2997 core 側、能力 B)

- **FR-SET-1**: plugin.json に settings スキーマ宣言(キー名・型・デフォルト値・必要なら閉語彙)を導入する。受け入れ: git-drift のスロットル間隔キーが宣言され、スキーマから読める。
- **FR-SET-2**: `plugin.settings.<plugin-name>.<key>` 名前空間を既存の階層解決(`amadeus-config.ts:43` LAYER_ORDER = project → space → intent)で解決する。既存 `AmadeusConfigKey` union(`:58-66`、8 キー)へは 1 キー追加+スキーマ駆動検証で実現し、per-plugin の union 拡張はしない。受け入れ: 3 層の override が宣言デフォルトより優先されることをテストで実測。
- **FR-SET-3**: config 側 fail-closed — 未知キー・型不一致・閉語彙外・機密キー名パターン(token / password / secret 等)を検証エラーにする。**省略のみ**がデフォルト適用(省略と不正値の区別)。既存の未知キー検出(`appendUnknownPathIssue`)の閉性を緩めない。受け入れ: 落ちる実証 — 不正値で fail-closed(赤の実測)、省略でデフォルト適用、既存検出の非退行テスト。
- **FR-SET-4**: 宣言側 fail-closed — `parsePluginManifest`(`amadeus-plugin-compose.ts:331-352`)は未知トップレベルキーを検査しない(fail-open。`advisories` キーが別パーサで読まれる二重パーサ構造も RE で実測)。settings 導入と同時に、未知トップレベルキー検査または settings キーの実在検査を手当てし、`setings` 等の綴り誤りが無音の全設定消失にならないようにする。受け入れ: 落ちる実証 — 綴り誤り manifest で loud エラーの実測。既存の正当な manifest(advisories 含む)が壊れないことも実測。
- **FR-SET-5**: 機密情報は本機構の対象外とし、env 宣言(変数名・用途・required/optional)として分離する。値は永続化せず実行時に環境変数から読む。env 宣言スキーマの先行着地可否(実消費者は将来の `github-*` 系)は設計段で裁定し、根拠を記録する。受け入れ: 裁定と根拠が設計成果物にあり、settings 側に機密が置けないこと(FR-SET-3 の禁止パターン)が実証されている。

### 領域 DRIFT: git-drift プラグイン(#2997 plugin 側、能力 C)

- **FR-DRIFT-1**: `plugins/git-drift/` を stage-less プラグイン(`"stages": []`)として新設し、`sensors/`(advisory マニフェスト)+ `tools/`(センサー実装)+ `seams`(既存ステージの sensors への注入。注入先候補 `code-generation`・`build-and-test`、確定は設計段)を宣言する。stages:[] + sensors + seams の合成形状は前例 0 件(RE 確認: coverage-patch-quick は stages:[] のみ、pr-convergence は stage あり)のため、コンポーザ・投影・conformance が正しく処理することを実測で確認する。受け入れ: `bun run build` 後に全ハーネス投影へセンサーが配送され、plugin-conformance-e2e green。
- **FR-DRIFT-2**: `git fetch` はタイムスタンプでスロットルし、間隔 N はハードコードせず `plugin.settings.git-drift.<key>` で解決する(デフォルトは plugin.json スキーマに宣言)。既定値は「観測レンジの内側」ノルムに従い設計段で実測から決める。受け入れ: 落ちる実証 — 設定変更がスロットル挙動に反映されることの実測(FR-SET 落ちる実証の (iii))。
- **FR-DRIFT-3**: behind 数(`git rev-list --count HEAD..origin/<default-branch>`)に加え、origin 側変更ファイル集合と作業側(作業ツリー+ブランチ)変更ファイル集合の交差を判定する。交差ゼロは情報表示、交差ありは衝突見込みファイルを名指しで警告、台帳系(audit シャード、ULID イベント台帳、`amadeus-state.md`)との交差は優先度を上げる。受け入れ: 落ちる実証 3 経路 — テスト用リポジトリで origin を実際に進め、(i) 交差ありで警告 (ii) 交差なしで情報表示 (iii) fetch 失敗で loud skip、をそれぞれ実測。origin と同期済みの正当な状態で警告が出ないことも実測。
- **FR-DRIFT-4**: 警告文言は merge queue 運用と整合させ(「即 rebase」でなく取り込み/先着地の判断を conductor に促す)、`amadeus-worktree.ts:143-165` の base 鮮度ガード(fail-open、fetch しない)および `:426` の fetch 前例(audit-first の副作用順序)と文言・逃がし・比較ロジックの関係を再利用棚卸しに明記して二重実装を避ける。`advisories` 宣言機構(formal-model-check が使用)との配送方式比較も設計段で記録する。受け入れ: 設計成果物に棚卸しと採否根拠が記録されている。
- **FR-DRIFT-5**: オフライン・fetch 失敗は loud に記録して fail-open(ワークフローを止めない)。git リポジトリでない workspace では安全に不発火。受け入れ: 落ちる実証 (iii) と、非 git ディレクトリでの不発火テスト。
- **FR-DRIFT-6**: 配布経路(フレームワーク同梱で全ハーネス投影か、workspace 単位 opt-in か)を設計段で確定し根拠を記録する。受け入れ: 設計成果物に決定と根拠、および `amadeus/config.json` の `plugin.activation.names` / `plugin.scope-bindings` への影響が記録されている。

### 領域 X: 横断(能力 A/B/C 共通)

- **FR-X-1**: 各 Bolt で `bun run build` により manifest が発見する全ハーネスの dist を再生成し、追跡ファイル不変・plugin-conformance-e2e green・既存テストスイート green・Project/Patch Coverage Gate・complexity ゲート green を実測する。受け入れ: CI のブロッキング集合全体が green。
- **FR-X-2**: 新設ツール(settings 検証・git-drift センサー)の Biome lint と `tsc --noEmit` 配線を同一 PR に含める。受け入れ: `bun run lint` / `bun run typecheck` が新設ファイルを対象に含み green。
- **FR-X-3**: 実行可能な振る舞いの追加・変更は TDD 既定に従う — 実装前に合意済み公開 seam へ失敗テストを 1 件追加して Red を実測し、それを通す最小実装で Green にする vertical slice を反復する(エラーパス・防御的 catch も対象)。受け入れ: 各 slice の Red→Green が作業記録から追跡できる。
- **FR-X-4**: PR は Bolt ごとに 1 本とし(自 intent の record checkpoint 同梱可)、#2996 → #2997 の順でマージする。マージは各 PR について人間の明示承認を得てからスカッシュマージする(AI 自発マージ禁止)。受け入れ: 各 PR のマージ前に承認記録が存在する。

## Non-Functional Requirements

- **NFR-1(性能・定性)**: git-drift センサーはスロットル(FR-DRIFT-2)によりステージ実行のレイテンシへ実害を与えない。数値目標は要件に宣言されていないため、目標なきベンチマークは生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 検証はスロットルが同一プロセス内で fetch を skip する経路のカウンタ/タイミングシーム検証で行い、実時間負荷試験は作らない)。この判定を覆す条件: ユーザーが具体的なレイテンシ目標値を宣言した場合。
- **NFR-2(セキュリティ)**: 機密は settings に置けない(キー名禁止パターンで字句拒否)。env 宣言の値は永続化せず、ログ・telemetry へは write-time と export-time の両 redaction 境界で遮断(cid:practices-discovery:export-boundary-redaction)。
- **NFR-3(互換性)**: 要求されない後方互換レイヤー・移行シムを追加しない(org.md Forbidden)。改名は旧名の挙動を削除して置き換える。既存 workspace の移行は FR-REN-7 の手当てで扱い、旧名フォールバック分岐は作らない。
- **NFR-4(監査性)**: 状態遷移・ゲート・裁定は既存のツール所有監査経路のみで記録し、プラグインから engine/state の変更操作をしない。

## Constraints

- ステージ slug・センサー id・スキル名・ツールファイル名は不変(FR-REN-5。cid・監査履歴・ノルム言及の連続性)
- `packages/framework/core/` / `plugins/` を正本として編集し、`dist/` とセルフインストール面は `bun run build` 再生成(手編集禁止)
- harness 専用ツールを `packages/framework/core/tools/` に置かない
- Bolt 実装は git worktree 分離(本線ツリーのブランチ切替禁止)。新規 worktree では依存インストール+`bun run build` を定型手順に含める
- 1 Issue = 1 Unit 原則からの意図的逸脱(#2997 = core/plugin の 2 Unit 見込み)は Issue 改訂履歴 2 で承認済み。Unit 分割は units-generation 段で確定

## Assumptions

- 前提: `.claude/sensors/` は git 未追跡のローカル投影(RE 実測)であり、プラグインセンサーの配送検証は投影ツリーの述語で行う(cid:requirements-analysis:c2-acceptance-at-delivery-tree)
- 前提: #2999(複数 Unit 対応)以降のパス軸消費者は 26 件で安定。実装時に再実測して差分があれば帰属を確認する(cid:requirements-analysis:mechanism-cite-verify-at-draft — 実装段の再列挙)
- 前提: RE 起票の #3026(formal-model-check 未宣言センサー)/ #3028(docs センサー表 drift)は本 intent のスコープ外で、本 intent の変更はこれらを悪化させない(FR-REN-4 は名前同期のみ)

## Out of Scope

- coverage-patch-quick / formal-model-check への命名規約適用(intent-capture Q1=A)
- `plugin.scope-bindings` 外側キーの fail-closed 恒久対策(#2996 が別 Issue 候補と明記)
- 自前 Secret ストア / #2851 のラベル衛生 / ステージ slug 等の改名(scope-document Out 節)
- docs 06-sensors 表の欠落 3 行の補完(#3028 へ切り出し済み — 本 intent は名前言及の同期のみ)

## Open Questions(設計段送り — 要件欠落ではなく Issue が設計段裁定と明記した事項)

1. FR-REN-7: scope-bindings 移行の方式(手順書 vs 機械検証 vs 両方)
2. FR-REN-8: フィクスチャ名(`tests/fixtures/pr-convergence/`・t445 の PLUGIN 定数)の追随可否
3. FR-SET-5: env 宣言スキーマの先行着地可否
4. FR-DRIFT-1: seams 注入先ステージの確定
5. FR-DRIFT-4: advisories 宣言機構 vs センサー方式の採否
6. FR-DRIFT-6: 配布経路(全ハーネス同梱 vs opt-in)
7. FR-DRIFT-2: スロットル既定値(観測レンジ内側での決定)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T08:04:53Z
- **Iteration:** 1
- **Scope decision:** none

requirements.md の23件のFR(REN8/SET5/DRIFT6/X4)はscope-document のCapability A/B/C・In/Out境界へ漏れなく写像され、observed断面(cd64486a6)のcodekb実測値(パス軸26件・テスト20件・config union:58-66・worktreeガード:143-165)とも一致しており、business-overview.mdに260814節が無いことも正しく認識されて一般文脈引用に留めている。深度帯域(Standard 15-30)にも収まる。

### Findings

- FOLLOW-UP | FR-SET-2 は既存 AmadeusConfigKey union(8キー)へ「1キー追加+スキーマ駆動検証」で実現するという実装アプローチをFRとして固定しているが、これは要件でなくアーキテクチャ判断に近い。設計段(application-design/functional-design)でこの1キー方式が本当に成立するか(例: ネストしたsettingsオブジェクトの型検証がAmadeusConfigKey union機構と整合するか)を再検証し、成立しない場合は本FRを是正する必要がある。
- FOLLOW-UP | FR-DRIFT-1 は「stages:[] + sensors + seams の合成形状は前例0件」と自ら明記しており、コンポーザ・投影・conformanceの対応可否が未検証のまま設計段へ送られている。設計段でこの合成形状が既存の amadeus-graph.ts / amadeus-plugin-compose.ts の投影ロジックで機械的に扱えることを早期に spike 確認しないと、Capability C全体の実現可能性に影響する — Open Questions節に明記済みだが、設計段の最初のステップとして優先度を上げることを推奨する。
- NIT | Intent Analysis の G1「プラグイン命名を…予測可能にする」は物語的ゴール記述であり測定可能性は不要だが、対応する成功指標(Success Metrics)は intent-statement 側にのみ存在し requirements.md 側では NFR/FR の受け入れ基準に分解されている。トレーサビリティ自体は成立しているため指摘のみ。

# Scope Document — 260814-plugins-rename-drift

上流入力: `ideation/intent-capture/intent-statement.md`(本書の境界はその Initial Scope Signal を詳細化したもの)。feasibility-assessment / constraint-register は本スコープ(self-feature)で feasibility ステージが SKIP のため不在(expected)。

## In(スコープ内)

### Capability A: pr-convergence → github-pr-convergence 改名(#2996)
- ディレクトリ移設 `plugins/pr-convergence/` → `plugins/github-pr-convergence/`(13 ファイル、`git mv`)+ `plugin.json` の `name` 同時変更(`amadeus-plugin-compose.ts:344` がディレクトリ名一致を強制)
- パス軸消費者の同期(観測 ref `c0f9edf27` で 25 ファイル): テスト 19(integration 14 + unit 5)、`tests/.coverage-patch-allowlist.json` パスピン 5 件、`tests/.complexity-baseline.json` 5 件、`tests/fixtures/pr-convergence/README.md`
- 素の名前軸消費者の同期: `amadeus/config.json` の `plugin.activation.names`(loud)と `plugin.scope-bindings` プラグイン名キー(**silent 退行リスク — 主要リスク**)、`docs/harness-engineering/06-sensors.{md,ja.md}`
- 既存 workspace の設定移行手当て(方式は設計段確定)+ scope-grid silent 退行の検証追加判定
- 残存参照検査(両軸の機械化述語、除外理由の記録)
- 不変: ステージ slug `pr-convergence`、センサー id `pr-convergence-report-format`、スキル名 `/amadeus-pr-convergence`、ツールファイル名 `pr-convergence-*.ts`、歴史記録(intents/elections/codekb、project.md Learnings 歴史引用)

### Capability B: plugin.settings 設定機構(#2997 core 側)
- plugin.json の settings スキーマ宣言(キー名・型・デフォルト・閉語彙)
- `plugin.settings.<plugin-name>.<key>` の階層解決(project → space → intent、既存 `amadeus-config.ts` 基盤へ相乗り)
- fail-closed 検証: config 側(未知キー・型不一致・閉語彙外・機密キー名パターン拒否)+ 宣言側(未知トップレベルキーまたは settings キー実在検査 — `setings` 綴り誤りの無音デフォルト化防止)
- env 宣言スキーマの先行着地可否は設計段裁定(実消費者は将来の `github-*` 系)
- 落ちる実証4項(不正値 fail-closed / 省略デフォルト / 設定値の実消費 / 宣言側綴り誤り loud)

### Capability C: git-drift プラグイン(#2997 plugin 側)
- `plugins/git-drift/` stage-less 新設(`"stages": []` + `sensors/amadeus-git-drift.md` + `tools/amadeus-sensor-git-drift.ts` + `seams` 注入。合成形状は前例 0 件 — コンポーザ・投影・conformance の実測確認必須)
- センサー仕様: settings 経由のスロットル付き `git fetch`、behind 数 + origin 側変更ファイルと作業の交差判定、台帳系交差の優先警告、merge queue 整合の文言、オフライン・fetch 失敗の loud fail-open
- `amadeus-worktree.ts:146-165, :426` の base 鮮度ガードとの再利用棚卸し(二重実装回避)、`advisories` 宣言機構との比較 — 設計段
- 配布経路(全ハーネス同梱 vs opt-in)— 設計段確定
- 落ちる実証3経路(交差あり警告 / 交差なし情報表示 / fetch 失敗 loud skip)

### 横断
- `bun run build` 全ハーネス dist 再生成・追跡ファイル不変・plugin-conformance-e2e・既存スイート・coverage/complexity ゲート green
- 新設ツールの Biome lint・`tsc --noEmit` 配線を同一 PR に含める
- TDD 既定(Red 実測 → 最小実装 Green の vertical slice)
- Bolt ごとに PR、収束ループ、人間承認でスカッシュマージ

## Out(スコープ外)

- coverage-patch-quick / formal-model-check への命名規約適用可否(#2996 対象外節 + intent-capture Q1=A)
- `plugin.scope-bindings` 外側キーの fail-closed 検証の恒久対策(#2996 が別 Issue 候補と明記)
- 自前 Secret ストア(委譲方針と矛盾 — #2997 非採用理由)
- #2851 の in-progress ラベル衛生(#2997 が別件記録と明記)
- ステージ slug・センサー id・スキル名・ツールファイル名の改名

## 依存とシーケンシング(Q1/Q2 = A)

- #2996 と #2997 に実装依存はないが、命名規約の一貫性のため #2996 を先行(ユーザー指示)
- #2997 内: Capability B(core 設定機構)が Capability C(git-drift = 最初の実消費者)の前提。同一 intent 要件(先行着地禁止)により B と C は本 intent 内で揃える
- dependency-first: A → B → C の順に Unit を編成(Unit 分割の確定は units-generation 段)

## デッドライン(Q3 = A)

なし。両 Issue とも P2(通常)。

## Value Stream(能力 → 顧客価値)

| 能力 | 顧客 | 価値 |
|---|---|---|
| A 改名 | プラグイン利用・拡張開発者 | 依存軸(github-*/git-*)が名前から読める予測可能な命名体系 |
| B 設定機構 | 今後の全プラグイン作者 | 設定値の宣言・階層解決・fail-closed 検証の共通基盤 |
| C git-drift | worktree 並行作業者全員 | 手戻りの早期検知(マージ直前 → 作業中へ前倒し)、衝突見込みファイルの名指し警告 |

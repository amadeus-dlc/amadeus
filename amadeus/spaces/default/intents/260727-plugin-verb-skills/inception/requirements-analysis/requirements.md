# Requirements — 260727-plugin-verb-skills

上流入力(consumes 全数): intent-statement.md(スコープ裁定と成功指標)、scope-document.md(CAP-1〜5 の In/Out 境界)、business-overview.md(#1596 後の価値所在)、architecture.md(plugin CLI 動詞体系・ホストルート統一・#1598 機序の実測)、code-structure.md(対象ファイル配置と行実測)、team-practices.md(適用 practices 対応表)

## 承認系譜

- スコープ: intent-capture ユーザー直接裁定 2026-07-27T14:58:20Z(#1597 提案1〜4 フル + #1598 同乗)
- RA 裁定: 2026-07-27T15:47:53Z — Q1 = A(スキル全7面投影)/ Q2 = A(install 衝突は一致続行・不一致 fail+`--force`)(requirements-analysis-questions.md)
- 委譲済み設計判断: #1598 の実現方式(compose 時ホスト側生成 vs runner-gen 拡張)は application-design の ADR(decision-log.md D3)。本書はその**観測可能な契約**のみを固定する

## FR-1: `install <path>` verb(plugin CLI)

`packages/framework/core/tools/amadeus-plugin.ts`(現4 verb: parsePluginCliArgs:146-153、install 不在を RE 実測)へ `install` を追加する。

- FR-1a コマンド形: `amadeus-plugin.ts install <path> [--force] [--project-root <dir>]`。`<path>` は plugin ディレクトリ(名前は basename から導出)。USAGE(:100-106)へ1行追加
- FR-1b 動作: `<path>` の内容を `<hostRoot>/.amadeus-plugin-src/<name>/`(pluginSourceRootOf:329-331)へコピーし、その後既存 compose 経路(handleCompose 相当)へ委譲する。trust 境界は不変 — compose の三層検証・承認ゲート経路に一切手を入れない(constraint C6)
- FR-1c 衝突契約(Q2 裁定 A): staging に同名が既存のとき、(i) 内容一致(全ファイルのバイト一致)なら冪等再試行として続行 (ii) 不一致なら exit 1 の loud 失敗(何をどうすべきかを stderr に明示) (iii) `--force` 指定時のみ置換。無音上書き経路を作らない
- FR-1d 部分失敗と再試行(ideation/feasibility/raid-log.md の R3): コピー途中失敗・compose 失敗のいずれでも、再実行が重複副作用なしに収束すること(コピーは一時領域→rename か、再試行時の一致判定で冪等化 — 方式は design 確定)。失敗は既存結果 union `PluginCliResult`(:87-94)の `failure` variant の様式で stage を明示する(`failure.stage` への新値追加可 — design 確定)
- FR-1e 結果契約: 成功時は新しい結果 kind(または composed 委譲結果)で「何がどこへ入り compose がどうなったか」を stdout 1行以上で報告し exit 0。exit code 規約(renderPluginCliResult:645-670 の 0/1/2 体系)を維持
- FR-1f テスト: handlePluginCli in-process seam(:674-676)経由で (i) 新規 install 成功 (ii) 一致再試行 (iii) 不一致 fail (iv) --force 置換 (v) compose 失敗伝播 の5ケース以上。coverage は in-process 駆動(registry に amadeus-plugin unit 不在の実測 — bun-coverage-spawn-blindspot)

## FR-2: `/amadeus plugin <verb>` ユーティリティハンドラ

`packages/framework/core/tools/amadeus-utility.ts`(switch :5945、"plugin" case 0 ヒットを RE 実測)へ委譲 case を追加する。

- FR-2a 形: `/amadeus plugin <status|compose|drop|doctor|install>` → `amadeus-plugin.ts` への子プロセス委譲(既習様式 = handleMigrate:5900-5929: spawnSync・stdout/stderr 透過・exit code 伝播)。utility.ts 側は薄い dispatch に留める(ideation/feasibility/raid-log.md の R2)
- FR-2b usage 同期(三重定義の RE 実測、範囲は起草時再実測済み): default die(:6031-6034、Usage 文字列本体は :6033)・HELP_TEXT_TAIL(:216-252、終端バッククォートを awk 実測)・t67 pin の3面を同一変更で更新
- FR-2c 引数透過: verb 以降の引数(`<path>`、`--force`、`--project-root` 等)を無加工で委譲する。verb 欠落・未知 verb は plugin CLI 側の usage-error(exit 2)を透過
- FR-2d テスト: in-process seam で委譲配線(コマンド配列の構成)と exit code 伝播をピン。complexity baseline への接触は匿名増ゼロで回避(complexity-baseline-ordinal)

## FR-3: `amadeus-plugin` ユーザー起動スキル

- FR-3a 正本: `packages/framework/core/skills/amadeus-plugin/SKILL.md`。様式 = amadeus-mirror(94行、frontmatter: name/description/argument-hint/user-invocable、節構成: Purpose and boundary → status first → Canonical command contract → 固定 verb 実行)
- FR-3b 投影(Q1 裁定 A): 全7ハーネス面(claude/codex/cursor/kiro/kiro-ide/opencode/kimi)へ manifest 投影する — mirror の投影行列と同一集合。dist:check / promote:self:check で drift 固定
- FR-3c ハーネス中立文言: `<harness-dir>` 解決の列挙は現行7ハーネスを網羅する(mirror SKILL.md:14-17 の5面列挙が陳腐化している RE 実測を繰り返さない — 可能なら列挙自体を count-free / 導出形にする)
- FR-3d ガード: `--stage` と `--single` の両マーカーを含めない(pruneOrphanRunners:342-356 の保護条件 — runner drift guard の誤対象化防止)

## FR-4: runner-gen の plugin 対応(#1598)

方式は ADR 委譲(D3)。観測可能な契約のみ固定する:

- FR-4a compose 後、composed plugin stage(例 formal-model-check)に対応する stage-runner スキル `/amadeus-<slug>` がホストのスキル面に存在し、`--stage <slug> --single` 経路で当該 stage を単段実行できる
- FR-4b drop 後、当該 runner は残存しない(FS 復元の完全性 — #1586 と同水準)
- FR-4c stock 面の不変: plugin 未導入ホスト(本 repo を含む)で runner-gen `write`/`check` の出力・verdict が現行と不変。t129 の硬い数値(29 runnable / 3 init、t129:203-209)を plugin 導入ホストで偽赤にしない — 対処形(count-free 化 or plugin 除外の明示)は design で確定し、変更する場合は落ちる実証を伴う
- FR-4d 検証ギャップの閉包(code-quality-assessment.md の残存リスク実測): 本 repo は `.claude/plugins` 不在のため #1598 の再現・閉包は compose 済みホストを模した fixture / E2E(t341 系の拡張または新設)で実測する。「未検証と明記」は基準の代替にならない(bt-no-silent-scope-narrowing / exemption-clause-must-not-substitute)

## FR-5: 投影と docs

- FR-5a 正本変更後、dist 全7ハーネス+self-install を同一変更で再生成(`bun scripts/package.ts` + `bun run promote:self`、dist:check / promote:self:check green)
- FR-5b docs/guide/19-plugins.md / .ja.md の入口案内を raw CLI からスキル/ハンドラ(`/amadeus plugin <verb>`、`/amadeus-plugin`)へ更新。EN/JA 同一変更同期。件数語は隣接列挙原則に従う
- FR-5c INSTALL.md 生成器(plugin-projection.ts installDoc:581-、3クラス)の folder-drop-auto / manual-only クラスの文言に install verb の1操作手順を反映(native-manifest = claude は marketplace のため対象外)

## 横断チェックリスト(requirements-analysis:c4)

- 規模増: plugin 数の増加は status/doctor の行数増のみ(ページング不要 — 想定数は一桁)
- クラッシュ耐性: FR-1d の冪等再試行契約。compose 側の原子性は既存機構(atomic engine)に委譲
- 別 OS: コピーは Bun の FS API のみ(exec bit 不要 — 既存 hooks 方針)。CI は Linux で t341 系が実行される
- 消費側棚卸し: usage 三重定義(FR-2b)、INSTALL 生成器3クラス(FR-5c)、docs EN/JA(FR-5b)、t67/t129/t341 のテスト消費面を実装時に grep で再列挙する(enumeration-reverify-at-implementation)

## 受け入れ基準(全体)

1. `bun run typecheck` / `lint` / `dist:check` / `promote:self:check` / `bash tests/run-tests.sh --ci` すべて exit 0
2. FR-1f / FR-2d の新規テスト green + 局所 lcov で新規行の未カバー 0(local-lcov-pre-push)
3. FR-4a/4b が fixture/E2E の実測で green(FR-4d)
4. 既存 t341(plugin conformance E2E)green 維持

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-27T15:55:10Z
- **Iteration:** 1
- **Scope decision:** none

CAP-1〜5 と FR-1〜5 の対応・合否基準・裁定転記の一致を独立照合で確認。Minor 3件(結果 union の呼称、FR-2b 引用範囲の未検証可能性、R2/R3 の出典未特定)のみで実装着手を妨げる欠陥なし。Minor 3件は conductor が受領後に是正済み(呼称精密化・引用範囲の awk/sed 再実測・raid-log.md 出典明記)。

### Findings

- [Minor] FR-1d の『failure union』呼称 → 『PluginCliResult の failure variant』へ是正済み
- [Minor] FR-2b の引用範囲(die :6032-6034 / HELP_TEXT_TAIL :216-252)が起草時未検証の可能性 → conductor 再実測で die 本体 :6033・TAIL :216-252 を確定し本文へ反映済み
- [Minor] R2/R3 参照の出典が consumes 範囲で未確認 → ideation/feasibility/raid-log.md を出典として明記済み

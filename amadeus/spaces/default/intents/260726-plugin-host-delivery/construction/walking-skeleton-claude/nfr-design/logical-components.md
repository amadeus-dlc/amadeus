# 論理コンポーネント — U2 walking-skeleton-claude

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

全設計確定後に導出した実装モジュール構成(component-methods C1〜C4 と business-logic-model フロー 1〜5 からの転記)。

## 実装モジュール構成

| モジュール | 位置 | 主要関数・内容 | 由来 |
|---|---|---|---|
| engine(移設 — 挙動不変) | `packages/framework/core/tools/amadeus-plugin-compose.ts` | 現 `scripts/plugin-composition.ts` の export 群をシグネチャ不変移設: SEAM_NAMES / discoverPlugins / parsePluginManifest / inspectPlugin / mergeSeamEntries / planPluginComposition / planPluginDrop / runRecovery / applyPluginPlan / applyPluginDrop / diagnosePlugins / createNodeBackend / createNodeLock / compositionToJson。ReadOnlyFs seam は同居移設または core 側最小定義(二重定義しない — C2) | reliability-design(アトミック既存機構)/ security-design(NFR-1 層別表) |
| CLI | `packages/framework/core/tools/amadeus-plugin.ts`(ハーネス中立 — coreDirs 投影で各 `<harnessDir>/tools/` へ配布。harness-tools-placement 準拠) | `handlePluginCli(argv, deps): Promise<number>`(in-process seam)/ `parsePluginCliArgs(argv): Result<PluginCliCommand, CliParseError>` / no-op 高速路判定(compose --if-stale 入口) | security-design(fail-closed パーサ)/ performance-design(判定・到達カウンタ seam) |
| claude projector | `projectPluginForHarness(plugin, "claude", outDir)` — 既存 packaging 面(`scripts/plugin-projection.ts` / `scripts/package.ts` 編入。最終配置は既存 projection 面の実構造に合わせ実装時確定) | `.claude-plugin/plugin.json`+hooks snippet(SessionStart 1 行)+`plugins/<name>/` 内容の生成、出力先安全検査(plan 段拒否)、0-plugin no-op | scalability-design(単一正本投影)/ security-design(出力先安全) |
| claude フック配線 | `packages/framework/harness/claude/` の settings 面(SessionStart hooks — C4) | `bun <harnessDir>/tools/amadeus-plugin.ts compose --if-stale` 1 行+失敗時 stderr 警告 | security-design(loud continue) |

## テスト層配置(fs-tests-integration-first)

| テスト | 層 | 根拠 |
|---|---|---|
| parsePluginCliArgs の受理・拒否全列挙(純関数、fs 不使用) | tests/unit | 純関数層のみ unit |
| no-op 高速路(到達カウンタ 0+書込不発生)/ 冪等 compose×2 / baseline 復元 hash / 各段失敗注入の不変性 | tests/integration | 実 FS・composition record を触るため integration(fs-tests-integration-first)。in-process 駆動で lcov 有効(層と計測軸は独立) |
| 既存 t252-254(移設後 green 維持) | 現行層のまま | reliability-design(挙動不変の実証) |
| SessionStart hook 実起動 → compose 入口到達 → compiled graph 反映 → drop 復元(business-logic-model フロー 4 の E2E) | tests/e2e | 実ハーネス起動を伴う(verification theatre 禁止 — security-design) |

- 検証コマンド: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`(reliability-design の dist 同期合否を含む)
- 要件対応: 到達カウンタ・書込不発生テスト = performance-requirements の no-op 合否 / 拒否全列挙・実起動 E2E = security-requirements の fail-closed・実起動検証合否 / 冪等・baseline 復元 = scalability-requirements の冪等合否 / 失敗注入・t252-254 維持 = reliability-requirements のアトミック・回復合否へそれぞれ trace する

## 障害分離(failure domains / blast radius / isolation / shared resources)

- **failure domains**: U2 のモジュールは 4 つの障害領域に分かれる。(1) **engine 適用面**(atomic tx 内 — planPluginComposition / applyPluginPlan / applyPluginDrop / runRecovery が同居。business-logic-model フロー 1/3 の適用経路)、(2) **CLI パーサ面**(parsePluginCliArgs — 純関数、fs 非接触)、(3) **フック起動面**(claude SessionStart hook — engine とは別プロセスで `bun … compose --if-stale` を起動)、(4) **投影ビルド面**(claude projector — `scripts/package.ts` 編入セクション、ビルド時のみ実行)。
- **blast radius**: (1) compose / drop の途中失敗は atomic tx の runRecovery が host bytes を呼出前状態へ復元し、composition record・self-install ツリーへの波及ゼロ(失敗注入テストの不変性 assert が固定)。(2) パーサ拒否は typed failure → exit 1 で書込ゼロ — engine 適用面へ到達しない。(3) フック起動失敗は stderr 警告 1 行でセッション継続(loud continue — security-design)— ハーネスセッション自体を止めない。(4) 投影失敗は dist 出力のみに閉じ、workspace・record は不変(0-plugin 時は no-op で byte-identical)。
- **component isolation strategy**: 適用面は既存 atomic tx 機構(失敗時 runRecovery)で分離。パーサは純関数化(parse-don't-validate — 検査済み値だけを engine へ渡す)。フック起動はプロセス境界(hook は 1 行起動のみでロジック非保持)。投影は plan 段の出力先安全検査で mutation 前拒否。
- **shared resources**: **composition record**(書き手 = U2 の compose / drop 経路のみ。U5 doctor・U6 判定は読むだけ)、**compiled graph**(再 compile は既存 amadeus-runtime.ts compile へ委譲)、**dist/plugins/ claude 面**(U2 が claude projector を新設 — U3 は残面追加で claude 面へ触れない分担)、**DropsRecord**(U2 が骨格を書く — U4 がエントリ追加、U5 が読取)。

(nfr-design Step 6 の必須内容 — U2 ND レビュー iteration 1 Major 指摘の是正 2026-07-27)

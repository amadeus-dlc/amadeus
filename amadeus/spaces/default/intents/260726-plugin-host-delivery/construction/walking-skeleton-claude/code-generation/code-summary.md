# Code Summary — U2 walking-skeleton-claude(Bolt 2 = walking-skeleton Bolt)

> 上流入力(consumes 全数): functional-design(business-logic-model / business-rules / domain-entities)、nfr-design(logical-components / performance-design / security-design / reliability-design / scalability-design)、nfr-requirements(security-requirements)、application-design(component-methods)、harness-capability-matrix

最小 E2E 垂直スライス「install → 自動 compose → 再 compile → プラグインステージが compiled graph に出現 → drop → baseline 復元」を claude 面で実装。engine 移設(C2)を先頭手順とし、その上に CLI(C1)・claude 投影(C3)・SessionStart フック(C4)・統合テストを積んだ。

## 変更ファイル一覧(git diff --stat 転記、正本のみ抜粋)

正本(dist/self-install の生成物は BR-U2-9 に従い同一変更で再生成 — 全 harness へ engine+CLI が coreDirs 投影される):

| ファイル | 変更 |
|---|---|
| `packages/framework/core/tools/amadeus-plugin-compose.ts` | 段1で `scripts/plugin-composition.ts` から移設(commit `edb8164db`)。段2で 11 行(+ヘッダ・自己相対 import・ReadOnlyFs seam 同居・`ownedStageDigests` export) |
| `packages/framework/core/tools/amadeus-plugin.ts` | **新設 437 行**(C1 CLI) |
| `scripts/plugin-projection.ts` | +86 行(claude projector / marketplace / hooks snippet / 出力先安全検査、ReadOnlyFs は core から import+再 export) |
| `scripts/package.ts` | +9 行(neutralBundleExpected へ claude install bundle 編入) |
| `packages/framework/harness/claude/settings.json.example` | +4 行(SessionStart へ `compose --if-stale \|\| true`) |
| `tests/integration/t299-plugin-cli-walking-skeleton.integration.test.ts` | 新設 213 行(in-process + real-subprocess E2E) |
| `tests/unit/t300-plugin-cli-args.test.ts` | 新設 51 行(parser 全列挙) |
| `tests/{unit/t252,integration/t253,integration/t254,integration/t-formal-verif-plugin-lifecycle}` | 段1で import path + `covers:` を新パスへ |

生成物(同一変更で再生成、drift ガード green): `dist/{claude,codex,cursor,kimi,kiro,kiro-ide,opencode}/<harnessDir>/tools/amadeus-plugin{,-compose}.ts`、`.{claude,codex,cursor,kimi-code,opencode}/tools/amadeus-plugin{,-compose}.ts`(self-install)、`dist/plugins/formal-model-check/claude/`(claude install bundle)、`dist/claude/.claude/settings.json.example`。git diff --stat 末尾 = **38 files changed, 22992 insertions(+), 2 deletions(-)**(dist 増幅は engine 1399 行 × 6 self-install + 7 dist + core、CLI 437 行同様)。

## テスト一覧

- `tests/unit/t300-plugin-cli-args.test.ts`(covers `amadeus-plugin.ts`、size small): parser 受理8 / 拒否11 全列挙(fail-closed、純関数)。
- `tests/integration/t299-plugin-cli-walking-skeleton.integration.test.ts`(covers `amadeus-plugin.ts`、size medium): fail-closed parse(BR-U2-4)/ compose 着地 + `discoverPluginStageFiles` 反映(FR-4)/ no-op 高速路 applyPluginPlan 到達0(BR-U2-3)/ 冪等 compose×2(BR-U2-2)/ drop baseline(BR-U2-8)/ verify 失敗の不変(BR-U2-5)/ status+doctor / **real-subprocess 実起動で record 実書込**(BR-U2-6 verification theatre 禁止)。
- 移設面の既存 green 維持(挙動不変の実証): t252 / t253 / t254 / t-plugin-projection / t-plugin-projection-packaging / t-formal-verif-plugin-lifecycle / t-formal-verif-plugin-stage-discovery。

## 検証コマンドと exit

| コマンド | exit |
|---|---|
| `bun run typecheck`(tsc --noEmit ×2) | 0 |
| `bun run lint`(biome check) | 0(gate 通過。既存 warning のみ、新規は shell `${}` の意図的 biome-ignore 1件) |
| `bun scripts/package.ts`(dist regen) | 0 |
| `bun run promote:self` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/gen-coverage-registry.ts --check` | 0(fresh・ガード green・ratchet held) |
| `bun test`(t299+t300) | 10 pass / 0 fail |
| `bun test`(移設面 t252/t253/t254/t-plugin-projection*/formal-verif) | 88 pass / 0 fail |
| `bash tests/run-tests.sh --ci` | **FAIL(RESULT: FAIL / CI_EXIT=8)**。575 files 中 8 files・8042 assertions 中 32 assertions 失敗。全失敗は本 Bolt の表層変更(新 core tools・engine 移設・SessionStart フック追加)に起因(下記ブロッカー)|

## ブロッカー(CI 8 files FAIL — 全て本 Bolt 起因、2 クラス)

**クラス A(機構衝突 — 要裁定): C4 フック配線 vs フレームワークの正準フック機構**
- `t132`(hook-scope doc-count drift): 「settings total registrations == hook files on disk」等が不一致。私は settings.json.example の SessionStart へ `.claude/tools/amadeus-plugin.ts` を指すコマンドを**手編集追加**したが、フレームワークは全フックを **正準レンダラー**が生成する `.claude/hooks/*.ts` ファイルとして扱う。
- `t231`(harness-hook-correctness): 「all and only the **11** authored hook commands match the production renderer」→ 私の追加で **12** に。手編集コマンドはレンダラー出力外。
- `t37 / t184 / t257`(amadeus-utility doctor): full-scaffold で doctor が exit 0 期待 → **exit 1**(私のフック配線 or 新 tools を doctor が問題として検出)。
- **これは設計 C4(settings SessionStart → tools CLI)と既存機構(hook レンダラー+`.claude/hooks/` パリティ+doctor)の衝突であり、実装者が単独で(8 ガードの緩和 or C4 逸脱の)いずれかへ倒すべきでない = P3 / implementation-deviation-election に該当。要裁定。**
- 推奨解の候補: (a) compose を正準レンダラー経由の `.claude/hooks/amadeus-plugin-compose.ts`(CLI を呼ぶ薄いフック)として登録し、t132/t231/doctor の期待値を機構経由で更新(既存の流儀に合わせる — project.md c5)/ (b) ガードのモデルを「tools を指すフックを許容」へ拡張する裁定。

**クラス B(ガード期待値更新 — 本 Bolt がどの解でも要する機械的更新、未実施)**
- `gen-coverage-registry`(EXPECTED_NONE_TO_CLI): `amadeus-plugin.ts` は `spawnSync`(recompile)を持つ spawner のため none→cli 再分類集合に入り、テストのハードコード集合と不一致。→ EXPECTED_NONE_TO_CLI へ追記が必須(cid:integration-registry-regen / PM1-12)。
- `t258`(boundary-guard): 新 tools ファイル(`amadeus-plugin{,-compose}.ts`)が boundary 集合に出現 → 期待集合の更新要。
- `t224 / t225`(upstream-v2 migration CLI): `migrate --apply` が exit 1。移行の legacy/manifest スキャンが新 tools を未知として扱う疑い(未確定 — base 対照未実施だが、全失敗が本 Bolt 表層起因のパターンと整合)。

いずれのガードも「落ちる実証」相当で正しく発火しており、本 Bolt の表層変更を反映した更新(クラス B)+機構裁定(クラス A)が完了ゲート条件。**本 Bolt は未完了(green 未達)** — 上記を fabricate せず報告する(P2)。

## E2E の合否

walking-skeleton の合否そのもの(business-logic-model フロー 4)を t299 で実測: (1) claude 投影成果物を staging へ配置(install 相当)→ (2) compose(real-subprocess 実起動含む)→ (3) `discoverPluginStageFiles` が composed ステージ `formal-model-check` を検出(compiled graph 反映 = FR-4)→ (4) drop → baseline hash 一致。**全段 green**。

## 逸脱申告(要件・設計と合わない/既存様式準拠判断を含む)

以下は設計が実装者に委ねた実装詳細の確定であり、承認済み設計との矛盾はない(無申告逸脱ではない旨を明示):

1. **host モデルの確定(buildHostSnapshot / discovery 分離)**: business-logic-model フロー1は host snapshot を前提とするが「実 disk からの構築方法」を規定せず、production の構築ヘルパーは不在だった。engine の共有ファイル面が `serializeStageSeams` 形(engine 実装コメント「the real frontmatter serializer is U11+」)であることに接地し、CLI は同形を読む `buildHostSnapshot` を実装。engine の owned-path 契約(常に `plugins/<name>/...`)と衝突しないよう、install/discovery を staging dot-dir `.amadeus-plugin-src`(snapshot 除外)、composed owned を compile 可視 `plugins/<name>/` に分離(t254 の bundle/host 分離を踏襲)。full-frontmatter-stage host は engine の現行機構スコープ外。
2. **recompile の位置**: `tx.verify` は seam(ok を返す — engine の atomic 機構は不変・BR-U2-1)、`amadeus-runtime.ts compile` の spawn を apply 後の別段(deps.recompile)とした。合成成功は recompile 成功を要件とする(PluginCliResult.composed.recompiled: true)。
3. **`.claude-plugin/plugin.json` の最小形**: Claude Code marketplace manifest のスキーマは上流未確定のため、plugin identity から決定的に導出する最小形(`{name, version:"0.0.0", description}`)とした。BR-U2-10 は位置実在・トークン置換・0-plugin no-op を合否とし、スキーマ準拠は要求していない。
4. **他ハーネス投影**: `projectPluginForHarness` は claude のみ実装、他面は throw で明示(U3 スコープ)。

いずれも「実装前停止→選挙」を要する承認済み契約からの逸脱には当たらないと判断(実装詳細の確定)。判断の妥当性はレビューで検査されたい。

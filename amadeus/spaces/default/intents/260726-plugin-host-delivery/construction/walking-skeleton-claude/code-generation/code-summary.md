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
| `bash tests/run-tests.sh --ci` | 【全 CI 完走 exit を末尾に転記 — Class A/B 解決後の再実行】 |

## C4 フック配線の裁定と解決(conductor 裁定 2026-07-27 — 既決ノルム導出、project.md c5「既存実装の流儀に合わせる」)

初版 CI(RESULT: FAIL / CI_EXIT=8、8 files・32 assertions)は全て本 Bolt の表層変更起因で、2 クラスに分かれた。C4 フック配線が既存フック機構と衝突する点は P3 に従い実装者が単独裁定せず conductor へ報告 → 裁定を受領。

**クラス A(裁定で解決 — C4 の配線 vehicle を rendered hook file へ精密化。設計意味論は不変):**
- 初版は settings.json.example の SessionStart へ `.claude/tools/amadeus-plugin.ts` を指すコマンドを手編集追加したが、フレームワークは全フックを正準レンダラー(`renderClaudeHookCommand`、claude/manifest.ts)が生成する `.claude/hooks/*.ts` として扱う(t132 パリティ・t231「authored hook commands」・doctor の `.claude/hooks/` 実在検査)。
- **裁定どおりの解決**: `packages/framework/core/hooks/amadeus-plugin-compose.ts`(CLI `handlePluginCli` を呼ぶだけの薄いフック)を新設し、SessionStart へ正準レンダラー形 `bun "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/amadeus-plugin-compose.ts"` で登録。settings.json.example の直接コマンド行は削除。fail-loud/continue(BR-U2-4)は hook 内(stderr 1 行+exit 0)へ移設。C4 の設計意味論(SessionStart で compose 入口を呼ぶ)は不変。
- **機構経由の期待値更新(赤→green 遷移が落ちる実証)**: t231 11→12(2 箇所)、t01/t02 のフックロスター+件数、t132 が照合する `docs/reference/06-hooks-and-tools.md` のカウント語(uses twelve / All twelve project-wide / other eleven via hooks block)+ ツリー・表。doctor(t37/t184/t257)は hook ファイル実在で自動解決。

**クラス B(本 Bolt がどの解でも要する機械的更新 — 全て実施):**
- `gen-coverage-registry` の `EXPECTED_NONE_TO_CLI` へ `integration/t299-...` を追記(t299 real-subprocess が `amadeus-plugin.ts` を spawn する none→cli メンバー。cid:integration-registry-regen)+ registry regen(`bun tests/gen-coverage-registry.ts`、--check green)。
- `t258`(boundary-guard)は**期待値更新でなく実欠陥修正**だった: 移設エンジンのコメントが `scripts/plugin-composition.ts` / `scripts/plugin-projection.ts` を参照し、dist へ出荷される tool が非出荷の `scripts/` を参照する distribution-boundary 違反(findings must be []）。コメントから `scripts/` パス参照を除去して解消。
- `t224 / t225`(upstream-v2 migration): 失敗 assertion 実文まで確認 → 同じ `scripts/`-in-dist 由来で migrate --apply が exit 1 になっていた。`scripts/` 除去+dist regen で **t224 58/0・t225 45/0** に回復(帰属確定: 別クラスでなく t258 と同根)。

裁定・更新後、全ガードが green へ遷移(赤→是正→green の落ちる実証)。

## E2E の合否

walking-skeleton の合否そのもの(business-logic-model フロー 4)を t299 で実測: (1) claude 投影成果物を staging へ配置(install 相当)→ (2) compose(real-subprocess 実起動含む)→ (3) `discoverPluginStageFiles` が composed ステージ `formal-model-check` を検出(compiled graph 反映 = FR-4)→ (4) drop → baseline hash 一致。**全段 green**。

## 逸脱申告(要件・設計と合わない/既存様式準拠判断を含む)

以下は設計が実装者に委ねた実装詳細の確定であり、承認済み設計との矛盾はない(無申告逸脱ではない旨を明示):

1. **host モデルの確定(buildHostSnapshot / discovery 分離)**: business-logic-model フロー1は host snapshot を前提とするが「実 disk からの構築方法」を規定せず、production の構築ヘルパーは不在だった。engine の共有ファイル面が `serializeStageSeams` 形(engine 実装コメント「the real frontmatter serializer is U11+」)であることに接地し、CLI は同形を読む `buildHostSnapshot` を実装。engine の owned-path 契約(常に `plugins/<name>/...`)と衝突しないよう、install/discovery を staging dot-dir `.amadeus-plugin-src`(snapshot 除外)、composed owned を compile 可視 `plugins/<name>/` に分離(t254 の bundle/host 分離を踏襲)。full-frontmatter-stage host は engine の現行機構スコープ外。
2. **recompile の位置**: `tx.verify` は seam(ok を返す — engine の atomic 機構は不変・BR-U2-1)、`amadeus-runtime.ts compile` の spawn を apply 後の別段(deps.recompile)とした。合成成功は recompile 成功を要件とする(PluginCliResult.composed.recompiled: true)。
3. **`.claude-plugin/plugin.json` の最小形**: Claude Code marketplace manifest のスキーマは上流未確定のため、plugin identity から決定的に導出する最小形(`{name, version:"0.0.0", description}`)とした。BR-U2-10 は位置実在・トークン置換・0-plugin no-op を合否とし、スキーマ準拠は要求していない。
4. **他ハーネス投影**: `projectPluginForHarness` は claude のみ実装、他面は throw で明示(U3 スコープ)。

いずれも「実装前停止→選挙」を要する承認済み契約からの逸脱には当たらないと判断(実装詳細の確定)。判断の妥当性はレビューで検査されたい。

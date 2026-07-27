# コード生成計画 — U6 activation-policy

> 上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、logical-components、performance-design、reliability-design、security-design、scalability-design、tech-stack-decisions、unit-of-work、requirements

ADR-1 案 A(spec-hash advisory・自動 TLC 実行なし、2026-07-27 ユーザー裁定済み)を実装する。判定は spec-hash 独自機構のみで構成し、上流の `when:` 述語評価・plugin scope 生成に依存しない(business-rules BR-U6-9 / tech-stack-decisions)。engine 側は薄い3接点に限定し、判定・状態・advisory 文言のロジックは in-process seam の独立モジュールへ集約する(logical-components の「spec-hash 判定コアは export 必須 = in-process seam」)。

## 実装順序(business-logic-model「実行順」・reliability-design のリスク制御に準拠)

spec-hash 判定+テストのグリーンを先に確定し、その後に `--single` 要求撤廃を適用する(撤廃先行による「ゲートなし到達可能」窓の防止 — intra-bolt-order-as-risk-control)。

1. **C6 コアモジュール新設** `packages/framework/core/tools/amadeus-plugin-activation.ts`
   - `computeSpecHash(hostRoot, globs, fs)`: glob 展開 → 相対 path 辞書順ソート → `path + \0 + 内容 + \0` の連結を `node:crypto` sha256(reliability-design の決定性規約、tech-stack-decisions の stdlib 選定)。読取不能は `{ ok: false }` で fail-closed(部分集合を「たまたま一致」させない)。
   - `readActivationState` / `writeActivationState`: composition record 隣接の `.amadeus-plugin-activation.json`(domain-entities SpecHashState)。読みは不在・parse 不能とも `null`(never-run へ縮退)。書きは temp+rename の原子的置換で、唯一の書き手(business-rules BR-U6-6)。
   - `judgeActivation(currentHash, lastHash)`: 純 3 値マップ(changed | current | never-run)。null は never-run(advisory 側)へ倒す(reliability-design の fail-closed マップ)。
   - `activationAdvisoryLine`: current は無音(null)、changed / never-run は 1 行固定文言(domain-entities AdvisoryLine)。
   - `formalModelCheckComposed` / `isComposedPluginStage`: composition record の read-only 照会(total・throw しない)。
   - `resolveActivationJudgment` / `activationAdvisoryForHost`: compose 済み確認を最初の分岐にし、未 compose なら spec を一切読まず null 返し(business-rules BR-U6-4 の 0-plugin ゼロ影響、performance-design の分岐順)。
   - `recordActivationVerdict`: flow 4 の verdict 記録(compute → write）。fail-closed 時は書かない。

2. **engine 配線**(`packages/framework/core/tools/amadeus-orchestrate.ts` の薄い 3 接点)
   - `emitForSlug` に advisory を 1 呼出し点で挿入(business-logic-model フロー 2、security-design の挿入点=build-and-test 指令 emit の直前・stderr のみ)。単一呼出し点のため guard-announcement-callsite-count のラッチ不要。
   - Branch 7 に `emitComposedPluginStageIfInstalled` を挿入し、compose 済み plugin stage への `--stage`(--single なし)を single-stage 実行として受理(requirements FR-7(a)、business-rules BR-U6-5 の範囲限定)。
   - `handleSingleReport` に verdict 記録を挿入(flow 4、明示起動の完了シグナル)。
   - 判定ロジックは全て activation モジュールへ委譲。engine 側関数は export し in-process で駆動可能にする(spawn 盲点回避）。

3. **plugin 中立正本のプロシージャ文更新**(`plugins/formal-model-check/stages/formal-model-check.md` の condition 文 + README)。`--single` を任意化した文言へ更新し、`bun scripts/package.ts`(7 ハーネス）+ `bun run promote:self` で投影(dist 手編集禁止 — tech-stack-decisions）。

4. **テスト**（fs-tests-integration-first / inject-runtime-consumed-lines)
   - t319(unit・純関数): `judgeActivation` 全分岐 + `activationAdvisoryLine`。
   - t320（integration): computeSpecHash 決定性・1 バイト変更・rename・復元・空集合・fail-closed、state round-trip、verdict 記録、composition 読取(corrupt 含む）、host レベル判定・advisory（0-plugin null・changed・current・never-run）、BR-U6-6 の advisory 経路 read-only の落ちる実証、BR-U6-2 の TLC 非起動を source-level で固定。
   - t321（integration): engine seam の直接駆動 + handleNext / handleReport の in-process 駆動で配線行を lcov 計上。
   - t322（integration): compose 済み plugin graph 上の behavioral e2e（--single なし到達・verdict 記録・advisory 発火/沈黙)。

## 検証結果（実測 — 実行コマンドと exit code を転記）

| 検証コマンド | exit code / 結果 |
|---|---|
| `bun run typecheck` | 0 |
| `bunx @biomejs/biome lint`（新規 module + 変更 orchestrate + t319-t322） | 0（新規 module 0 warning、既存 warning のみ） |
| `bash tests/run-tests.sh --ci` | 0(PASS: 584 files / 0 failed / 8094 assertions) |
| `bun run dist:check` | 0（claude/codex/cursor/kimi/kiro/kiro-ide/opencode 全て OK） |
| `bun run promote:self:check` | 0（project-local self install in sync） |
| `bun run coverage:ci` | 0（RESULT: PASS） |
| `AMADEUS_PATCH_BASE_REF=4ea02e41a bun tests/coverage-patch-gate.ts --check` | 0(PASS: added 173 / covered 173 / uncovered 0 / allowlisted 0) |

fork 点は 4ea02e41a（U2 walking skeleton 込み）。追加 173 行すべて in-process 駆動で被覆し、CLI spawn のみで通る行はゼロ。

## 逸脱

宣言なき逸脱なし。`--single` は撤廃ではなく任意化(既存 `--single` 経路は不変・compose 済み stage で --single なし到達を追加)であり、requirements FR-7(a)「`--single` なしでの到達経路」の充足として実装した。

# re-scan 記録 — 260813-advisory-requestion-fix

## メタデータ

| 項目 | 値 |
|---|---|
| Date | `2026-08-13` |
| Intent | `260813-advisory-requestion-fix`（scope `self-fix`） |
| Base commit | `854692fd7a11b124236b0427fe3d59e2fe6bf785` |
| Observed commit | `c0f9edf27828def6fa3dbbbc4101d753b398e025` |
| Focus | [Issue #2967](https://github.com/amadeus-dlc/amadeus/issues/2967)（semi/full で run-now 自動裁定済みの advisory が再質問される）+ `base..observed` 差分全域 |
| Scan mode | 通常の差分スキャン |
| 書込範囲 | `codekb/amadeus/` 配下のみ（コード・テスト・state・audit の変更ゼロ） |

### base 選定根拠

`reverse-engineering-timestamp.md` と `re-scans/*.md` が記録する全 observed のうち、**HEAD の祖先で距離最小**のものを選んだ（`cid:reverse-engineering:rescan-base-ancestry`）。

- `git merge-base --is-ancestor 854692fd7 HEAD` → **exit 0**（祖先であることの実測）
- `git rev-list --count 854692fd7..HEAD` → **33**（距離。次点候補より小）

### observed 選定根拠

`git rev-parse HEAD` = `c0f9edf27828def6fa3dbbbc4101d753b398e025`。本 worktree HEAD は `origin/main` 系譜のコミットであり、ローカル merge コミットではない（`cid:reverse-engineering:c2-observed-mainline-commit`）。

### scan mode の選定根拠

xrev differential scan（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）は**採らなかった**。Issue #2967 のクロスレビューは本 intent の進行中に並行実施されており、**本スキャン開始時点で verdict が成立していない**ため、レビュー結果を Developer scan の一次入力にできない。したがって全主張を observed 断面の実読で採取した。

## 述語一覧（実測コマンドと結果）

| ID | 述語 | 結果 |
|---|---|---|
| P0 | `git rev-parse HEAD` | `c0f9edf27828def6fa3dbbbc4101d753b398e025` |
| P1 | `git log --oneline 854692fd7..c0f9edf27 \| wc -l` | 33 |
| P2 | `git diff --name-only 854692fd7..c0f9edf27 \| wc -l` | 224 |
| P3 | `git diff --stat 854692fd7..c0f9edf27 \| tail -1` | +23703 / −9416 |
| P4 | `git diff --name-only 854692fd7..c0f9edf27 -- packages/framework/core/tools/amadeus-advisory-choice.ts` | **空出力**（患部は区間内無変更） |
| P5 | `git grep -n -E "run_required\|formal_checks\|runRequired\|formalChecks" -- packages tests docs plugins .claude .agents scripts \| wc -l` | 10（8 ファイル） |
| P5b | `ls -d packages/framework/harness/*/ \| wc -l` | 8 → **drift 8/8（100%）** |
| P5c | `git grep -n "run_required\|formal_checks" -- packages/framework/core/tools/amadeus-directive.ts` | **0 hit**（engine は発行しない） |
| P6 | `git grep -n "applyPendingAdvisoryGuard" -- tests \| wc -l` | **0**（再入経路の未被覆） |
| P6b | `git grep -ln "recordAdvisoryChoice\|resolveAdvisoryChoiceAutonomously\|advisoryProvenanceAlreadySpent\|evaluateAdvisoryHold\|guardAdvisoryChoices" -- tests \| wc -l` | 15 |
| P7 | `git diff --name-only 854692fd7..c0f9edf27 -- package.json bun.lock` | 空出力（外部依存の変化なし） |

領域分類（P2 の出力をパス接頭辞で分類）: 工程記録 109 / tests 54 / codekb 12 / core/tools 9 / plugins/pr-convergence 8 / plugins/formal-model-check 5 / specs 4 / plugins/coverage-patch-quick（新規）3 / docs 3 / memory 2 / .github 2 / その他 6。

## 患部の機序（observed 断面の実読、6 段）

1. 1 回目の `next`: 宣言プラグインの評価器が raise → `guardAdvisoryChoices` が hold → autonomy ladder が run-now を裁定 → `recordAdvisoryChoice` 成功 → `applyPendingAdvisoryGuard` が**元 directive を返す**（`amadeus-orchestrate.ts:853-865`）。
2. 評価器は依然 raise している（run-now は評価器の状態を変えない）。
3. 2 回目の `next`: `evaluateAdvisoryHold`（`amadeus-advisory-choice.ts:402-419`）が全 pending に receipt を見つけ、うち 1 件が `run-now` のため `{ kind: "run-required", … }`（`:417-419`、型定義 `:129`）→ `guardAdvisoryChoices`（`:716-719`）→ `resolveRunRequiredHold`（`:682-701`）が **hold** を返す。`result` は `DECLARED_RELEASE_RULE`（`:666-667`、逐語「declared advisory: release requires the plugin's own evaluator to return no-hold」）。
4. ladder が再裁定するが、`decisionId`（`amadeus-intent-autonomy.ts:840-845` = `autonomyStableId("auto-decision", [intentUuid, interactionId, occurrenceId, graphRevision])`）は決定的に同値 → `advisoryProvenanceAlreadySpent`（消費点 `:881`、key 生成 `:330-334`）で spend 済み判定 → `recordAdvisoryChoice` が **false**。ladder が conflict / park / grant 無しでも同じ false へ落ちる。
5. `applyPendingAdvisoryGuard`（`:826-874`）は「resolved かつ record true」以外をすべて else に落とすため、human 向け `await-advisory-choice` を生成する（`:867-874`）。
6. 人間が run-now を選び直しても、`acceptsFreshChoice`（`:805-810`）が active receipt を持つ pending を open 集合から外し `open.length === 0` で false（`:886-890`）→ 受理されず同じ hold が再提示される（ループ）。

**設計上の要点**: 二分岐は fail-closed の意図をコメント（`:838-845`）で明示しているが、`recordAdvisoryChoice` の戻り値が `boolean` 1 本であるため、「既 settled（正常・裁定不要）」と「裁定不能（異常）」を呼び出し側が区別できない。これが本 Issue の直接の設計欠陥である。

### Developer scan からの行番号訂正（observed 実読で確定）

| 対象 | scan 記載 | 実測 |
|---|---|---|
| spend guard 消費点 | `:877` | **`:881`** |
| open 集合判定 | `:880-888` | **`:886-890`** |
| `applyPendingAdvisoryGuard` 終端 | `:876` | **`:874`**（`return choiceDirective;` が `:874`、literal 開始は `:867`） |

Issue 本文の行番号にも微差がある（orchestrate 838-874 → 826-874、directive 228-234 → 228-235）。いずれも主張の実質は一致。

## 回帰の由来（履歴検証）

- `f7310bd76f`（PR #2318、2026-08-06）— advisory hold を autonomy ladder に載せた導入コミット。当時は `run_required` / `formal_checks` の型付き実行 route が存在し、run-now 裁定後の再入はその route で処理され human へ落ちなかった。
- `387cbd0146`（PR #2890、2026-08-11）— `AdvisoryFormalCheckDirective` 型、directive の `run_required?` / `formal_checks?`、orchestrate の `...(guard.runRequired ? { run_required: true, formal_checks: guard.formalChecks } : {})`、`advisoryChoiceOptionIds(runRequired)` の run-required 分岐、`resolveRunRequiredHold` の実行 route 分岐を**全削除**。run-now の出口が消えた。

## skill 側契約の drift 全数（P5 の 10 行 / 8 ファイル）

| ハーネス | 所在 |
|---|---|
| claude | `SKILL.md:65` |
| codex | `SKILL.md:26,63` |
| cursor | `commands/amadeus.md:62` |
| kimi | `SKILL.md:67` |
| kiro-ide | `SKILL.md:63` |
| kiro | `SKILL.md:63` |
| opencode | `commands/amadeus.md:62` |
| pi | `SKILL.md:104-105` |

逐語（claude）: `If \`directive.run_required === true\`, execute every \`directive.formal_checks[].command\` exactly as supplied, then re-run \`next\`; do not call \`report\`.`

- セルフインストール面（`.claude` / `.agents`）も同形だが正本投影であり、正本修正 + `bun run build` で解消する。
- `core/amadeus-common/protocols/stage-protocol.md` は `run_required` を含まない。
- codekb 側の drift: `component-inventory.md:351`（**本 intent で履歴ラベルへ是正済み**、`cid:reverse-engineering:c1`）、`re-scans/260810-tla-applicability-wiring.md:78`（当時の断面の記録であり履歴ファイルとして保持）。

## テスト棚卸しとギャップ

| テスト | 役割 |
|---|---|
| t457（unit、177 行） | occurrence 写像・option space（`:123` が #2890 後契約を pin）・fail-closed |
| t459（unit、236 行） | grounding・presentation binding・single spend（`:192-231`）・禁止効果 |
| t458（integration、412 行） | 中核。`:164` full grant 無人裁定 + receipt、**`:200-206` が現在の欠陥挙動（再 guard = hold）を仕様として pin** |
| t528 `:134` / t526 `:100` / t-advisory-human-choice-boundaries `:674` | 「run-now は hold を解除しない」を pin |
| t-advisory-choice-record | human route 受理・冪等（`:201`）・競合（`:219`）・fail-closed 12 件 |
| その他 | t529（trace）、t470（schema1 回復）、t445、t381、t378、e2e rendering、t113、harness-approval-order |

**ギャップ（P6 実測）**: `applyPendingAdvisoryGuard` を参照するテストは **0 件**。auto receipt 記録済み advisory への orchestrator 再入 → 返る directive 種別（ladder → record 拒否 → human フォールバックの合成経路）が未被覆である。

## 差分区間の主要変更テーマ（患部外）

1. pr-convergence プラグインの大幅拡張（#2932 / #2942 / #2948 / #2957–#2960）— `pr-convergence-cli.ts` +569、`pr-convergence-attestation.ts` 新規 +133、`pr-convergence-git-runner.ts` 新規 +190。
2. ノルム蒸留（#2919）— `team.md` / `project.md` の原理原則化と pin テスト同期（#2922）。
3. coverage 免除台帳の意味的監査（#2902 / #2938 / #2939）— `tests/.coverage-patch-allowlist.json` −2546、`tests/allowlist-semantic-audit.ts` 新規 +259。
4. coverage-patch-quick プラグイン新設（#2965）— tool-only（`stages: []`）、CLI +509。
5. full autonomy の型付き stage failure → Quality Repair 接続（#2945）— `amadeus-intent-autonomy-production.ts` +89（`STAGE_REFEREE_BOLT_ID = "stage-referee"` / `ProductionStageFailureInput` / `emitRepairStalledIfSuspended`）。
6. formal-model-check の referee receipt / TLC trace 変数照合（#2920 / #2943）。
7. blocking sensor gate（`amadeus-state.ts` +185: `BLOCKING_SENSOR_CUTOFF_YYMMDD = 260809`、`SENSOR_TERMINAL_EVENTS`；`amadeus-sensor.ts` +46: `digestFile` / `resolveScriptPath`）。
8. plugin 合成境界の拡張（`amadeus-plugin-compose.ts` の `SensorCopy` / `parseSensors` / `collectSensorErrors`、`WRITABLE_SEAMS = new Set<SeamName>(["produces", "sensors"])`）と Kiro roll-forward 防御の turn-scoped no-op-next guard（`.amadeus-readonly-latch`）。

## 未実測・推測として明示する項目

- **UNMEASURED-1**: `tests/.complexity-baseline.json` の ±56 行の内訳（どの関数の複雑度が増減したか）は未確認。Developer scan の記述も推測である。
- **UNMEASURED-2**: 差分区間 224 ファイルの領域分類はパス接頭辞による集計であり、各ファイルの変更内容の実読は患部関連ファイルに限定した。
- **UNMEASURED-3**: 4 つのテストピン（t458:200-206 / t528:134 / t526:100 / boundaries:674）が「守るべき契約」か「欠陥の固定」かの判定は未実施 — 設計段の所掌。

## 更新した成果物

`architecture.md` / `component-inventory.md`（+ `:351` 是正）/ `code-quality-assessment.md` / `api-documentation.md` / `code-structure.md` / `dependencies.md` / `technology-stack.md` / `business-overview.md` / `reverse-engineering-timestamp.md` の 9 面、および本ファイル（新規）。直前の現在節（`260812-tla-proof-receipt`）は本文保持のまま履歴へ降格した（`cid:reverse-engineering:c3-relabel`。`grep -rn "、現在、observed\|（現在: " *.md` の残存ヒットが本 intent の節のみであることを機械確認）。

## 適用範囲外（明示）

修正方式の選定 — `recordAdvisoryChoice` の戻り値の型付け（判別ユニオン化の可否）、run-now による hold 解除経路の設計（#2890 で削除された route の復元か別設計か）、8 ハーネス skill 散文の同期手順、欠陥挙動を固定する 4 テストの改訂可否 — はいずれも requirements-analysis / application-design の所掌である。

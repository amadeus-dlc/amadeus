# code-generation code-summary — fix-844-doctor（Issue #844）

## 対象と欠陥

`bun /amadeus --doctor` の Check 5「workspace shell ready」が **2 状態判定**だったため、インストール直後（harness engine dir あり・default memory dir 未 seed = 初回 intent birth 前の正常状態）で FAIL を報告し、修正誘導文言が旧世界の「copy the workspace shell from `dist/claude/`」で誤誘導していた。

- 欠陥箇所（修正前）: `packages/framework/core/tools/amadeus-utility.ts:627`
  `const shellReady = existsSync(harnessEngineDir) && existsSync(defaultMemoryDir);`（2 状態）
  および `:631` の fix 文言 `copy the workspace shell from \`dist/${harnessDir()...}/\``。

## 契約（archive `a59590b32` #573 の 3 状態契約を現行系譜へ移植）

同ファイルの hook-heartbeat 判定（`:634-679` の 3 状態）の様式に揃えた。

- (a) harness dir 不在 → **FAIL**、fix=「re-run the installer: `bunx @amadeus-dlc/setup install --target <workspace>`」
- (b) harness あり・default memory 未 seed → **advisory PASS**、label=「workspace shell pending first workflow — seeded at first intent birth (run your first /amadeus workflow)」
- (c) 両方あり → **PASS**（label は canonical のまま不変: `workspace shell ready (.claude/ + amadeus/spaces/default/memory/)`）

### archive からの意図的な逸脱（盲目移植の回避）

archive の (a) fix 文言は `bun scripts/amadeus-install.ts --target <workspace> (idempotent)` だったが、**当該スクリプトは現行リポジトリに存在しない**（`find` で不在を実測）。現行のインストーラは npm 配布パッケージ `@amadeus-dlc/setup`（`packages/setup/`、README.md:101 `bunx @amadeus-dlc/setup install`）である。よって実行可能性を担保するため fix 文言を現行インストーラ呼び出しへ読み替えた。archive の `(idempotent)` 注記は現行 setup CLI が既存インストール上で再 install を拒否し upgrade を促す仕様（`packages/setup/src/cli.ts:154-176`）と厳密には整合しないため付与しない。状態 (a) は harness dir 不在＝未インストールなので `install` サブコマンドが正しい誘導となる。

## 実装（file:line）

- `packages/framework/core/tools/amadeus-utility.ts`
  - `:396-411` 追加: `export interface DoctorCheck { pass; label; fix? }`（handleDoctor の results 要素の named 公開型）と、`export function classifyWorkspaceShellState(harnessExists, memoryExists, harnessName): DoctorCheck`（3 状態の純関数。fs も env も触らない — 存在確認は呼び出し側、seam-export のため）。
  - `:672` handler 配線を 1 行に縮約: `results.push(classifyWorkspaceShellState(existsSync(harnessEngineDir), existsSync(defaultMemoryDir), harnessDir()));`（旧 `:627-632` の boolean+inline push ブロックを置換）。
  - `:656-671` の Check 5 コメントを 3 状態契約へ更新（コメントはモジュール/ハンドラスコープに置き、bun-inbody-comment-da0 に抵触しない）。
- 7 面同期: core + `dist/{claude,codex,kiro,kiro-ide}` + self-install `.claude`/`.codex`（`bun scripts/package.ts` + `bun run promote:self`）。

## RED → GREEN 実証（実測）

修正前 dist（stale = 旧 2 状態コード）を残したまま state-(b) fixture（`.claude/` あり・memory なし）で doctor を実行し RED を確認、その後 `package.ts` で再生成して GREEN を確認した。

- RED（旧 dist、state-b）:
  `✗  workspace shell ready (.claude/ + amadeus/spaces/default/memory/) — copy the workspace shell from \`dist/claude/\` into your project root`
- GREEN（新 dist、state-b）:
  `✓  workspace shell pending first workflow — seeded at first intent birth (run your first /amadeus workflow)`
- GREEN（新 dist、state-a: harness なし）:
  `✗  workspace shell ready (...) — re-run the installer: \`bunx @amadeus-dlc/setup install --target <workspace>\``
- GREEN（新 dist、state-c: 両方あり）:
  `✓  workspace shell ready (.claude/ + amadeus/spaces/default/memory/)`

### テスト

`tests/unit/t211-doctor-shell-3state.test.ts`（新規）:
- Layer 1（in-process seam）: `classifyWorkspaceShellState` を core から直接 import し (a)(b)(c) + Kiro harness 名の 4 ケースを検証 → 新規行を in-process で lcov 被覆。
- Layer 2（CLI spawn, `env: process.env` 明示）: 実 doctor を dist から state-(b) fixture に対して spawn し、advisory ✓ + pending-first-workflow marker、`copy the workspace shell from` 不在、旧 `✗  workspace shell ready` 不在を assert（#844 閉包）。

新規 spawner のため `tests/unit/gen-coverage-registry.test.ts` の `EXPECTED_NONE_TO_CLI` に `unit/t211-doctor-shell-3state.test.ts` を追加し、`tests/.coverage-registry.json` を再生成（t211 が doctor subcommand の coveredBy に join。ratchet 変化なし）。

### 旧契約を pin していた兄弟テストの更新（fixture-propagation-grep / functional-design:c3）

ユーザー可視契約（doctor 出力文言）の変更に伴い、旧 2 状態契約を exact-match で pin していた兄弟テストを repo 全域 grep（`copy the workspace shell from` / `workspace shell ready` / `workspace shell pending`）で洗い出し、同一 Bolt で更新した:

- `tests/integration/t165-intent-birth-p4.test.ts:418-431`（**フルスキャンで実 FAIL していた唯一の決定的テスト**）: 「memory dir 欠落 → shell-ready 行が FAIL + dist/-copy 誘導」を pin していた。#844 の 3 状態化で (b) は advisory PASS になるため、`workspace shell pending first workflow` を含み `copy the workspace shell from` を含まない、へ更新。
- `tests/integration/t22.test.ts`（SDK-drive、Bedrock 資格情報なしでは実行されないため CI 失敗には現れないが旧契約を pin）: 定数 `DOCTOR_SHELL_LABEL`/`DOCTOR_SHELL_FIX` を `DOCTOR_SHELL_PENDING = "workspace shell pending first workflow"` へ置換し、第2テスト（memory 除去 = state b）を「advisory pending 行が tool_result に verbatim 現れる」assert へ更新（remediation assert は advisory に fix が無いため削除）。STOP 条件は `DOCTOR_HEADER` presence で exit code 非依存のため機構は不変。**設計上の帰結**: doctor ツールは `.claude/` 内に在るため、shell-readiness の hard FAIL（state a = harness dir 不在）はツール自体の不在を意味し同一プロジェクトの SDK-drive では到達不能。よって「shell-ready FAIL の verbatim surfacing」を pin していた t22 の旧前提は #844 と両立せず、advisory 行の surfacing へ転換した（Bash 発火の非空証明は advisory marker + HEADER で維持）。
- `tests/integration/sdk-drive.calibration.test.ts`: 既定 `setupIntegrationProject()`（両 dir 存在 = state c）で canonical label `workspace shell ready (.claude/ + amadeus/spaces/default/memory/)` は不変 → **更新不要**（実測確認）。

## installer smoke 面の移植要否判定（実測）

archive 修正は installer smoke が doctor 出力の固定 marker を grep して info 行を出す挙動と連動していた。現行の該当機能は setup パッケージの `packages/setup/src/modules/verifier.ts` である。実測の結果:

- verifier は doctor へ shell out せず、**独立にファイル存在チェック**を行う（required-files / harness-dir / tools-dir / memory-shell / state-absence の 5 点、`verifier.ts:14-71`）。doctor の label 文字列を grep する marker 結合は**存在しない**。
- `state-absence` は既に `ok: true` の情報行として fresh-install 正常（active-intent 不在）を扱う（`verifier.ts:56-66`）— #844 が doctor 側で問題にしていた「fresh-install を誤って FAIL」を setup 側は既に回避済み。
- `memory-shell` は memory dir 存在を hard チェックするが、dist は `dist/claude/amadeus/spaces/default/memory/`（org/team/project/phases）を同梱し setup はそれを apply するため、`@amadeus-dlc/setup install` 直後は memory 存在＝正常で偽陰性なし。

**判定: 移植不要。** 現行インストーラは doctor の marker を消費しておらず、archive の marker-grep 連動に対応する現行コードは無い。盲目移植せず、doctor 側の 3 状態化のみで #844 は閉じる。

## 同根棚卸し（handleDoctor 内の「正常状態を FAIL 判定する 2 状態」同型）

`handleDoctor`（`amadeus-utility.ts`）の全 `results.push` を grep 精査した結果:

- **hook-heartbeat（現 `:683-…`）は既に 3 状態**（dir 不在=advisory pass / 存在するが未 fire=fail / fire 済み=pass）— 本修正が範として揃えた対称モデル。
- **practices staleness（`:1200-`）**は state file 不在を `pass: true`（informational）で扱い、fresh-install 誤 FAIL なし。
- **state/audit drift（`:728-`）・orphan audit（`:1169-`）・orphan worktree/state（Check 1/3）**は不在時 skip または drift のみ FAIL で、正常状態を FAIL 判定しない。
- hook/settings/agent 存在チェック（`:517-613`）は真の drift（欠落＝実障害）で、2 状態が正しい。

**結論: workspace-shell が handleDoctor 内で唯一の「正常状態を FAIL 判定する 2 状態」だった。他に同根なし。**（本 Bolt スコープは #844 のみ、修正はこの 1 箇所。記録のみ。）

## 検証コマンドと exit code

| コマンド | exit | 結果 |
|---|---|---|
| `bun run typecheck` | 0 | OK |
| `bun run lint` | 0 | OK（複雑度 warning は既存・非ブロッキング、本変更由来なし） |
| `bun run dist:check` | 0 | all harness trees in sync |
| `bun run promote:self:check` | 0 | self install in sync |
| `bun tests/complexity-gate.ts --check` | 0 | 0 new violations, 0 regressions（抽出により handleDoctor 複雑度は低下） |
| `bun test tests/unit/t211-doctor-shell-3state.test.ts` | 0 | 5 pass / 0 fail |
| `bun test t83 + t210 + t211 + gen-coverage-registry` | 0 | 65 pass / 0 fail |
| `bun test tests/integration/t165-intent-birth-p4.test.ts` | 0 | 25 pass / 0 fail（(b) 兄弟テスト更新後） |
| `bun tests/run-tests.ts --ci`（フルスイート） | 0 | Failed files: 0（t165/t22/t211 反映後） |

補足: 初回の `bun run coverage:ci` は `RESULT: FAIL` / exit 1 を返したが、原因は `t165-intent-birth-p4.test.ts` が旧 2 状態契約（memory 欠落 → shell-ready FAIL + dist/-copy 誘導）を exact-match で pin していたための実テスト失敗（`RESULT: FAIL` は `failedFiles>0` で発火、`run-tests.ts:919`）。coverage combine 自体は成功し `coverage/lcov.info`（本 diff の新規行 DA を含む）を生成済みで、被覆実測に使用した。fixture-propagation で t165/t22 を新契約へ更新後、フル `--ci` を再実行し `Failed files: 0` を確認。

## local lcov 実測（diff 追加行の未カバー）

`bun run coverage:ci` の正規化 lcov（dist→core 再マップ後）で、本 diff の core 追加/変更実行行を実測:

- `classifyWorkspaceShellState` 本体（`packages/framework/core/tools/amadeus-utility.ts:418,423-427,431-436,438`）: **全行 DA>0**（in-process t211 が被覆。例: `:418`=6, `:423`=96, `:424`=24, `:431`=23, `:438`=40）。
- handler 配線 `:672` `results.push(classifyWorkspaceShellState(...))`: **DA:0**。これは `handleDoctor` が spawn-only（bun --coverage は spawn を計測しない／t83 header に明記）である構造上の 1 行で、in-process 化不能（`handleDoctor` は末尾で `process.exit` するため in-process 駆動不可）。純関数抽出により被覆不能行はこの **1 行**に最小化した。

**codecov/patch について**: `:672` は計測不能な spawn-only 行のため codecov patch で missed として現れうる。これは先行 #830（handleDoctor の spawn-only 行を 2 行変更してマージ）と同型で、codecov-waiver-line-confirmation ノルムの admin merge 諮問（計測不能行の waiver）対象。マージ時に conductor が Codecov の compare/segments API で `:672` の missed を公式確定のうえ waiver を諮ること。関数本体・テストで被覆できる行はすべて被覆済み（残りは構造的に 1 行のみ）。

（コメント行・空行は runner の coverage-normalize strip 対象で codecov に載らないため、更新した Check 5 コメントブロックは patch に影響しない。）

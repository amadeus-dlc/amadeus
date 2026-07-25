# Code Generation Summary — harness-provenance

## 結果

Issue #1452 の単一 Unit `harness-provenance` を実装した。新規 intent birth は実行ハーネスを `claude-code | codex | cursor | opencode | kiro | unknown | manual` の7値へ fail-closed に正規化し、`## Project Information` の `Active Agent` 直後へ `Harness` を exactly once 記録する。既存 `harnessDir(): string`、State Version 7、Harness を持たない既存 state、memory template の4見出しを維持した。

FR-5 の監査シャード付記、新規 API、DB、外部サービス、設定ファイル、依存関係、IaC、ネットワーク呼出は追加していない。

## 実装内容

### 正本ロジック

- `packages/framework/core/tools/amadeus-lib.ts`
  - exported `HarnessType` と exported canonical mapping `HARNESS_DIR_TO_TYPE` を追加した。
  - private `HarnessDirSource` / `HarnessDirResolution` と provenance 付き resolver を追加した。
  - 既存 ladder の順序、truthy な `AMADEUS_HARNESS_DIR` の call-time 優先、非 env 解決の process cache、`.claude` fallback、公開 `harnessDir(): string` を維持した。
  - exported `detectHarnessType()` を `AMADEUS_HARNESS_TYPE` の存在 → 厳密7値 parse → `CLAUDECODE === "1"` → provenance 付き dot-dir 解決の順に追加した。空文字、不正値、fallback、未知 open-set dir は `unknown` へ正規化する。
- `packages/framework/core/tools/amadeus-utility.ts`
  - `handleIntentBirthStateBuild()` で detector を1回だけ呼び、ローカル変数へ保持する。
  - state の `Active Agent` 直後へ `- **Harness**: <HarnessType>` を1行追加する。
  - `STATE_V7_FIELDS` は変更していない。

### テスト

- `tests/unit/t269-harness-provenance.test.ts`
  - 7つの明示値、空文字・不正値の遮断、`CLAUDECODE`、canonical mapping 5件、未知 dir、fallback、4 provenance source、CWD probe順、既存 cache 契約を fresh subprocess で固定した。
- `tests/integration/t270-harness-provenance-birth.test.ts`
  - 実 FS birth、Harness exactly once、既存 field helper、optional V7、invalid raw leak防止、同期ローカル判定、detector exactly once を検証した。
  - Claude Code / Codex / Cursor / OpenCode / Kiro CLI / Kiro IDE の6配布形態を fresh subprocess で起動し、3 override envを unsetして、競合 CWD dot-dir より script-pathが優先されることを検証した。
- `tests/unit/t144-harness-seam.test.ts` と `tests/unit/t100-memory-template-lifecycle.test.ts` は変更せず回帰確認した。
- `tests/.coverage-registry.json` と `tests/.coverage-ratchet.json` は既存 generator で更新した。

### ドキュメントと配布

- `docs/guide/12-cli-commands.md` と `docs/guide/12-cli-commands.ja.md` に `AMADEUS_HARNESS_TYPE` の7値、優先順位、空/不正値の正規化、`manual` の用途、optional V7 記録を同期して追記した。
- `bun scripts/package.ts` で `dist/{claude,codex,cursor,opencode,kiro,kiro-ide}` の全6配布面を再生成した。
- `bun run promote:self` で `.claude`、`.codex`、`.cursor`、`.opencode` の self-install 面を同期した。

## 要件・受入条件対応

| 要件 | 実装・証拠 |
|---|---|
| FR-1 / AC-1a〜1d | birth時のexactly-once Harness行、7値 env override、英日guide、t270実FS検証 |
| FR-2 / AC-2a〜2b | `CLAUDECODE === "1"` の厳密判定と dot-dir fallback、t269 |
| FR-3 / AC-3a〜3d | canonical mapping、provenance、fallback/open-set unknown、6配布形態の競合CWD検証 |
| FR-4 / AC-4a〜4b | template/ensureStageDiary未変更、t100 green、`construction/code-generation/memory.md` の通常 Interpretations entry に `Harness=codex` の実在証跡 |
| NFR-1 | `harnessDir()`互換、Harnessなし/ありV7、t144/t269/t270 |
| NFR-2 | H2やstate必須fieldを変更せず、既存 sensor/validator契約を維持 |

## 実測検証

| コマンド | Exit code | 結果 |
|---|---:|---|
| `bun test tests/unit/t269-harness-provenance.test.ts tests/unit/t144-harness-seam.test.ts tests/unit/t100-memory-template-lifecycle.test.ts tests/integration/t270-harness-provenance-birth.test.ts` | 0 | 38 pass / 0 fail / 163 expect |
| `bun run typecheck` | 0 | source/test TypeScriptとも成功 |
| `bun run lint` | 0 | 既存warningのみ、errorなし |
| `bun scripts/package.ts` | 0 | 6配布形態を再生成 |
| `bun run promote:self` | 0 | 4 self-install面を更新 |
| `bun run dist:check` | 0 | 6配布形態すべてOK |
| `bun run promote:self:check` | 0 | 4 self-install面すべてOK |
| `bun tests/gen-coverage-registry.ts --check` | 0 | fresh、guards green、ratchet held |
| `bun tests/complexity-gate.ts --check` | 0 | 0 new violations、0 regressions |

初回の `bun run typecheck` は依存未展開のため `tsc: command not found` で exit 127 だった。`bun install --frozen-lockfile`（exit 0、lockfile変更なし）後に同一コマンドを再実行し、最終結果は exit 0 となった。

coverage registry の初回 `--check` は新規関数 universe を検出して freshness failure（exit 1）となった。既存 `bun tests/gen-coverage-registry.ts` で正本を再生成後、`--check` は exit 0 となった。

## Stage Sensors

| Sensor | 最終結果 | 実測証拠 |
|---|---|---|
| linter | PASS | fire id `796e3acc`、exit 0 |
| type-check | PASS | fire id `c7fc1355`、exit 0 |
| answer-evidence | PASS | authoritative `application-design-questions.md`、fire id `3fd01b6f`、exit 0 |

answer-evidence は先に `functional-design-questions.md` を検査した際、既存の回答timestamp表記を `unparseable-timestamp` とする advisory finding（fire id `d727c873`）を1件記録した。実装成果物の不具合ではなく、本 Unit の権威ある Application Design Q&A で再実行してPASSを確認した。所有範囲外の既存Q&Aは変更していない。

## 残課題

- Architecture Review Iteration 1 の限定是正を反映済みで、Iteration 2 reviewが未実施である。
- 上記 answer-evidence advisory finding は監査に保持されている。実装・配布・テストの blocker ではない。

## Architecture Review Iteration 1 対応

### Security Design raw leak 契約

`tests/integration/t270-harness-provenance-birth.test.ts` のinvalid override caseを拡張した。temp intent内でcanonical `memory-template.md`から4見出しのdiaryを作り、正規化済みstate値を使った通常のInterpretations観測`Harness=unknown`をconductor運用として記録する。同一caseで固有raw markerがstate、実在memory entry、audit、stdout、stderrの全5面に存在しないこと、memoryが`Harness=unknown`を持つこと、H2が4件のままで専用Harness見出しを持たないことをassertする。production diaryへ受入専用entryは追加していない。

### Reference / Guide ownership

`docs/reference/`を実測した結果、既存の明示的な環境変数一覧は`docs/reference/09-testing.*`にあるが、これはテストランナー専用でありruntime overrideの正本にはできない。deterministic utility runtimeの正準referenceである`docs/reference/06-hooks-and-tools.md`と日本語版へruntime環境変数表を追加し、`AMADEUS_HARNESS_TYPE`の7値、存在優先、fail-closed正規化、optional V7記録を定義した。`docs/guide/12-cli-commands.md`と日本語版は利用者向け設定導線としてreferenceへリンクする。したがって、referenceが契約の正本、guideが利用者向け導線であり、Unit of WorkとADR-2の`docs/reference/`指定を置換していない。

### 再検証

| コマンド | Exit code | Iteration 1是正後の結果 |
|---|---:|---|
| `bun test tests/integration/t270-harness-provenance-birth.test.ts` | 0 | focused: 6 pass / 0 fail / 40 expect |
| `bun test tests/unit/t269-harness-provenance.test.ts tests/unit/t144-harness-seam.test.ts tests/unit/t100-memory-template-lifecycle.test.ts tests/integration/t270-harness-provenance-birth.test.ts` | 0 | full focused regression: 38 pass / 0 fail / 167 expect |
| `bun run typecheck` | 0 | source/test TypeScriptとも成功 |
| `bun run lint` | 0 | 既存warningのみ、errorなし |
| `bun scripts/package.ts` | 0 | 6配布形態を再生成 |
| `bun run promote:self` | 0 | 4 self-install面を更新 |
| `bun run dist:check` | 0 | 6配布形態すべてOK |
| `bun run promote:self:check` | 0 | 4 self-install面すべてOK |
| `bun tests/gen-coverage-registry.ts --check` | 0 | fresh、guards green、ratchet held |
| `bun tests/complexity-gate.ts --check` | 0 | 0 new violations、0 regressions |

Iteration 1是正後のstage sensorは、linter PASS（fire id `366be9f5`）、type-check PASS（fire id `8d636b76`）、answer-evidence PASS（fire id `129e13c9`）で、各fireコマンドはexit 0だった。

Iteration 1の2件のMajorは、security-designの5面raw leak検証と、Unit指定の`docs/reference/`正本更新により解消した。Iteration 2 reviewへ投入可能である。

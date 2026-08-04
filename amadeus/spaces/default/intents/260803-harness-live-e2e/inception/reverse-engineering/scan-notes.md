# Developer Code Scan — ハーネス横断live E2E

対象Intent: `260803-harness-live-e2e`  
対象repo: `amadeus`  
Observed HEAD: `52a082af7d13c537fad65b1204c9760e28b73f61`

## 差分基点と実行条件

- Base: `a8e1ce025a918310ab7d803270bb6fc6b649c598`。`re-scans/260802-plugin-projection-parity.md`のObserved commitで、現HEADの祖先であることを`git merge-base --is-ancestor` exit 0で確認した。
- Distance: 46 commits。区間規模は1,593 files changed、174,787 insertions、6,561 deletions。
- preflightでローカルHEADが`origin/main`より3コミット後方と判明したためfast-forwardし、検証中に追加された1コミットも再度fast-forwardした。最終observedは`origin/main`と一致する。追加4コミットはlive E2E焦点面を変更していない。
- Issue #1717焦点のdrive helper 6本は区間内変更0。変更された焦点面は`tests/run-tests.ts`とCursor/OpenCode manifest/plugin周辺である。live契約の非対称はこの区間の回帰ではなく、base以前からの未統合契約である。
- 共有`reverse-engineering-timestamp.md`はbase選択に使っていない。

## Packages Found

| Package / module | 種別 | 根拠 |
|---|---|---|
| `amadeus-claude-code-dev` | private Bun workspace root | `package.json:2-8` |
| `@amadeus-dlc/framework` | framework正本。coreを7 harnessへ投影 | `packages/framework/package.json:2-12` |
| `@amadeus-dlc/setup` 0.1.7 | Bun向けinstaller CLI | `packages/setup/package.json:2-25` |
| Harness群 | claude/codex/cursor/kimi/kiro/kiro-ide/opencodeの7面 | `packages/framework/harness/*` |
| Core | hooks/OTel/tools/knowledge/protocol/scopes/sensors/agents | `packages/framework/core/`。TypeScript 216ファイル |
| Harness固有source | manifest/emit/hook adapter/onboarding | `packages/framework/harness/`。TypeScript 32ファイル |
| Tests | 869 `*.test.ts` | 最終observedで`find tests -type f -name '*.test.ts'`を実測 |

長寿命service、HTTP server、databaseはない。短命CLIと生成・検証ツールから成るBun-only monorepoである。

## Build System

- Runtime/package managerはBun 1.3.13。setup packageも`bun >=1.3.13`を要求する（`packages/setup/package.json:9-10`）。
- Languageはstrict TypeScript、ESM、bundler resolution（`tsconfig.json:2-12`）。
- 正本は`packages/framework/core/`と`packages/framework/harness/`。`scripts/package.ts`が`dist/<harness>`を生成し、`scripts/promote-self.ts`がself-install面へ同期する（`package.json:9-20`）。
- drift guardは`dist:check`、`promote:self:check`、`distribution:check`（`package.json:10-17`）。
- Base以降は`@ast-grep/napi` 0.45.0と`no-silent-drop` gate、unchecked-cast ratchet、manual deep PBTが追加された（`package.json:24,34-44`、`.github/workflows/ci.yml:118-169,625-760`）。
- Biome formatterは無効、linter有効、cognitive complexity 15超はwarning（`biome.json:3-17`）。
- 依存はClaude Agent SDK、OTel、Biome、ast-grep、fast-check、release-it、TypeScriptに限定される（`package.json:34-44`）。

## APIs Discovered

公開Web APIではなく、test harness向けTypeScript/CLI契約である。

| API / seam | 現契約 |
|---|---|
| Codex policy | `codexExecLiveSkipReason(env): string \| null`。GHAを最優先拒否し、`AMADEUS_CODEX_EXEC_LIVE=1`を要求（`tests/harness/codex-exec-live.ts:14-24`） |
| Codex preflight | version 0.139.0以上、dist、明示auth home内`auth.json`を検査（同`:41-67`） |
| Codex lifecycle | scratch `CODEX_HOME`へauthをコピー、project外配置を強制、git init/commit、trust config、失敗時rollback（同`:69-99,138-190,207-236`） |
| Claude SDK | `driveAidlc(prompt, opts): Promise<DriveResult>`。tool result/state/audit/result eventを構造化（`tests/harness/sdk-drive.ts:110-130,413-470`） |
| Claude TUI | `tui-drive.ts` CLI。`--setting-sources project`を注入しprivate tmux socketを使用（`tests/harness/tui-drive.ts:170-212,244-261`） |
| Kimi print | `skipReason`、`runPrintSession(): PrintResult`。`rc/stdout/stderr/timedOut/error`（`tests/harness/kimi-print-drive.ts:60-128`） |
| Kiro ACP | `driveKiroAcp(opts)`。`kiro-cli acp --agent amadeus --trust-all-tools`を起動しtool/state/auditを構造化（`tests/harness/kiro-acp-drive.ts:95-128,155-170,378-486`） |
| Kiro IDE | constantsのみからscratch profile DBを生成し、CDPでKiro.appを駆動（`tests/harness/kiro-ide-driver.ts:180-245,272-291`） |
| Cursor | documented 8 eventsをstdin adapterでcore hookへ写像。未登録toolはadvisory exit 1（`docs/guide/harnesses/cursor.md:55-80`、`tests/integration/t-cursor-adapter.test.ts:185-231`） |
| OpenCode | `chat.message`からpresence mintのみ。audit/sensor等は未配線（`packages/framework/harness/opencode/plugins/amadeus-opencode-plugin.ts:41-69`、`docs/guide/harnesses/opencode.md:61-74`） |

Issue #1717が要求する共通`LivePolicy`、構造化skip reason、scratch lifecycle、timeout/failure classは現存しない。各driverが別の戻り値、例外、exit codeで所有する。

## Frameworks & Libraries

- Bun test、Bun subprocess、Node互換filesystem/process API。
- `@anthropic-ai/claude-agent-sdk` 0.3.158（`package.json:35`）。
- OpenTelemetry API/logs/context、fast-check 4.9.0、ast-grep 0.45.0、Biome 2.5.5。
- 外部runtime substrateは`claude`、`codex`、`kimi`、`kiro-cli`、Kiro.app、`tmux`、AWS credentials。package dependencyではない。

## Test Coverage

- runnerは既定/CIでsmoke+unit+integration、release/allでe2e+perfを追加（`tests/run-tests.ts:105-150`）。
- 最大4並列、各test既定30秒、Claude substrateをfile単位でskip（同`:53-60,262-329`）。
- `--all/--release --debug`は未指定時に`AMADEUS_TUI_LIVE=1`を暗黙設定する（同`:249-260`）。明示opt-in原則の既存例外である。
- CIはtypecheck、lint/static ratchets、smoke+unit+integration、dist/self drift、coverageを実行し、外部資格情報を使うlive jobはない（`.github/workflows/ci.yml:73-192,242-308`）。
- coverageはLCOV、project drop 0.02pp ratchet、patch追加行zero-hit拒否を持つ（`tests/coverage-project-gate.ts:2-8,134-163`、`tests/coverage-patch-gate.ts:2-24`）。

実測結果:

- Codex policy/helper、Kimi driver、Cursor adapterの選択4ファイルを最終observedで再実行: **58 pass / 132 assertions / 0 fail**。
- `GITHUB_ACTIONS=true`、全live flag未設定の代表5 surface: **0 pass / 7 skip / 0 fail**。CodexだけがGHAを理由にし、Kimi/Kiro ACP/TUI/IDEはopt-in未設定を理由にした。
- typecheckはコードエラーではなく、このworktreeに`tsc` executableが無いためexit 127で未実施。

| Surface | Live gate | GHA hard deny | auth/config isolation | timeout/failure |
|---|---|---|---|---|
| Codex exec | 明示flag | あり | scratch home/auth copy、source pointer削除 | journeyごとの`rc/out` |
| Claude SDK | 共通flagなし。`t19`は`describe.skip` | なし | user/local settings除外、ambient env継承 | AbortController、partial result |
| Claude TUI | 主に`AMADEUS_TUI_LIVE`。一部flagなし | なし | project setting source、private tmux | exit 0/1/2 |
| Kimi print | 明示flag | なし | scratch config、real credential dirsをsymlink | `rc/timedOut/error` |
| Kiro ACP | 明示flag | なし | `whoami`、ambient env/profile | timeout時cancel後throw |
| Kiro TUI | 明示flag | なし | `whoami`、ambient profile | driver exit code |
| Kiro IDE | 明示flag | なし | generated scratch profile、machine auth | CDP timeout/exception |
| Cursor | live adapter/journeyなし | N/A | 未実装 | deterministic fixtureのみ |
| OpenCode | live adapter/journeyなし | N/A | 未実装 | deterministic plugin testのみ |

## Code Quality Indicators

### 強み

- Codexはgate precedence、GHAでprobe前short-circuit、auth cleanup、rollbackを固定（`tests/unit/t-codex-exec-live-gate.test.ts:8-51`、`tests/integration/t-codex-exec-live-helper.test.ts:59-154`）。
- SDK/ACPはproseではなくtool/state/auditをassert対象とする。
- Claude TUIはuser settings/hooks混入とdeveloper tmux session干渉を防ぐ。
- Kiro IDE profileは実profile/credentialをコピーせず生成する。
- Cursor adapterは正常写像、不正stdin、未知tool identityのnegative pathを固定する。
- OpenCodeは未確認hookを同等と偽らず、5 conditional / 2 unsupportedを文書化する（`docs/guide/harnesses/opencode.md:78-97`）。

### 不足

- runner metaは`STATUS=SKIP`を機械化するが`REASON` fieldを持たない（`tests/run-tests.ts:331-353`）。
- Claude headless `claude -p --setting-sources project` live journeyはない。`tests/integration/t19.test.ts:71`はsuite全体が`describe.skip`。
- Cursor/OpenCodeはfixture/emit/plugin境界のみでCLI/IDE runtimeのlive journeyがない。
- live green SHA/run ledgerがない。
- `tests/lib/coverage-source-path.ts:8-15,45-65`はKimiを正規化対象に含めない。
- CodeKBの総テスト847本は現HEADの869本に対してstale。

## Technical Debt Signals

1. **共通policy不在** — GHA deny、opt-in、binary/auth/dist preflightが重複し、Codex以外はGHA上でもflag次第でprobe/runへ進み得る。
2. **failure taxonomy不統一** — Codex=`rc`、Kimi=`rc/timedOut/error`、SDK=`timedOut`+partial result、TUI=exit 1/2、ACP=throw、IDE=exception。
3. **環境分離の境界不明瞭** — Codex/SDK/Kimiはambient envをspreadし、ACP/IDEもenv allow-listを持たない。settings隔離とsecret隔離が別契約になっていない。
4. **artifact lifecycle不統一** — TUIは`AMADEUS_KEEP_TEMP=1`で保持し、Kiro IDEはappも残す一方、Codex/Kimi scratchは常に削除する。debug retainとcredential削除を分ける必要がある。
5. **Kiro ACP transport制約** — voluntary gate stopではなくtool output到達時cancelを使う（`kiro-acp-drive.ts:364-376`）。adapter内へ閉じる必要がある。
6. **Kiro codekb path二重受容** — workspace journeyがobsolete root pathとspace-scoped pathの両方を成功扱いする（`tests/e2e/t-acp-kiro-journey-workspace.serial.test.ts:108-149`）。
7. **巨大core modules** — `amadeus-lib.ts` 8,778行、`amadeus-utility.ts` 6,219行、`amadeus-state.ts` 5,572行、`amadeus-orchestrate.ts` 5,499行。共通live seamは`tests/harness`内の小さいdeep moduleが安全。
8. **live可視性なし** — CI self-skipは安全だが、live能力が継続greenである証拠にならない。

## 9 CodeKB成果物への更新差分

| 成果物 | 必要な現在断面 |
|---|---|
| `business-overview.md` | Issue #1717の価値、共通契約、採用surface、Cursor/OpenCode spike/follow-up境界 |
| `technology-stack.md` | 7 harness、869 tests、live flags、CLI/SDK/TUI/ACP/CDP substrate。新規外部dependency不要 |
| `architecture.md` | shared policy/lifecycle→transport adapter→journey/assertion。credential strategyはadapter所有 |
| `code-structure.md` | 6 driver、live E2E群、runner/CI/docs配置 |
| `component-inventory.md` | surface matrixとCursor/OpenCode未実装状態 |
| `dependencies.md` | ambient credentials、external CLI、tmux、AWS、Kiro machine auth、distへの依存方向 |
| `api-documentation.md` | 現行driver APIと未実装の構造化policy/skip/lifecycle/failure contract |
| `code-quality-assessment.md` | 58 pass、7 representative skip、GHA/secret/lifecycle/coverage空白、Claude headless欠落 |
| `reverse-engineering-timestamp.md` | base、observed、距離46、差分規模、テスト結果、typecheck環境制約 |

既存8成果物の現在はObserved `64b44a9f8`のregistry drift節である。Issue #1717節を現在へ昇格し、旧現在節は本文を保持して履歴へ降格する。

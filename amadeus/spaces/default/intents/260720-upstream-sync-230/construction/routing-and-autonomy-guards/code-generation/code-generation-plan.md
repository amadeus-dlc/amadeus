# Code Generation Plan: routing-and-autonomy-guards

## 目的と承認境界

本 Unit は Requirements Analysis の FR-1 items 4〜6、Functional Design の BR-U04-01〜25、NFR Design の決定性・fail-closed・read-only 契約を、既存 CLI / Stop hook / doctor の choke point へ最小実装する。公開 seam は既承認の次の3関数に限定し、新しい service、schema、parser DSL、audit event、runtime dependency、policy、threshold は追加しない。

```ts
function classifyHelpIntent(tokens: readonly string[]): HelpRouting;
function inspectComposeMarker(observation: MarkerObservation, nowMs: number, ttlMs: number): MarkerFreshness;
function assertRecomposeAllowed(autonomy: ConstructionAutonomy): RecomposeGuardResult;
```

- Plan approval: `E-USSU04CGP1` recorded。choiceInternalNo=1 `Approve Plan（推奨）`、6–0、GoA 1x6、reservation 0。record=`amadeus/spaces/default/elections/E-USSU04CGP1/record.md`。本計画 SHA-256 `aa9d9a7e67c8481c6c7c2a579bce5d6ec4a8d8cc454b21626bc8cf28299d177d` を実行境界とする。
- `dist/` と self-install tree は生成物であり手編集しない。package は現行6 harness、self-install は現行4面の closed set を維持する。
- 既存の他 Unit 差分は共有 worktree の仕掛かりとして保持し、本 Unit の比較・stage・commit へ混入させない。

## トレーサビリティ

| 要求 | 実装対象 | 検証対象 |
|---|---|---|
| FR-1.4 / BR-U04-01〜07 | `classifyHelpIntent` を `amadeus-lib.ts` の正準 decision table とし、engine parser、pre-LLM `classifyTerminalCommand`、utility の intent / space handler が共有する | bare `help/-h`、`intent|space help/-h`、`space-create help/-h`、長い freeform、unknown record、reserved namespace、3入口 parity |
| FR-1.5 / BR-U04-08〜20 | 単一 marker path・24時間 TTL・`inspectComposeMarker` を共有し、Stop hook は non-autonomous stale だけを best-effort unlink、doctor は read-only projection とする | absent、24h境界、24h+1ms、future mtime、unreadable、fresh保持、stale削除、unlink失敗でも block 不変、autonomous marker未読・保持、doctor bytes不変 |
| FR-1.6 / BR-U04-21〜25 | `assertRecomposeAllowed` を lock 内 state snapshot 直後、plan / graph / checkbox / audit の全 mutation 前に適用する | autonomous non-zero と actionable error、state / suffix / runtime graph / audit byte不変、gated / unset の既存成功、既存 strict validation 不変 |
| FR-0 / NFR-1〜8 | 既存 Bun / TypeScript / generator / test stackだけを使い、upstream利用者可視契約を Amadeus namespaceへ再著作する | targeted、typecheck、lint、dist、promote-self、full CI、local lcov、exact patch coverage 100% / allowlist 0、sensor、独立 review |

## 変更候補

### Authored source

- `packages/framework/core/tools/amadeus-lib.ts`: 3 pure seam と内部の判別可能 union、reserved `help` vocabulary、marker path / TTL の正準定義。I/O、audit、stdout、mutation は置かない。
- `packages/framework/core/tools/amadeus-orchestrate.ts`: `parseNextFlags()` が正準 help routing を消費し、bare / namespace help を state 読取前の global helpへ投影する。自由文中の `help` は intent text のまま保持する。
- `packages/framework/core/hooks/amadeus-stop.ts`: autonomy を marker I/O 前に判定し、non-autonomous 時だけ stat→freshness→carve-out を評価する。stale の一回 unlink は decision と直交する best-effort janitor とし、失敗時も enforcement を継続する。
- `packages/framework/core/tools/amadeus-utility.ts`: direct `intent|space help/-h` の global help backstop、intent birth / space creation の reserved namespace refusal、unknown switch の安全な listing-only remediation、doctor の read-only marker row、recompose の mutation-before guard を実装する。

### Tests and generated evidence

- 新規: `tests/unit/t246-routing-and-autonomy-guards.test.ts`。3 pure seam の正常・境界・失敗結果を direct import で固定する。
- 新規: `tests/integration/t246-routing-and-autonomy-guards.test.ts`。実 shipped tools / Stop hook の subprocess と一時 workspace で3入口 parity、namespace mutation 0、marker janitor / doctor、recompose atomicityを固定する。
- 既存回帰: `tests/unit/t178-classify-terminal-command.test.ts`、`tests/integration/t195-stop-hook-compose-carveout.test.ts`、`tests/unit/t194-recompose.test.ts`、`tests/integration/t224-upstream-v2-migration-cli.test.ts`。
- generated: `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**` と self-install 4面は `bun scripts/package.ts` / `bun scripts/promote-self.ts --apply` の出力だけを受け入れる。
- `package.json`、TypeScript / test / coverage 設定、runner、threshold、allowlist は変更しない。coverage registry の3ファイルだけは、既存 test を正規登録するため recorded 裁定 `E-USSU04CGX1` の範囲で更新する。

## 実装計画

1. [x] **baseline と Unit 境界を固定する。** 現在の共有 dirty を列挙し、U04 の変更候補と既存 U07/U08 差分を分離する。現行 owner として `amadeus-lib.ts` の terminal classifier、`amadeus-orchestrate.ts:parseNextFlags()`、`amadeus-stop.ts:isPendingComposeStop()`、`amadeus-utility.ts` の intent / space / doctor / recompose を独立確認する。

2. [x] **既存 test stack と設定不変を固定する。** `bun:test`、integration fixture、Stop hook subprocess、local lcov / exact patch gate、package / promote ownershipで本 Unit を検証できることを確認する。新しい設定や test harness が必要なら追加せず leader へ再付議する。

3. [x] **3 pure seam を先に RED にする。** unit t246 に help decision matrix、reserved `help`、marker absent / fresh / stale / unreadable と24h境界、future mtime、invalid TTL、recompose autonomous / gated / unset の期待を追加する。正準 seam 不在により失敗する exact command / test count / error を記録する。

4. [x] **help routing の production path を RED にする。** integration t246 と既存 t178 に bare `help/-h`、`intent|space help/-h`、`space-create help/-h`、`help me build auth`、`build a help desk`、unknown intent / space、intent birth / space create の mutation 0を追加する。engine parser は既存 export `handleNext(args, projectDir)`、terminal classifier は既存 export `classifyTerminalCommand()`、direct utility は既存 export `runUtilityMain()` / `handleIntentBirth()` を production entry のまま in-process で駆動し、変更した private adapter line の全分岐を LCOV DA に載せる。同じ入力を shipped subprocess E2E に通し、in-process carrier と利用者可視 routing の一致を対照検証する。

5. [x] **marker freshness / janitor / doctor を production path で RED にする。** t195 と integration t246 に fake / controlled mtime を使い、fresh保持、stale削除、unlink失敗でも enforcement 不変、autonomous は stat / unlink なしで marker保持、doctor fresh PASS / stale FAIL / absent rowなし / unreadableでも他check継続 / 全path read-onlyを追加する。doctor は既存 export `handleDoctor(projectDir)` を in-process で駆動する。Stop hook は既存 `packages/framework/core/hooks/amadeus-stop.ts` 内のproduction-owned handlerを `/** @internal */ export function isPendingComposeStop(stateContent: string, deps: PendingComposeStopDeps = realPendingComposeStopDeps): boolean` とし、package barrel / manifest / product APIへ公開しない。`PendingComposeStopDeps` は `projectDir` / clock / stat / unlink を local substitute 可能にし、現production call-siteの `if (isPendingComposeStop(stateContent))` は変更せず同handlerを呼ぶ。top-level main portionだけを `if (import.meta.main) { ... }` でguard化してimport-safeにし、integration importでguard隣接行・`realPendingComposeStopDeps`初期化・handler全branchをDA>0、fake depsでstat / unlink / clock call数を観測し、実 `amadeus-stop.ts` subprocess E2Eと対照する。guard化でBiomeが全bodyをreindentして巨大diffになる場合は実装せず、別案をleaderへ先に付議する。

6. [x] **recompose autonomy guard を production path で RED にする。** t194 と integration t246 に autonomous state fixtureを追加し、guard前後の state、plan suffix、runtime graph、audit bytes / entry count を比較する。utility は既存 export `runUtilityMain()` から private `handleRecompose()` の実 call-siteへ in-process 到達させ、autonomous / gated / unset と既存 validation の変更行を DA>0 にする。同じfixtureを shipped utility subprocessでも実行し、state / plan suffix / runtime graph / audit の利用者可視 atomicityを対照する。gated / field未設定を positive control とし、既存 Running / pending / known slug / graph / walking-skeleton validationを維持する。

7. [x] **`amadeus-lib.ts` に3 pure seamを最小実装する。** discriminated union と正準 reserved vocabulary / marker定数を同じ owner に置き、pure functionから filesystem、clock、audit、stdoutを排除する。既存 terminal / migration / state API を不要に変更せず、invalid TTLは programmer errorとして fail-fast にする。

8. [x] **help consumer を正準 decision tableへ接続する。** engine と `classifyTerminalCommand` の重複分岐を `classifyHelpIntent` へ委譲し、utility の direct handler / creation choke pointへ同じ判定を適用する。拒否時に cursor、directory、state、auditを変更せず、unknown switch errorから workflow birth / space creation の誘導を除く。

9. [x] **Stop hook / doctor を marker seamへ接続する。** Stop hook は autonomous の先頭 return 後だけ markerを一回観測し、freshだけ allow-stop、staleだけ一回 unlinkする。unlink failureをcatchして decisionを変えず、doctor は同じ path / TTL / freshnessから advisory rowだけを生成して削除しない。

10. [x] **recompose adapterを mutation-before guardへ接続する。** audit lock内で state bytes を取得した直後に `assertRecomposeAllowed` を呼び、autonomousなら既存 validation / suffix / graph / write / audit の前に actionable non-zero で終了する。gated / unsetでは既存処理へそのまま進む。

11. [x] **targeted RED→GREENと patch coverageを確定する。** unit / integration t246 と t178 / t194 / t195 / t224 を実行する。3 pure seam は direct import、engine / terminal / utility / doctor は既存 exported production entry、Stop marker/autonomy adapterだけはproduction-owned `/** @internal */ isPendingComposeStop(..., deps = realPendingComposeStopDeps)`を local-substitutable depsで in-process 駆動し、変更した private adapter line、top-level `import.meta.main` guard追加行、real deps初期化を含む全追加分岐の LCOV DA>0 を確認する。既存production call-site文字列を変えず、各in-process経路には同一fixtureのshipped subprocess E2Eを併置し、internal handlerだけのgreenを禁止する。internal exportをpackage barrel / manifest / external product interfaceへ露出させず、新product public API、wire、schema、event、runtime dependency、threshold、allowlistを追加しない。本 Unit の追加実行可能行は exact patch coverage 100%、allowlist 0、uncovered 0とする。

12. [x] **6 package / 4 self-install projectionを正規生成する。** authored targetedがGREEN後に `bun scripts/package.ts`、generated6検証後に `bun scripts/promote-self.ts --apply` を実行する。source / generated / self-install の対象 bytes を照合し、`dist/` 手編集、orphan、未投影、6/4 closed set拡張がないことを確認する。

13. [x] **同一最終差分で verification と成果物を閉包する。** targeted、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`、local coverage / exact patch gate、directive sensorsを連続実行する。`code-summary.md`へ変更、FR/BR対応、RED→GREEN、生成面、hash、test/sensor、既知例外を記録し、別identityの独立reviewと§13判断をleaderへ付議する。実装・検証・sensor・summary・leaderへの付議を完了し、独立 review と §13 の recorded 裁定を待つ。

## 完了条件

- 3 canonical seam が設計どおり pure で、engine / pre-LLM / utility、Stop / doctor、recompose が同じ判定を消費する。
- help routing は3入口で一致し、自由文を奪わず、reserved namespace / unknown switch refusal の mutation が0である。
- marker は24h境界どおりで、fresh保持、non-autonomous stale janitor、unlink failure時のblock不変、autonomous marker未読・保持、doctor read-onlyが実測される。
- autonomous recompose は全 mutation 前に拒否され、state / suffix / runtime graph / auditが不変で、gated / unset と既存 strict validationが回帰しない。
- source、generated 6面、self-install 4面、targeted / typecheck / lint / dist / promote / full CI / coverage / sensor / 独立reviewが同一最終差分でgreenである。

## 非対象

- 新 service、database、network、UI、runtime dependency、schema、parser DSL、audit event、state field、permission / autonomy policy、threshold、waiver、retry、polling、cache、queue。
- U04外のUnit、別stage、既存巨大fileの一般refactor、不要なcleanup、upstream sourceの実行。
- `dist/` 手編集、self-install 6面化、recorded plan承認前の実装、commit、push、PR、merge。

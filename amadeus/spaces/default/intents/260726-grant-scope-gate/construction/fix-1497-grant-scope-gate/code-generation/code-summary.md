# Code Summary — fix-1497-grant-scope-gate

上流入力(consumes 全数): requirements.md、code-generation-plan.md

測定 ref: worktree `1497-standing-grant-scope-gate`、base `1c43438df`(全 file:line は本 worktree の作業ツリー実測)。

## FR 別の変更

### FR-1 / FR-2 — scope-grid 由来のスコープ内判定へ差し替え

正本 `packages/framework/core/tools/amadeus-lib.ts`:

- `scopeStageActions()` を新設(`:3980-3987`)。`loadScopeMapping()[scope]?.stages ?? null` を返す。`scope === ""`、scope キー不在、`loadScopeMapping()` の throw をすべて `null` へ倒す(fail-closed、NFR-2 / FR-5)。
- `standingGrantSatisfiesGate()`(`:4016-4049`)の `inScope` を `actions[stage.slug] === "EXECUTE"`(`:4027`)へ置換し、旧 `stage.scopes` 直読を削除(後方互換シムなし)。`actions === null` は `return false`(`:4024`)。
- 同じ `inScope` を `next` 探索(`:4028-4030`)と `firstConstruction` 探索(`:4032-4034`)の双方が共有するため、症状 A(phase boundary 恒真)と症状 B(walking-skeleton 除外の不発)が単一の変更で閉じる。
- 関数直上のドキュメントコメント(`:3989-4015`)を新方式へ更新し、per-unit ハードコードの安全根拠(FR-3)を明記。説明はすべてモジュールスコープに置き、関数本体内に standalone コメント行を作っていない(cid:code-generation:bun-inbody-comment-da0)。

シグネチャは不変(NFR-1)。呼び出し元 `amadeus-grant-authorization.ts:336`、`amadeus-state.ts:2470` / `:3269` は無改修。

### FR-3 — per-unit 軸の実測確認(結論: 欠陥なし → FR-3c)

`isPerUnitStage: false` / `isPerUnitFinalGate: false`(`amadeus-lib.ts:4044-4045`)のハードコードが安全である根拠を、directive 経路と approve 経路の双方で実読して確定した。

| # | 実測した経路 | file:line | 観測 |
|---|---|---|---|
| 1 | per-unit 中間反復の directive 生成 | `amadeus-orchestrate.ts:2713` `directive.gate = false;` | 未カバーの unit ごとに gate を false へ落とす |
| 2 | 同 directive の発行 | `amadeus-orchestrate.ts:2720` `emit(directive);` | `routeMainWorkflowDirective` を通さず直接 emit → grant ルータへ到達しない |
| 3 | 全 unit カバー後の最終ゲート | `amadeus-orchestrate.ts:2697` `emit(routeMainWorkflowDirective(...))` | ルータを通る唯一の per-unit directive(= final gate) |
| 4 | grant ルータの入口 | `amadeus-grant-authorization.ts:742` `if (options.directive.gate !== true) return options.directive;` | gate:false は無変更返却 → route receipt が mint されない |
| 5 | solo grant-backed approve | `amadeus-state.ts:2982` / `:2987` | `authority.kind === "grant-backed"` は route receipt の解決を必須とする → receipt 不在では成立しない |
| 6 | approve のチェックボックス前提 | `amadeus-state.ts:2919` `validateSlugInState(content, slug, "awaiting-approval")` | ステージ checkbox が `[?]` のときのみ approve 可。per-unit 中間反復は gate-start を発行しないため `[?]` にならない。checkbox は unit 単位ではなくステージ単位であり、「per-unit 中間ゲート」という承認対象自体が存在しない |
| 7 | team mode approve | `amadeus-state.ts:2443` `assertHumanPresentForGateResolution` → `:2470` | approve/reject verb からのみ到達(`:2814` / `:3652`)。同じく awaiting-approval 前提 |
| 8 | delegate-approval | `amadeus-state.ts:3269` `standingGrantForDelegation` | 対象 intent のステージゲートを判定。per-unit 中間状態は同上の理由で到達しない |

結論: per-unit 中間反復は本述語に**構造的に到達しない**。到達する唯一の per-unit ゲートは all-covered final gate であり、`evaluateStandingGrantGateEligibility`(`amadeus-lib.ts:3951-3968`)の per-unit 分岐は `isPerUnitStage && !isPerUnitFinalGate` を条件とするため、final gate 文脈では `(false,false)` と `(true,true)` が同値。よって欠陥ではない(FR-3c)。根拠はコードコメント(`amadeus-lib.ts:4002-4013`)と以下のテストで固定した:

- `tests/integration/t-standing-grant-composed-scope.test.ts` の `#1497 FR-3` describe(final gate での2エンコーディング同値、および incomplete 文脈なら `per-unit-incomplete` で拒否されること)
- 既存 `tests/integration/t-solo-gate-transaction-seam.test.ts:185` "never routes a per-unit iteration directive"(gate:false は receipt を mint しない)

### FR-4 — テスト fixture の実構造準拠化

- 新規 `tests/integration/t-standing-grant-composed-scope.test.ts`(17 テスト)。実 `.codex/tools/data/stage-graph.json` + 実 `.codex/tools/data/scope-grid.json` + 実 `.codex/scopes` を読む。
- 新規 `tests/harness/real-scope-data.ts` — 実データ面の env seam を単一定義で提供(`useRealScopeData()`)。`dist/claude/.claude/scopes` は stock 10 のみ、正本 `packages/framework/core` は compiled data を持たないため、composed スコープを持つ唯一の完全面である `.codex` を採用した。
- 捏造 fixture の是正(`scopes: ["amadeus-feature"]` → stock 語彙 `["feature"]`、composed 解決は grid 由来へ):
  - `tests/unit/t-solo-standing-grant-domain.test.ts:32-47`
  - `tests/integration/t-solo-standing-grant-domain.test.ts:48-64`(+ `useRealScopeData` を beforeAll/afterAll に配線)
  - `tests/integration/t-solo-gate-transaction-seam.test.ts:313-330`(+ 同配線)
  - `tests/harness/solo-gate-fixture.ts:52-56`(in-process 側にも実データ面を適用。spawn 側は既存の `stateEnv` が同じ `.codex` 面を渡していたため、両側が同一データを見るようになった)
- 既存テストの検証意図(directive contract / transaction 不変量 / 選択アルゴリズムの計数)は一切変更していない。

### FR-5 / NFR-2 — fallback 性質

`scopeStageActions` は throw せず `null` を返し、述語は `false` を返す(= `gate-out-of-scope` → `amadeus-grant-authorization.ts:762` の directive 無変更返却 → 通常の human presence 経路)。`ERROR_LOGGED` 経路へは流れない。テスト: `#1497 FR-5 / NFR-2` describe の3件(未知スコープ / Scope フィールド不在 / grid・scopes dir がともに不在)。

## RED → GREEN 実測ログ

| 段階 | コマンド | exit | 結果 |
|---|---|---|---|
| RED(修正前) | `bun test tests/integration/t-standing-grant-composed-scope.test.ts` | 1 | 8 pass / 9 fail — FR-1a、FR-2a/b/c(4件)、FR-5/NFR-2(3件)、NFR-1 が赤 |
| GREEN(修正後) | 同上 | 0 | 17 pass / 0 fail(26 expect) |
| fixture 是正前 | `bun test tests/unit/t-solo-standing-grant-domain.test.ts tests/integration/t-solo-standing-grant-domain.test.ts tests/integration/t-solo-gate-transaction-seam.test.ts` | 1 | 71 pass / 8 fail |
| fixture 是正後 | 同上 | 0 | 79 pass / 0 fail |
| harness 是正後 | `bun test tests/integration/t-solo-gate-transaction-{carrier,prefix,report}.test.ts tests/integration/t-solo-gate-transaction.test.ts` | 0 | 39 pass / 0 fail |

RED 時に赤くならなかった 8 件は「opt-out が phase boundary / terminal を覆わない」「per-unit の eligibility 分岐」など修正前も false 側で成立する性質であり、修正後も同値であること(偽陽性の裏側)を GREEN で確認している。

## 検証コマンドの実測結果

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0(warning 307 / info 19 は既存ベースライン) |
| `bun scripts/package.ts` | 0 |
| `bun run promote:self` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/gen-coverage-registry.ts` | 0 |
| `bash tests/run-tests.sh --ci`(1回目、fixture 是正前) | 7 — Failed files 7 / Failed assertions 45 |
| `bash tests/run-tests.sh --ci`(2回目、是正後) | 0 — Test files 560 / Failed files 0 / Total assertions 7796 / Failed assertions 0 |

1回目の赤 7 ファイルは assertion 実文まで読んで帰属を確定した(cid:code-generation:local-ci-red-assertion-verbatim):
`t-solo-gate-transaction-{carrier,prefix,report}` / `t-solo-gate-transaction` / `t-solo-standing-grant-opencode-mint` の 5 件は `fixture grant is invalid: gate-out-of-scope`(`tests/harness/solo-gate-fixture.ts:267`)= in-process 側に実 scope データ面が無かったことによる fail-closed。`t134-mechanism-honesty` / `gen-coverage-registry` の 2 件は新規テストファイルが coverage registry 未登録(`missing from committed registry`)。いずれも是正済みで 2 回目は全 green。

## 配布同期(NFR-3)

`amadeus-lib.ts` は 11 面すべてが更新された(`git status --porcelain` 実測): 正本 1(`packages/framework/core/tools/`)+ self-install 4(`.claude` / `.codex` / `.cursor` / `.opencode`)+ dist 6(`claude` / `codex` / `cursor` / `kiro` / `kiro-ide` / `opencode`)。`dist:check` / `promote:self:check` ともに exit 0。

## カバレッジ(NFR-4)

`bun test --coverage --coverage-reporter=lcov` を新規テスト + 関連 integration 3 ファイルに対して実行し、lcov の DA を直読した。追加・変更行はすべて DA > 0:

- `scopeStageActions` 本体 `:3980`(47) / `:3981`(68) / `:3982`(18) / `:3983`(101) / `:3984`(11) / `:3985`(18)
- `standingGrantSatisfiesGate` 変更行 `:4023`(86) / `:4024`(78) / `:4027`(124)

diff 追加行の未カバー 0。`tests/.coverage-registry.json` を再生成し、従来 UNCOVERED だった `function:standingGrantSatisfiesGate` が `tests/integration/t-standing-grant-composed-scope.test.ts` によって covered になった(`:3513-3519`)。

## allowlist 行ピン照合(NFR-5)

`packages/framework/core/tools/amadeus-lib.ts` は +35/-3 行(`git diff --numstat` 実測)。挿入位置は `:3971` 付近で、正味 +34 行のシフトが `3971` 以降に発生。`tests/.coverage-patch-allowlist.json` の 4 エントリを全数、reason と現行行内容で直読照合した:

| ピン(変更後) | 現行行内容 | reason との一致 |
|---|---|---|
| `2195-2196`(不変) | `context: LockedIntentRegistryContext,` / `) => T extends Promise<unknown> ? never : T,` | 一致(runtime-erased な総称パラメータ行) |
| `2708-2710`(不変) | 同型3行 | 一致 |
| `3886-3887`(不変) | `} catch {` / `return null;` | 一致(`findActiveStandingGrant` の防御的 catch) |
| `5491-5493` → **`5525-5527`** | `mkdirSync(mutex);` / `return true;` / `} catch {` | 一致(stale-mutex steal 後の race-loser arm)。変更前は解説コメント行を指す stale 状態だった |

## 逸脱

なし。要件・設計からの逸脱は発生していない。

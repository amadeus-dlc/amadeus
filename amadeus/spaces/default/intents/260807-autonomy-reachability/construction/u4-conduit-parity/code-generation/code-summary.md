# Code Summary — u4-conduit-parity

上流入力(consumes 全数): code-generation-plan.md(本 unit の受け入れ基準・実装方針)、functional-design/business-logic-model.md(追記対象面と文言の導出)、functional-design/business-rules.md(BR-U4-1〜5 の充足判定)、functional-design/domain-entities.md(導線エンティティの同定)、nfr-design/performance-design.md(パリティテストの実行コスト方針)、nfr-design/security-design.md(認可境界を文言で緩めない不変)、units-generation/unit-of-work.md(u4 の境界)、requirements-analysis/requirements.md(FR-5a〜5e)。

## 着地内容

PR: https://github.com/amadeus-dlc/amadeus/pull/2532(ブランチ `bolt-2378-u4-conduit-parity`、コミット `6f32a3acc` + `f679e2864`)

`--autonomy` 起動宣言は u2(PR #2524)で実際に動くようになったが、conductor が実際に読む面には記載がゼロだった(RE finding 8)。本 unit はその導線を全面へ追記し、パリティを blocking テストで固定した。

### FR-5a — ハーネス入口(8面)

`packages/framework/harness/{claude,codex,kimi,kiro,kiro-ide,pi}/skills/amadeus/SKILL.md` と `packages/framework/harness/{cursor,opencode}/commands/amadeus.md` へ、フラグ列挙と説明ブロックを追記した。文言は u2 の実装(`applyBirthAutonomyDeclaration` / `applyLaunchAutonomyDeclaration`)を読んで実挙動に一致させてある — `none|semi` は birth と同時に適用され、`full` は儀式手順を印字して停止する。

### FR-5b — help / README / reference

`packages/framework/core/tools/amadeus-utility.ts` の help(フラグ行と使用例)、`README.md` / `README.ja.md`、`docs/reference/24-intent-autonomy.md` / `.ja.md`。対訳2面は同一変更で同期した(project.md Mandated)。

### FR-5c — stage-protocol の semi 手順

`packages/framework/core/amadeus-common/protocols/stage-protocol.md` に semi の `decide-question` 操作手順を新設した。既存の full 手順を名指しして参照し、実際の差分2点(semi スコープの適用基準、`--policies-file`)だけを分離して書いてある — 手順本体を複製すると2箇所が別々に腐るため。

あわせて `AUTONOMY IS NEVER INFERRED` の一文を、「エンジンに記録された mode による自動裁定は推論ではない」と整合するよう改訂した。同根棚卸し(cid:code-generation:same-root-inventory)により claude だけでなく kimi / kiro / kiro-ide の同一行も是正している — 1面だけ直すと残り3面が旧文言のまま残る形だった。

### FR-5d — パリティ回帰テスト

`tests/integration/t492-autonomy-conduit-parity.integration.test.ts`(138行)。

## 対象面集合の導出(件数のマジックナンバーなし)

ハーネス集合は**ディスク走査で導出**する — `readdirSync` で `packages/framework/harness/` を列挙し `isDirectory()` で絞る。`registry.ts` / `projections.ts` は ignore list ではなく**構造的に**落ちる(ファイルなので `isDirectory()` が偽)。各ハーネスは2つの入口形(`skills/amadeus/SKILL.md` / `commands/amadeus.md`)のどちらかに解決する。新しいハーネスは**存在するだけで契約に参加**し、テストファイル内に件数は一切現れない(cid:functional-design:c3-adjacent-enum-numerals)。

導出自体も assert している: `entryPointsOf(harness).length !== 1` は赤になる。これが無いと、入口が移動したハーネスが集合から静かに抜けても全 assertion が通ってしまう(集合が空でも「全件 pass」になる vacuity)。

docs 面(README 対 / reference-24 対)は列挙できるディレクトリを持たないため明示リストで、そのリスト自体が canonical 定義になる。help text はソースを grep せず `dist/claude/.claude/tools/amadeus-utility.ts help` を spawn し、`status === 0` と stdout 内容で観測する — 出力面を直接見ることで「ソースに書いたが help に出ない」を捕捉できる。

## 落ちる実証(conductor が独立に1セットで実施)

builder は `opencode/commands/amadeus.md` で1セットを実施済み。conductor は**別の面**で独立再現した(cid:code-generation:falling-proof-injection-one-set — 注入・赤・復元・残渣ゼロを不可分に実施):

1. `packages/framework/harness/kimi/skills/amadeus/SKILL.md` の `--autonomy` 4箇所を `--CONDUCTOR-PROOF` へ置換(残 0 を grep 確認)
2. 赤の実測 — `+ "harness:kimi"` / `(fail) t492 --autonomy conduit parity > every harness entry point names the launch declaration flag` / `4 pass 1 fail`。**赤が面を名指ししている**(どのハーネスが欠けたか出力から分かる)
3. 復元 — `git checkout f679e2864 -- packages/framework/harness/kimi/skills/amadeus/SKILL.md`(cid:code-generation:falling-proof-no-stash に従い stash を使わず、復元 ref に fix コミット SHA を明示)
4. 残渣ゼロの機械確認 — `git status --short` は `node_modules` symlink 以外 clean、repo 全域の `CONDUCTOR-PROOF` grep が 0 hit
5. 再実行 green — `5 pass / 0 fail`

## 検証(exit code を個別に捕捉)

PR worktree(`origin/main` 起点、`.../scratchpad/u4-pr`)で実測:

| コマンド | exit |
|---|---|
| `bun run build` | 0 |
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun tests/gen-coverage-registry.ts --check` | 0 |
| `bun run source-only:check` | 0 |
| `bun test t492 + t-coverage-mechanism-ratchet` | 7 pass / 0 fail |

builder 側の conductor tree での全 CI: `bash tests/run-tests.sh --ci` exit 0(907 files・12181 assertions・0 fail)。`bun run build` 後の追跡ファイルは不変。

## 宣言済み逸脱 — 並行宣言 batch の逐次実装(E-CGDRIFT 裁定 2-0、GoA 2x2)

engine のプラン乖離ガードが code-generation ステージゲートで report を拒否した。並行と宣言された batch 1 / batch 3 を逐次実装したためである。選挙 E-CGDRIFT で「環境強制の意図的逸脱として申告して進む」を採用した(もう一方の exit である `unit-of-work-dependency.md` への依存エッジ追加は採らない — u4 と u5 の間に技術的依存は無く、実在しない依存を graph へ固定することは P2 に反する)。

**機序**(投票者の留保による精密化): `prepare` が使えなかったのではない — batch 1 では実際に走っており、audit seq 559 の `amadeus.swarm.started` が `Batch number: 1` / `Concurrency cap: 3` / 3 unit 名を記録している。構造的に不能だったのは **engine が repo 内に作った worktree に対する agent 自身の書込・git 操作**で(cid:code-generation:c1-pcp-isolated-session-swarm-incompat)、その帰結として `check` / `finalize` の convergence が記録されなかった。本 intent の audit に現れる `SWARM_*` は `SWARM_STARTED` 1件のみ、`SWARM_COMPLETED` は 0 件である。batch 3 は fan-out 自体が無く、これは batch 1 とは別の事実である。

**代替の検証水準**(`converged` 表記は用いない — referee の verdict が存在しないため): 本 unit については上の「検証」節の実測 exit code 群と落ちる実証、および PR #2532 の CI 全 check green が referee の代替として機能した検証面である。fidelity は builder head の2コミットを conductor ツリーと PR worktree の双方へ取り込み、対象ファイル差分が空であることで確認した。

## 申し送り

t492 が CLI を spawn するため、mechanism ratchet が当該テストを `none→cli` と再分類し `EXPECTED_NONE_TO_CLI` への登録を要求した(コミット `f679e2864`)。**触ったテストだけを流しても発見できないゲート**であり、初回の全 CI で初めて赤になった。以後 spawn を伴うテストを足す unit は同じ経路を通るため、`bun test <対象>` の green を完了根拠にせず全 CI まで回す必要がある(cid:code-generation:integration-registry-regen と同族の、テスト宇宙が変わることで別ゲートが動く類型)。

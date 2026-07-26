# Build & Test Results — 260725-worktree-ref-fixes(HEAD a84ff821c)

上流入力(consumes 全数): `amadeus/spaces/default/intents/260725-worktree-ref-fixes/construction/fix-worktree-ref-family/code-generation/code-generation-plan.md`、`amadeus/spaces/default/intents/260725-worktree-ref-fixes/construction/fix-worktree-ref-family/code-generation/code-summary.md`

- `code-generation-plan.md` Step 8 の検証一式、`code-summary.md` の二重確認表を本結果の判定基準として引用した。

## 実測結果(builder / conductor の二重実測+コミット後 fresh スタンプ)

| # | 検証 | exit | 測定 |
|---|---|---|---|
| 1 | `bun run typecheck` | 0 | builder+conductor+コミット後 2026-07-26T01:31Z |
| 2 | `bun run lint` | 0 | builder+conductor |
| 3 | `bun run dist:check` | 0 | builder+conductor+reviewer |
| 4 | `bun run promote:self:check` | 0 | 同上 |
| 5 | `bash tests/run-tests.sh --ci` | 0 | builder(558 files/Failed 0)+conductor 独立再実行(RESULT: PASS) |
| 6 | t257 / t258 / t259 / t296 / t202 | 全 0 | コミット後 2026-07-26T01:31Z(worktree = named path) |
| 7 | coverage patch gate | 0 | added 43 / covered 39 / allowlisted 4 / uncovered 0 |
| 8 | coverage project gate / complexity gate | 0 / 0 | 84.55% vs baseline 40.94% |
| 9 | `bun tests/gen-coverage-registry.ts --check` | 0 | reviewer 独立実測(fresh, guards green, ratchet held) |

## 落ちる実証(赤→緑の対照)

- FR-1: 修正前 t257/t258/t259 = exit 1(`cannot/Cannot/Unable to resolve Git ref refs/heads/worktree-bugfix-1482-1481-1455`)→ 修正後 exit 0
- FR-2: t202 test 7/8 は payload rung なしの旧実装では成立しない契約
- FR-3: 無引用起動行×空白パス = exit≠0 / 出荷形 = exit 0(t296 内で対照実行)

## verdict: 条件付き READY(未検証面の明示 — cid:build-and-test:c4-conditional-ready)

**検証済み面**: 4 Issue の修正ロジック(in-process+実サブプロセス)、named path(worktree 実実行)、配布同期(dist 6+self-install 4)、coverage/complexity ゲート、§12a 2 iterations(NOT-READY→是正→READY GoA 1)。

**未検証面(名指し)**:
1. **実ハーネス end-to-end**: EnterWorktree 実セッションで Claude Code が hook を起動し payload cwd が worktree に解決される経路 — 本セッションは #1492 被害環境(hook 全不発)のため実ハーネス経由の検証が構造的に不能。t202/t296 は in-process/サブプロセス同型で検証済みだが、ハーネス実起動面は次の正常セッションでの実測が必要
2. **#1492 の残余機序**: 本セッションの全 hook 無音不発は env unset 単独で説明不能(Issue へ実測コメント済み、Refs 維持で継続調査)
3. **依存 audit の既存 High 3 件**: 本変更の導入物ではない(依存追加ゼロ)が、リポジトリ全体としては未解消(スコープ外送り)

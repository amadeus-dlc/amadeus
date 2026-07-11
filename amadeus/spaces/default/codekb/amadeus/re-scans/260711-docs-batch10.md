# Re-scan 記録 — 260711-docs-batch10

> #707 契約(per-intent re-scan 記録)。差分ベース点の真実源はこのファイル(この intent 固有)。共有 `reverse-engineering-timestamp.md` は鮮度ポインタであってベース点ではない。

## スキャンメタデータ

- **base**: `60f5e1edf472517c5fc2b4a1c388dd9a5030446c`(前回 intent `260711-p3-cleanup-batch8` の observed。E-L63 追加1則の手続きで選定 — 下記「base 決定過程」参照。2026-07-11 21:50:52 +0900 / "fix(engine): record ERROR_LOGGED for orchestrate error exits (#839) (#879)")
- **observed**: `d6375bba68f415ce1a31e9a4d70e07fbfe80be85`(`git rev-parse HEAD` 実測)
- **date**: 2026-07-12
- **intent**: `260711-docs-batch10`(documentation 4件 — #765 / #764 / #763 / #728)
- **scope**: documentation
- **手法**: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。本バッチは restart-loss ではなく起票時からの docs ギャップ+tests の stale コメントであり、E-L53 3点法のうち (a) 元修正対照は非該当、(b) observed 現存 (c) 区間不変を実測。base/observed の真実源は本ファイルと `inception/reverse-engineering/scan-notes.md`。
- **実施体制**: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)

## base 決定過程(E-L63 追加1則)

`re-scans/` 各記録の observed を列挙し、`git merge-base --is-ancestor <observed> HEAD` で HEAD 祖先性を判定、祖先のうち距離最小(最新)を base に採用した。

| observed 候補 | 由来 re-scan | HEAD 祖先? | 距離(`rev-list --count observed..HEAD`) |
|---|---|---|---|
| `60f5e1edf472...` | 260711-p3-cleanup-batch8 | YES | **64(採用)** |
| `37ad36a97fe8...` | 260711-p2-repair-batch7 / p3-repair-batch6 | YES | 75 |
| `b845478bbf25...` | 260710-bughunt-fix-batch | YES | 121 |
| `11c52f153fe8...` | 260710-swarm-worktree-batch | NO | (非祖先=除外) |
| `24197d755a51...` | 260709-dynamic-test-size | YES | 302 |

→ HEAD 祖先のうち距離最小の `60f5e1edf472517c5fc2b4a1c388dd9a5030446c`(距離64)を base に採用。observed=HEAD=`d6375bba68f415ce1a31e9a4d70e07fbfe80be85`。

## focus(スキャンスコープ)と4欠陥の現物照合(observed 実測)

- **#765(S4/documentation)`set-skeleton-stance` verb が docs 未記載**: `grep -rln set-skeleton-stance docs/` = **0件**(実測)。source 真実: `packages/framework/core/tools/amadeus-state.ts:371`(`case "set-skeleton-stance"`)、`:445`(Valid 一覧に列挙)、`:508-517`(コメント: 「No audit row — the stance is metadata …」)、`:518`(`handleSetSkeletonStance`)。値域 `on|off|scope-dependent`(`:522`)。`Skeleton Stance` フィールドを `## Runtime State` 下へ upsert する runtime metadata で **audit row を持たない**(`set` と同様に無イベント)。正準記載ページ = `docs/reference/12-state-machine.md`(state verb / `## Runtime State` フィールド構造。audit event ではないため taxonomy 表ではなく verb・Runtime State 側)。
- **#764(S4/documentation)`--new-intent` フラグが docs/reference 未記載**: `grep -rn -- --new-intent docs/reference/` = **0件**(実測)。source 真実: `packages/framework/core/tools/amadeus-orchestrate.ts:321`(`newIntent?` 宣言 + 意味論コメント)、`:336`(`parseNextFlags`)、`:375`(`else if (a === "--new-intent")`)、`:1427`(Branch 4a — new-intent 分岐)。姉妹フラグ `--resume`(`:371`)・`--single`(`:373`)も同 parser 内に実在。正準記載ページ = `docs/reference/03-orchestrator.md`(Entry Points / Intent birth 節 `:115`)。
- **#763(S4/documentation)`18-workspace-layout.md` の `.ja.md` ペア欠落**: `docs/reference/*.md` を全数走査。`.ja.md` ペア欠落は **18-workspace-layout.md のみ**(00-overview〜17-skill-system の18本 + diagrams.md はすべてペア有り、実測)。E-L56「ペア規約の唯一の欠落が 18 のまま」を再確認、新規欠落なし。18-workspace-layout.md は145行の ADR 体裁(見出し: Context / Decision / Alternatives Considered / Path Impact / Guard Preservation / Validation Checklist / Consequences / Future Migration Trigger / Potential Follow-Up Slices)。
- **#728(S4/documentation)`assertNotSiblingWorktree` stale コメント参照**: `grep -rn assertNotSiblingWorktree tests/` = **13ファイル / 14参照**(実測、下記)。product は `resolveWorktreeAnchor` へ改名済み(`packages/framework/core/tools/amadeus-worktree.ts:167` 定義、`:154` コメント、`:262/:349/:589` 呼出)。旧名は source に**不在**(`grep assertNotSiblingWorktree amadeus-worktree.ts` = 0件)。コメントは行番号も stale(`:101` / `:101-121` / `:112` / `:459->101` / `:162`)で現定義 `:167` と不一致。

### #728 の14参照内訳(file:line)

- `tests/harness/fixtures.ts:283` / `:542`(**2参照**)
- `tests/integration/t49-bolt-sensor-failures.test.ts:21`
- `tests/integration/t78-bolt-worktree-lifecycle.test.ts:68`
- `tests/integration/t162-per-intent-layout-cli.test.ts:29`
- `tests/e2e/t02.test.ts:17`
- `tests/e2e/t03.test.ts:18`
- `tests/e2e/t04.test.ts:21`
- `tests/e2e/t05.test.ts:20`
- `tests/e2e/t07-audit-fork-merge.test.ts:31`
- `tests/e2e/t09-halt-and-ask-preservation.test.ts:36`
- `tests/e2e/t10-halt-and-ask-discard.test.ts:26`
- `tests/e2e/t11-halt-and-ask-retry-correlation.test.ts:28`
- `tests/e2e/t12-bolt-runtime-graph-fork.test.ts:36`

計 13ファイル・14参照(fixtures.ts のみ2参照、他12ファイルは各1参照)。

## 差分の焦点影響(`60f5e1edf..d6375bba6`)

- `git diff --name-status base..observed -- docs/reference/ tests/ <3 source tools>` は12-state-machine.{md,ja.md}・amadeus-{state,orchestrate,worktree}.ts 等を含むが、4欠陥トークン(`set-skeleton-stance` / `--new-intent` / `18-workspace-layout` / `assertNotSiblingWorktree`)は区間 diff の追加/削除行に**不在**(`git diff base..observed -- docs/reference/ tests/ | grep -E '<4 tokens>'` = 0件、実測)。
- したがって4欠陥は base 時点から未変化のまま observed に現存する既存ギャップ。区間の 12-state-machine.md 変更は set-skeleton-stance 面と非交差。

## 交差観測(U1 #765 × U2 #764)

- U1(#765)の記載先 = `docs/reference/12-state-machine.md`(+ `.ja.md`)。
- U2(#764)の記載先 = `docs/reference/03-orchestrator.md`(+ `.ja.md`)。
- 両者は**ファイル非交差**(静的目録の突き合わせ)。03-orchestrator.md 内の `skeleton` 言及は walking-skeleton(Bolt)であって set-skeleton-stance verb ではなく、U1 が 03 へ波及する必要はない。→ U1 と U2 は並行実装可能(requirements の直列/並行判断の材料)。
- U3(#763)= `18-workspace-layout.ja.md` 新規作成(既存ファイルに触れない純追加)、U4(#728)= `tests/` 13ファイルのコメント修正。U1/U2/U3/U4 は相互に非交差(docs/reference の別ファイル群 + tests)。

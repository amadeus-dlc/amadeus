# ビルド・テスト結果 — 260725-teamup-launch-hardening

上流入力（consumes 全数）: `construction/u1-watcher-actas-guard/code-generation/code-generation-plan.md`、`construction/u1-watcher-actas-guard/code-generation/code-summary.md`、`construction/u2-worktree-parallel/code-generation/code-generation-plan.md`、`construction/u2-worktree-parallel/code-generation/code-summary.md`

（両ユニットの `code-summary.md` が申告した検証結果を、conductor が全数再実行して裏取りした記録である。）

測定 ref: `afe344eea`（本 intent のブランチ HEAD）。数値はすべてコマンド出力からの転記。

## 検証コマンド

| コマンド | exit code |
|---|---|
| `bun run typecheck` | **0** |
| `bun run lint` | **0** |
| `bun run dist:check` | **0** |
| `bun run promote:self:check` | **0** |
| `bash tests/run-tests.sh --ci` | **0**（`RESULT: PASS`） |

初回実行時に4種が exit 127 を返したが、原因は `bun` が PATH 上に無かったことでコマンド自体が起動していない。実装の失敗ではないため検証失敗として扱わず、PATH を通して再実行した値を上記に載せている。

## 本 intent のテスト

| テスト | 結果 |
|---|---|
| `t295-team-up-worktree-parallel.test.ts`（新規 273行） | **PASS** |
| `t294-team-up-watcher-applicability.test.ts`（書き換え 113行） | **PASS** |
| `t-team-up-watcher-arming.test.ts`（既存 268行） | **PASS** |

full CI の FAIL 件数は **0**（`grep -c "FAIL:" = 0`）。

## 既存の警告（本 intent 由来ではない）

```
wall-clock drift: 1 file(s)
  tests/integration/t-codex-hooks-migration.test.ts: declared=medium measured=large (36.450853s)
```

このファイルの最終変更は `bf84cdfaf fix(codex): separate canonical and active hooks (#1212)` であり、本 intent は触っていない。`RESULT: PASS` を妨げていないため、`project.md` Forbidden（既存の赤を無視しない）に従い**ここに明示的にフラグしたうえで**スコープ外とする。

## 配布面の同期

正本 `packages/framework/core/tools/team-up.sh` は **11 コピー**へ同期済み。

- 正本 1
- `dist/` 6ハーネス（claude / codex / cursor / kiro / kiro-ide / opencode）
- セルフインストール 4（`.claude/` `.codex/` `.cursor/` `.opencode/`）

`dist:check` と `promote:self:check` がともに exit 0 であることで機械確認した。

## 実測（実 launch）

| 構成 | アタッチ到達 | 終了コード | sentinel |
|---|---|---|---|
| 3人（U1 のみ、instance `bench4`） | 6.02秒 | 0 | 3/3 |
| 7人（U1+U2、instance `bench5`） | **11.80秒** | **0** | **7/7** |

`git worktree add` の並列度別（7人構成、隔離インスタンス）:

| 並列度 | 所要 |
|---|---|
| 直列 | 7.77秒 |
| 4（採用値） | **3.60秒 / 3.55秒** |
| 無制限（7） | 7.55秒 |

無制限が直列とほぼ同じなのは git がオブジェクトストアで直列化するため。**上限を置くこと自体が効果の源**である。

計測環境はすべて隔離インスタンスで実施し撤去した。`git worktree list` は計測前後とも 32件で一致。

## RAID 由来の未検証事項の解消

### resume（`-c`）での actas ロック残存 — **解消（既存機構による）**

実測手順と結果:

1. `bench5` 撤去後に `actas.amadeus-bench5__*.session` が 4件残留していることを観測（撤去コマンドが zsh の glob 不一致で中断していたため）
2. 各ロックの所有 session_id に埋め込まれた PID を `ps -p` で照合 → **4件すべて DEAD**
3. `actas_lock_gc_stale`（`~/.agents/skills/agmsg/scripts/lib/actas-lock.sh`）を実行 → `reclaimed=4`、残留 **0件**

この GC は `session-start.sh:171` が毎回呼んでおり、死んだ所有者のロックはセッション開始時に自動回収される。あわせて `session-end.sh:88` が `actas_lock_release_all` を呼び、正常終了時には自分のロックを解放する。

**したがって resume 時のロック残存は既存機構で閉じており、本 intent の変更を要しない。** これは本 intent の成果ではなく、リスクが実在しなかったことの確認である。

### R-3（actas の受信範囲制限が配送を壊さないか） — **未検証**

7人起動が exit 0・sentinel 7/7 で成立したことは watcher が arm されたことの証拠だが、**実際のメッセージ配送は試していない**。起動の成立と配送の成立は別の面である（`cid:reverse-engineering:seam-feasibility-multi-facet`）。

本 intent のスコープは起動経路であり配送は含まない。配送の検証は #1476 の実運用投入時に別途行う必要がある。ここで「起動が通ったから配送も大丈夫」とは書かない。

### R-6（Linux CI 上の並列度特性） — **未検証**

並列度4は macOS の実測から決めた値であり、Linux での特性は測っていない。上限を置く設計自体がハードウェア差を吸収する想定だが、その想定の根拠は移植していない。

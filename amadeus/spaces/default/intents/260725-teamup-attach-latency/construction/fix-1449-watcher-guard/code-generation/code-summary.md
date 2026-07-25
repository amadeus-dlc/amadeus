# Code Summary — fix-1449-watcher-guard

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-attach-latency/inception/requirements-analysis/requirements.md`

- `requirements.md` — FR-1〜FR-6 と NFR-1〜NFR-4 を受け入れ基準として実装・検証した。FR-5 が存置を要求する4関数・2定数はテスト `verification functions and budget constants are retained (FR-5)` で機械確認し、NFR-4 の変更最小性は正本 diff が `watcher_verification_applies` とその直上コメントに限定されることで満たした。

測定 ref: 修正コミット `294df1281`（親 `ec624022f`）。件数・exit code はすべてコマンド出力からの転記。

## 変更ファイル（13件、コマンド出力: `git show --stat 294df1281`）

| 面 | ファイル |
| --- | --- |
| 正本 | `packages/framework/core/tools/team-up.sh` |
| dist（6面） | `dist/claude/.claude/tools/team-up.sh`、`dist/codex/.codex/tools/team-up.sh`、`dist/cursor/.cursor/tools/team-up.sh`、`dist/kiro/.kiro/tools/team-up.sh`、`dist/kiro-ide/.kiro/tools/team-up.sh`、`dist/opencode/.opencode/tools/team-up.sh` |
| self-install（4面） | `.claude/tools/team-up.sh`、`.codex/tools/team-up.sh`、`.cursor/tools/team-up.sh`、`.opencode/tools/team-up.sh` |
| テスト | `tests/integration/t294-team-up-watcher-applicability.test.ts`（新規）、`tests/integration/t-team-up-watcher-arming.test.ts`（既存、適用可否ケースのみ） |

## 実装（FR-1 / FR-2 / FR-5）

`watcher_verification_applies` に、agmsg `spawn.sh:565-568` と同型の適用可否ガードを追加した。前置条件 `RUNTIME=claude` かつ `MSG_BACKEND=agmsg` を保持し、その上で `CLAUDE_MONITOR_PROMPT` が actas 形（` actas ` を含む）である場合のみ真を返す。既定の monitor プロンプトでは stderr へ `#1449` / `#1476` を含む理由行を1行出力して偽を返す（FR-2）。stdout は一切触らない。

launch 経路はこのガードを2回呼ぶ（`team-up.sh:1438` の stale sentinel クリア前と `:1455` の検証前）ため、通知を run ごと1回に閉じる `WATCHER_SKIP_ANNOUNCED` ラッチを置いた。これがなければ FR-2 の「1行」を満たさない。

`verify_watchers_armed` / `ready_sentinel_path` / `resend_monitor_prompt` / `clear_stale_watcher_sentinels` と `WATCHER_READY_TIMEOUT` / `WATCHER_RESEND_MAX` は未変更で存置した（FR-5）。`clear_stale_watcher_sentinels` のガード構造も未変更のまま、ガードが偽を返すことで自動的に非実行になる。

## FR-3 / FR-4 の充足

既定構成でガードが偽を返すため `verify_watchers_armed` は呼ばれず、`WATCHER_READY_TIMEOUT` 由来の `sleep` は `mux_attach` までの経路から消える（FR-3）。`watcher_status` は初期値 0 のまま `exit "$watcher_status"` に到達し、既定構成の正常な起動は終了コード 0 になる（FR-4）。actas 構成ではガードが真を返し、従来どおり `verify_watchers_armed` の結果が `watcher_status` へ反映される。

## テスト（NFR-2 / NFR-3）

新規 `tests/integration/t294-team-up-watcher-applicability.test.ts`（7テスト）は既存シーム `TEAM_UP_LIB_ONLY=1` source で正本を読み込み、実チーム起動を行わない。検証内容:

1. 既定 monitor プロンプトで適用されない（FR-1、pre-fix 面では真だった箇所）
2. 出荷される `CLAUDE_MONITOR_PROMPT` が monitor 形であること（判定入力の実測固定）
3. actas プロンプトで適用される（FR-1、#1476 の前進経路）
4. actas プロンプトでも codex / herdr では適用されない（FR-1 非退行、3組合せ）
5. スキップ通知が stderr へちょうど1回、stdout へは0（FR-2、2回呼び出しで実測）
6. 適用される経路では通知が出ない（FR-2 非退行）
7. FR-5 の4関数が `declare -F` で存在し、2定数が `90` / `1` に解決される

既存 `t-team-up-watcher-arming.test.ts` は適用可否ケース（`:193-208`）へ `CLAUDE_MONITOR_PROMPT='/agmsg actas leader'` を設定して runtime/backend 軸の検証意図を保存した。NFR-2 の受け入れ基準が明示的に許容する形であり、他のテスト本体は未変更。

テスト番号 294 は `ls tests/` 系の実測で既存最大 293 を確認のうえ採番した。

## 落ちる実証（NFR-1、実測）

`git checkout 294df1281~1 -- packages/framework/core/tools/team-up.sh` で pre-fix 面を対象ファイル限定で再現（stash 不使用）:

```
5 pass / 2 fail  — exit 1
  ✗ default monitor-mode bootstrap prompt does not apply (FR-1)
  ✗ the skip is announced exactly once on stderr, never on stdout (FR-2)
```

`git checkout 294df1281 -- <path>` で復元後は 7 pass / 0 fail。注入面はテストが実際に読む正本ファイルである。

## 検証結果（すべて同期実行、exit code は実測値）

| コマンド | exit code |
| --- | --- |
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bash tests/run-tests.sh --ci` | 0（Test files 546 / Failed files 0 / Total assertions 7565 / Failed assertions 0、RESULT: PASS） |

## 逸脱

なし。`WATCHER_SKIP_ANNOUNCED` ラッチは FR-2 の「1行」要件を2つの呼び出し点の下で満たすための実装内判断であり、承認済み実装イメージの構造（前置条件 → `case` による actas 判別 → stderr 通知 → `return 1`）と参照 file:line を保存している。

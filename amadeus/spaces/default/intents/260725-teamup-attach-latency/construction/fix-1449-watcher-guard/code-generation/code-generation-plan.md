# Code Generation Plan — fix-1449-watcher-guard

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-attach-latency/inception/requirements-analysis/requirements.md`

- `requirements.md` — FR-1〜FR-6、NFR-1〜NFR-4 を実装対象として直接参照した。FR-1 の3つの受け入れ基準（既定構成で偽 / actas 形で真 / codex・herdr で従来どおり偽）をそのままテストケースへ写像し、FR-5 の存置対象4関数・2定数を保持アサーションの列挙元とした。NFR-3 の「`tests/integration/` 配下・番号重複なし」と NFR-4 の「`watcher_verification_applies` 以外の関数本体を変更しない」を変更面の境界とした。

測定 ref: 実装前 HEAD `ec624022ff65cc8b3912001f768bd66ec41a0e39`、修正コミット `294df1281`。file:line 引用はワークツリー実ファイル直読による。

## 方針

`watcher_verification_applies`（`packages/framework/core/tools/team-up.sh:1077-1079`）へ、agmsg `spawn.sh:565-568` と同型の適用可否ガードを追加する。既存の `[ "$RUNTIME" = "claude" ] && [ "$MSG_BACKEND" = "agmsg" ]` を前置条件として保持し、その上に「起動プロンプトが actas watcher を arm するか」の条件を重ねる。判定入力は `CLAUDE_MONITOR_PROMPT`（`:104`）で、`case` の `*" actas "*` パターンで判別する。

`verify_watchers_armed` / `ready_sentinel_path` / `resend_monitor_prompt` / `clear_stale_watcher_sentinels` と `WATCHER_READY_TIMEOUT` / `WATCHER_RESEND_MAX` は一切触らない（FR-5）。`clear_stale_watcher_sentinels` 呼び出しのガード構造（`:1438-1440`）も未変更のまま、ガードの返り値が偽になることで自動的に非実行になる。

## 変更面

| 面 | 内容 |
| --- | --- |
| 正本 | `packages/framework/core/tools/team-up.sh` — `watcher_verification_applies` とその直上コメントのみ |
| 配布物 | `dist/<harness>/` 6面（`bun scripts/package.ts` 再生成） |
| self-install | `.claude` / `.codex` / `.cursor` / `.opencode`（`bun run promote:self` 再生成） |
| 新規テスト | `tests/integration/t294-team-up-watcher-applicability.test.ts` |
| 既存テスト | `tests/integration/t-team-up-watcher-arming.test.ts` — 適用可否ケースへ actas プロンプトを設定（NFR-2 が明示的に許容する形） |

## 設計判断

### スキップ通知の一度きり化

FR-2 は stderr へ **1行**の出力を要求するが、`watcher_verification_applies` は launch 経路で2回呼ばれる（`:1438` の stale sentinel クリア前、`:1455` の検証前）。素朴に `echo` を置くと同一行が2行出力され FR-2 の受け入れ基準を満たさない。そこで関数スコープ内に `WATCHER_SKIP_ANNOUNCED` ラッチを置き、通知を run ごと1回に閉じる。返り値の意味論は呼び出し回数に依らず不変であり、NFR-4 の「`watcher_verification_applies` 以外の関数本体を変更しない」も維持する。

### 既存テストの適用可否ケース

`t-team-up-watcher-arming.test.ts:193-208` は `RUNTIME`/`MSG_BACKEND` の4組合せに対して claude+agmsg → 真を期待する。同テストの `runLib` は `CLAUDE_MONITOR_PROMPT` を上書きしないため、ガード追加後は既定の monitor プロンプトが解決され偽になる。NFR-2 の受け入れ基準が「actas プロンプトを設定するか、`verify_watchers_armed` を直接呼ぶ形で従来の検証意図を維持する」と明示しているため、当該ケースへ `CLAUDE_MONITOR_PROMPT='/agmsg actas leader'` を設定して runtime/backend 軸の検証意図を保存する。プロンプト軸は新規 t294 が独立に受け持つ。

## テスト設計（NFR-3）

新規テストは実 FS 上の `team-up.sh` を `TEAM_UP_LIB_ONLY=1` で source する既存シームを使い、実チーム起動は行わない。番号は `ls` 実測で既存最大 293 を確認のうえ 294 を採番した（`cid:code-generation:swarm-test-number-reservation`）。

## 落ちる実証（NFR-1）

修正コミット `294df1281` の後に `git checkout 294df1281~1 -- packages/framework/core/tools/team-up.sh` の対象ファイル限定切替で pre-fix 面を再現し、t294 が赤くなることを実測する。復元は `git checkout 294df1281 -- <path>`。stash は使わない（`cid:code-generation:falling-proof-no-stash`）。注入面はテストが実際に読む正本ファイルである（`cid:code-generation:injection-surface-verify`）。

## 検証コマンド

`bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` をすべて同期実行し exit code を記録する。

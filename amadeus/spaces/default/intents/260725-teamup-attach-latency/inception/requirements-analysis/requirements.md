# Requirements — team-up.sh 起動レイテンシの解消 (Issue #1449)

上流入力（consumes 全数）: `amadeus/spaces/default/codekb/amadeus/business-overview.md`、`amadeus/spaces/default/codekb/amadeus/architecture.md`、`amadeus/spaces/default/codekb/amadeus/code-structure.md`

- `architecture.md` — actas/monitor モード不一致の機序、launch シーケンス上の `verify_watchers_armed` の位置（`mux_attach` 直前の同期実行）、agmsg `spawn.sh` との構成要素対照表（生産側と適用可否ガードの未移植）を参照した。
- `code-structure.md` — repo 内（`packages/framework/core/tools/team-up.sh` 正本、`dist/<harness>/` 生成物、self-install ツリー）と repo 外（`~/.agents/skills/agmsg/`）の境界を参照し、変更面の範囲を確定した。
- `business-overview.md` — Team Mode が「利用者が複数エージェントへアタッチして作業を開始する」体験を提供することを確認し、受け入れ基準を「アタッチ可能になるまでの時間」に置く根拠とした。

測定 ref: すべての file:line と実測値は HEAD `ec624022ff65cc8b3912001f768bd66ec41a0e39` のワークツリー実ファイル直読、および repo 外 read-only の `~/.agents/skills/agmsg/`（読取 2026-07-25）による。

## 背景

`bash <harness-dir>/tools/team-up.sh` の起動が、ユーザーが実際にチームペインへアタッチできるまで約200秒かかる。実 launch 計測（2026-07-25、leader + engineer×2、隔離インスタンス `bench`、既定値 `WATCHER_READY_TIMEOUT=90` / `WATCHER_RESEND_MAX=1`）:

```
T+200.85s  team-up.sh EXIT (rc=1)
armed になったメンバー: 0 / 3
ERROR: agmsg watcher never armed for: leader engineer-1 engineer-2 (after 1 re-send(s))
```

原因は `verify_watchers_armed`（`team-up.sh:1151-1190`）が待つ ready sentinel を、この起動経路が**構造的に一切生成しない**ことにある。sentinel を書くのは actas モードの watcher（`agmsg/scripts/watch.sh:307`、ガード `:300` の `if [ -n "$ACTIVE_NAME" ]`）だけだが、`team-up.sh:104` の初期プロンプト `CLAUDE_MONITOR_PROMPT="/agmsg mode monitor"` が起動するのは monitor モードの watcher であり、`agmsg/scripts/delivery.sh:301` は `watch.sh` へ位置引数を3個しか渡さない（第4引数 `ACTIVE_NAME` は空）。

混入は `42c9341d8`（2026-07-23、PR #1391）。親 `70cc7c526` の時点では `mux_attach` 前にブロッキング待機は存在しない。

## スコープ

**本 intent は起動レイテンシの解消のみを扱う**（ユーザー裁定 2026-07-25）。

- 対象外（#1476 へ分離）: 初期プロンプトを `/agmsg actas <role>` へ移行して検証を本来の意図どおり機能させる根治策。
- 対象外（別 Issue へ分離、Q2 裁定 A）: `create_run` の `git worktree add` 並列化。

## 機能要件

### FR-1: monitor モード起動では watcher arming 検証を実行しない

`watcher_verification_applies()`（`team-up.sh:1077-1079`）に、**起動プロンプトが actas watcher を arm する場合のみ検証する**という条件を追加する。現行の `[ "$RUNTIME" = "claude" ] && [ "$MSG_BACKEND" = "agmsg" ]` は保持し、その上に条件を重ねる。

受け入れ基準:
- 既定構成（`RUNTIME=claude` / `MSG_BACKEND=agmsg` / `CLAUDE_MONITOR_PROMPT="/agmsg mode monitor"`）で `watcher_verification_applies` が偽を返す。
- `CLAUDE_MONITOR_PROMPT` が actas プロンプト形（`/agmsg actas <role>` 等、` actas ` を含む形）のとき真を返す。
- `RUNTIME=codex` または `MSG_BACKEND=herdr` では従来どおり偽を返す（既存挙動の非退行）。

根拠: agmsg `spawn.sh:565-568` と同型のパターン（readiness ハンドシェイクを持たない起動形態では待機自体をスキップする適用可否ガード）。

### FR-2: スキップ理由を stderr へ出力する（no-silent-success）

FR-1 でスキップする際、理由と参照 Issue を1行で stderr へ出す。無言スキップは禁止（`org.md` Forbidden の検証劇場と対）。

受け入れ基準:
- 既定構成での起動時、stderr に「monitor モードの watcher は readiness sentinel を書かないため arming 検証をスキップする」旨と `#1449` / `#1476` への参照を含む行が1行出力される。
- stdout の directive 契約（`cid:code-generation:stdout-directive-stderr-advisory`）を汚さない。出力先は stderr のみ。

### FR-3: 起動が watcher 検証でブロックされない

既定構成での `team-up.sh` の起動は、`verify_watchers_armed` に起因する待機をゼロにする。

受け入れ基準:
- `verify_watchers_armed` が既定構成で一度も呼ばれない。
- `mux_attach` までの経路に `WATCHER_READY_TIMEOUT` 由来の `sleep` が存在しない。

### FR-4: 終了コードの意味づけを保持する

既定構成では watcher 検証を実行しないため、検証由来の非ゼロ終了は発生しない。

受け入れ基準:
- 既定構成の正常な起動で終了コードが 0 になる（現行は 1）。
- actas プロンプト構成では従来どおり `watcher_status` が終了コードへ反映される（0 = 全員 armed、非ゼロ = 未 armed）。

### FR-5: 検証ロジック本体は保持する

`verify_watchers_armed` / `ready_sentinel_path` / `resend_monitor_prompt` / `clear_stale_watcher_sentinels` と関連定数（`WATCHER_READY_TIMEOUT` `:108`、`WATCHER_RESEND_MAX` `:114`）は削除しない。#1476 で初期プロンプトを actas へ移行した時点で、FR-1 のガードにより自動的に再有効化される。

受け入れ基準:
- 上記4関数と2定数が存置される。
- `clear_stale_watcher_sentinels` の呼び出しも `watcher_verification_applies` でガードされている現行構造（`team-up.sh:1438-1440`）を維持する（検証しないなら sentinel を消す必要もない — 対称性の保持）。

### FR-6: 配布物とセルフインストールツリーを同一変更で同期する

`packages/framework/core/tools/team-up.sh` を正本として編集し、`dist/<harness>/` 6面と self-install ツリーを再生成する。

受け入れ基準:
- `bun run dist:check` と `bun run promote:self:check` が通る。
- 正本と全配布コピーの `team-up.sh` が一致する。

## 非機能要件

### NFR-1: 落ちる実証（org.md Mandated）

FR-1 のガードについて、**修正前は赤・修正後は緑**になることを実測する。

受け入れ基準:
- 修正コミット後に `git checkout <fix-sha> -- <path>` の対象ファイル限定切替（`cid:code-generation:falling-proof-no-stash`、`cid:code-generation:falling-proof-injection-one-set`）で pre-fix 面を再現し、新規テストが赤くなることを実測する。stash は使わない。
- 注入面はテストが実際に読む面であること（`cid:code-generation:injection-surface-verify`）。

### NFR-2: 既存テストの非退行

`tests/integration/t-team-up-watcher-arming.test.ts`（268行）は agmsg をスタブし sentinel をテスト自身が書いている（`:42` パス関数スタブ、`:60` 再送時フェイク arming、`:87-91` 事前配置）。この構造自体の是正は #1476 の範囲だが、本変更で既存テストを壊さないこと。

受け入れ基準:
- 既存テストが `watcher_verification_applies` を経由する場合、actas プロンプトを設定するか、`verify_watchers_armed` を直接呼ぶ形で従来の検証意図を維持する。
- `bash tests/run-tests.sh --ci` が緑。

### NFR-3: テスト配置（Test Strategy Minimal）

新規テストは実 FS・プロセスを使うため integration 層へ置く（`cid:code-generation:fs-tests-integration-first`）。unit allowlist を増やさない。実チーム起動を伴う重いテストは追加しない（既存シーム `TEAM_UP_LIB_ONLY=1` source を使う）。

受け入れ基準:
- 新規テストは `tests/integration/` 配下。
- テスト番号は既存と重複しない（`cid:code-generation:swarm-test-number-reservation`）。

### NFR-4: 変更の最小性

`watcher_verification_applies` 以外の関数本体を変更しない。要求されていない後方互換レイヤー・移行シムを追加しない（`org.md` Forbidden）。

受け入れ基準:
- 正本 `team-up.sh` の diff が `watcher_verification_applies` とその直上コメント、および必要ならヘッダコメントに限定される。

## トレーサビリティ

| 要件 | 由来 |
| --- | --- |
| FR-1, FR-5 | Q1 裁定 A（ユーザー直接裁定 2026-07-25） |
| FR-2 | `org.md` Forbidden（検証劇場）、`spawn.sh:566` の stderr 出力パターン |
| FR-3, FR-4 | Issue #1449 の本文および実 launch 実測（200.85秒 / rc=1） |
| FR-6 | `project.md` Mandated（正本→dist→self-install の同一変更同期） |
| NFR-1 | `org.md` Mandated（落ちる実証） |
| NFR-2 | RE 成果物 `code-quality-assessment.md`（テストスタブによる検出不能性） |
| NFR-3 | `project.md` Testing Posture、Test Strategy Minimal |
| スコープ除外（worktree 並列化） | Q2 裁定 A（ユーザー直接裁定 2026-07-25） |
| スコープ除外（actas 移行） | Issue #1476（ユーザー承認のうえ分離起票） |

## 未解決事項

なし。Q1/Q2 ともユーザー直接裁定で確定済み。

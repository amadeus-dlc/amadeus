# Code Generation Plan — Bolt A / unit `fix-1906-audit-lock-mutex`

上流入力(consumes 全数): `amadeus/spaces/default/intents/260803-state-integrity/inception/requirements-analysis/requirements.md`(FR-1〜FR-4、FR-9、NFR-1〜NFR-5、制約、前提 A-1)。

**degraded input の記録**: 本スコープ `self-fix` は units-generation / application-design / functional-design / nfr-design / infrastructure-design を SKIP する。`consumes_absent` に `inception/units-generation/unit-of-work.md`(`expected: true`)が列挙されており、設計成果物は構造的に存在しない。したがって本計画は **requirements.md と brownfield codekb(`amadeus/spaces/default/codekb/amadeus/`)から直接スコープした**。欠落成果物の内容は捏造していない。同じ注記を `code-summary.md` へ引き継ぐ。

対象 Issue: [#1906](https://github.com/amadeus-dlc/amadeus/issues/1906)(P2 / S1-FATAL / origin:bootstrap)

## トレーサビリティ

user-stories は SKIP のため、各ステップは **FR** と **Issue #1906** へ遡らせる。

| Step | 遡及先 |
| --- | --- |
| 1 | NFR-1(TDD)/ NFR-2(決定的再現)— FR-1 の Red |
| 2 | FR-1 |
| 3 | FR-2 の Red |
| 4 | FR-2 |
| 5 | FR-1 受け入れ基準 第4項(既存テストの明示改訂) |
| 6 | FR-3 の Red |
| 7 | FR-3 |
| 8 | FR-4 |
| 9 | FR-9 |
| 10 | NFR-3(ブロッキングゲート全通過) |

## 実装環境

- **worktree 分離必須**(`cid:code-generation:solo-bolt-worktree-required`)。割当 worktree の外で git 状態を変更しない(checkout / stash / reset 禁止)。
- ベースブランチ `main`、マージターゲット `main`(org.md Way of Working)。
- 予約テスト番号: **t427**(`cid:code-generation:swarm-test-number-reservation` に従い事前予約。実測: 既存最大は t426)。
- 新規テストの層: 実 FS / プロセスを使うため **integration**(`cid:code-generation:fs-tests-integration-first`)。
- scratch は repo 外(`cid:requirements-analysis:scratch-script-discipline`)。

## 対象ファイルの目録(実測、HEAD `6c15af23a`)

**正本(編集する)**

| ファイル | 箇所 | 変更 |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-lib.ts` | `:6274-6282` | `liveOwnerMayBeReaped` を削除 |
| 〃 | `:6296-6300` | `else if (ownerAlive(owner))` 分岐から over-age 判定を除去し、生存 owner は常に `return false` |
| 〃 | `:6333-6335` | `AuditLockReapPolicy` 型を削除 |
| 〃 | `:6337-6356` | `finalizeAuditLockAcquire` から `reapPolicy` 引数と `:6345` の fail-open を削除 |
| 〃 | `:6203-6206` | `reapStaleLock` から `reapPolicy` 引数を削除 |
| 〃 | `:6284` | `reapStaleLockUnderMutex` から `reapPolicy` 引数を削除 |
| 〃 | `:6358-6390` | `acquireAuditLock` の第6引数 `reapPolicy` を削除 |
| 〃 | `:6139`、`:6158`、`:6162`、`:6297`、`:6323` | over-age steal を前提とするコメントを実態へ改訂 |
| `packages/framework/core/tools/amadeus-mirror-state-store.ts` | `:477-484` | `acquireAuditLock(identity, 0, 0)` へ(`"dead-owner-only"` 引数を削除) |
| 〃 | `:450-456` | 逐語「once the section has outlived the stale threshold, letting the reaper steal a live lock out from under it」が成立しなくなるため改訂 |
| `packages/framework/core/tools/amadeus-audit.ts` | `:429-433` | over-age 横取りを前提としない形へ改訂し、回収経路として doctor プローブを名指しする |

**維持する(削除対象と混同しない)**

- `packages/framework/core/tools/amadeus-lib.ts:6609-6650` `detectLeakedLocks` / `LeakedLock.reason` の `"over-age"`(`:6613`、`:6634-6635`)。これは **明示発動の診断・回収経路**であり FR-3 が名指しする wedge 回収手段。FR-1 の `dead-or-over-age` grep 0件は reap **方針トークン**が対象で、本箇所を含まない。
- `DEFAULT_LOCK_STALE_MS`(`:5945`)/ `lockStaleMs()`(`:5947-5953`)— doctor プローブが引き続き使う。
- `amadeus-lib.ts:3838` のコメント(別機構の閾値説明で本件と無関係)。

**テスト(改訂する)**

| ファイル | 行 | 改訂 |
| --- | --- | --- |
| `tests/unit/t161-per-intent-lock-reaper.test.ts` | `:180-189` | 「a live-but-OVER-AGE lock is reclaimed」→ 生存 over-age holder が**横取りされない**ことを assert する形へ反転 |
| 〃 | `:204-` | 「dead-owner-only policy never reclaims a live over-age holder」→ policy 引数の消失に合わせテスト名と呼び出しを一本化後の API へ |
| `tests/integration/t163-reaper-steal-race.test.ts` | `:133-137`、`:178` | `AMADEUS_LOCK_STALE_MS: "600000"` の回避が不要になる。前提コメントと env を実態へ |
| `tests/integration/t-reap-mutex.integration.test.ts` | `:51-52` | 同上 |

**テスト(不変を確認する)**

`tests/integration/t145-state-lock-concurrency.test.ts`、`tests/integration/t380-locked-canonical-emit.test.ts`、`tests/integration/t388-audit-merge-atomic-canonical.test.ts`。

**生成物(再生成する)**

`amadeus-lib.ts` / `amadeus-audit.ts` / `amadeus-mirror-state-store.ts` は各12コピー(dist 7 + self-install 5)を持つ。

## 実装ステップ

TDD 既定(team.md `cid:code-generation:tdd-default-with-narrow-exceptions`)。**各スライスで Red を実測してから最小実装で Green にする。** テストの一括先行・実装後のテスト追加は TDD 実施とみなさない。

- [ ] **Step 1 — FR-1 の Red**: `tests/integration/t427-audit-lock-live-owner-no-steal.integration.test.ts` を新設し、**失敗する1件**を書く。内容: 生存 holder が stamp を書いた状態で `AMADEUS_LOCK_STALE_MS` を極小にし、後続 acquire が横取り**しない**(= `false` を返す)ことを assert。現行実装では横取りが成功するため **Red になることを実測記録**する。
- [ ] **Step 2 — FR-1 の最小実装**: `liveOwnerMayBeReaped` を削除し、`reapStaleLockUnderMutex:6296-6300` の生存 owner 分岐を無条件 `return false` にする。`AuditLockReapPolicy` 型・`reapPolicy` 引数を `reapStaleLock` / `reapStaleLockUnderMutex` / `finalizeAuditLockAcquire` / `acquireAuditLock` から削除し、`amadeus-mirror-state-store.ts:477-484` の呼び出しを追随させる。Step 1 が Green になることを実測。**引数だけ残して常に同じ値を渡す形にはしない**(org.md Forbidden)。
- [ ] **Step 3 — FR-2 の Red**: t427 に**失敗する1件**を追加。`writeOwnerStamp` を失敗させた状態で `acquireAuditLock` が `false` を返し、ロックディレクトリが残置されないことを assert。注入は移植可能な形で行う(`cid:code-generation:bun-readfilesync-dir-platform-divergence` — macOS/Linux の実装差に依存しない手段を選ぶ)。Red を実測記録。
- [ ] **Step 4 — FR-2 の最小実装**: `finalizeAuditLockAcquire` から `:6345` の fail-open を削除する(Step 2 で `reapPolicy` を落とした結果として構造的に消える場合は、その旨を記録し Step 3 の Green を実測)。
- [ ] **Step 5 — 既存テスト契約の明示改訂**: 上表4箇所を改訂する。**改訂前の実行結果(赤/緑)と改訂後の結果を両方記録する**(FR-1 受け入れ基準)。`t145` / `t380` / `t388` が緑のままであることも実測して記録。
- [ ] **Step 6 — FR-3 の Red**: t427 に**失敗する2件**を追加。(a) 生存 over-age holder を `detectLeakedLocks` が `reason: "over-age"` として検出し clear=true で解放すること、(b) 「holder プロセス終了 → 死亡 owner reap → 後続 waiter が取得」の系列。(a) が Step 2 の変更で退行しないことの回帰、(b) が新規保証。Red/Green を実測記録。
- [ ] **Step 7 — FR-3 のコメント改訂**: `amadeus-audit.ts:429-433`(回収経路として doctor プローブを名指しする)、`amadeus-mirror-state-store.ts:450-456`、`amadeus-lib.ts` の `:6139` / `:6158` / `:6162` / `:6297` / `:6323`。**`packages/framework/core/` のコメントに `scripts/<file>` パストークンを書かない**(`cid:code-generation:c1-1569-shipped-comment-vocab` — 全 dist コピーで `t258-boundary-guard` が落ちる)。
- [ ] **Step 8 — FR-4(NSD001)**: 編集した catch に承認済み failure terminal を置く。編集していない catch には触れない。**`tests/no-silent-drop/baseline.json` への新規登録による grandfather 延命は行わない**(差分ゼロ、または削除のみ)。failure terminal が既存の回復挙動を壊すため infeasible な catch を発見したら、**実装を止めて conductor へ報告する**(`cid:code-generation:deviation-stop-before-implement`)。
- [ ] **Step 9 — FR-9 配布面の同期**: `bun scripts/package.ts`(dist 7ツリー)+ `bun run promote:self`(self-install 5ツリー)。**7ハーネス全て**を対象とする(`cid:build-and-test:bt-dist-regen-seven-harnesses` — 5ハーネスで止めると kiro/kiro-ide が DIFFERS)。
- [ ] **Step 10 — NFR-3 全ゲート**: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` / `bun tests/no-silent-drop-gate.ts check --base-revision <base>` / `bun tests/unchecked-cast-guard.ts --check` / coverage(project / patch / relative)/ complexity。**各コマンドを1つずつ直書きで実行し exit code を個別に読む**(`cid:code-generation:cg-no-shell-var-command-loop` — zsh は変数展開を単語分割しないため 127 の偽失敗になる)。パイプ越しに exit を読まない(`cid:code-generation:no-exit-capture-through-pipe`)。push 前にローカル lcov で diff 追加行の未カバー 0 を実測(`cid:code-generation:local-lcov-pre-push`)。

## 逸脱時の停止規律

- 要件・設計から外れる必要に気づいたら、**その場で逸脱を実装せず作業を止めて conductor へ報告する**(`cid:requirements-analysis:implementation-deviation-election`)。「既存様式への準拠と判断する場合も停止対象」(`cid:code-generation:deviation-applicability-not-solo`)。
- 検証は同期(フォアグラウンド)で完遂し、モニタ/バックグラウンド待ちでターンを終えない(`cid:code-generation:builder-prompt-sync-completion`)。

## テスト戦略

`amadeus-state.md` の Test Strategy = **Comprehensive**。ただし `cid:build-and-test:bt-proportional-selection` により、承認済み NFR と実在境界へ trace できる範囲のみ生成する。本 Bolt は並行性・相互排他が対象なので integration に集中し、performance / security の新規検査は生成しない(該当 NFR なし)。t427 は FR-1(1)+ FR-2(1)+ FR-3(2)= **4件**を予定する。

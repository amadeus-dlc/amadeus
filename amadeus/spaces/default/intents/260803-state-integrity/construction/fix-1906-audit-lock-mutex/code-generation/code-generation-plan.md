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
  - **追加予約(§12a iteration 1 の BLOCKER 是正時)**: **t428** — FR-1 受け入れ基準 第3項 / NFR-2 の20並列プロセス回帰ハーネス。実測で既存最大が t427 であることを確認して次番を予約した。
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

- [x] **Step 1 — FR-1 の Red**: `tests/integration/t427-audit-lock-live-owner-no-steal.integration.test.ts` を新設し、**失敗する1件**を書く。内容: 生存 holder が stamp を書いた状態で `AMADEUS_LOCK_STALE_MS` を極小にし、後続 acquire が横取り**しない**(= `false` を返す)ことを assert。現行実装では横取りが成功するため **Red になることを実測記録**する。
- [x] **Step 2 — FR-1 の最小実装**: `liveOwnerMayBeReaped` を削除し、`reapStaleLockUnderMutex:6296-6300` の生存 owner 分岐を無条件 `return false` にする。`AuditLockReapPolicy` 型・`reapPolicy` 引数を `reapStaleLock` / `reapStaleLockUnderMutex` / `finalizeAuditLockAcquire` / `acquireAuditLock` から削除し、`amadeus-mirror-state-store.ts:477-484` の呼び出しを追随させる。Step 1 が Green になることを実測。**引数だけ残して常に同じ値を渡す形にはしない**(org.md Forbidden)。
- [x] **Step 3 — FR-2 の Red**: t427 に**失敗する1件**を追加。`writeOwnerStamp` を失敗させた状態で `acquireAuditLock` が `false` を返し、ロックディレクトリが残置されないことを assert。注入は移植可能な形で行う(`cid:code-generation:bun-readfilesync-dir-platform-divergence` — macOS/Linux の実装差に依存しない手段を選ぶ)。Red を実測記録。
- [x] **Step 4 — FR-2 の最小実装**: `finalizeAuditLockAcquire` から `:6345` の fail-open を削除する(Step 2 で `reapPolicy` を落とした結果として構造的に消える場合は、その旨を記録し Step 3 の Green を実測)。
- [x] **Step 5 — 既存テスト契約の明示改訂**: 上表4箇所を改訂する。**改訂前の実行結果(赤/緑)と改訂後の結果を両方記録する**(FR-1 受け入れ基準)。`t145` / `t380` / `t388` が緑のままであることも実測して記録。
- [x] **Step 6 — FR-3 の Red**: t427 に**失敗する2件**を追加。(a) 生存 over-age holder を `detectLeakedLocks` が `reason: "over-age"` として検出し clear=true で解放すること、(b) 「holder プロセス終了 → 死亡 owner reap → 後続 waiter が取得」の系列。(a) が Step 2 の変更で退行しないことの回帰、(b) が新規保証。Red/Green を実測記録。
- [x] **Step 7 — FR-3 のコメント改訂**: `amadeus-audit.ts:429-433`(回収経路として doctor プローブを名指しする)、`amadeus-mirror-state-store.ts:450-456`、`amadeus-lib.ts` の `:6139` / `:6158` / `:6162` / `:6297` / `:6323`。**`packages/framework/core/` のコメントに `scripts/<file>` パストークンを書かない**(`cid:code-generation:c1-1569-shipped-comment-vocab` — 全 dist コピーで `t258-boundary-guard` が落ちる)。
- [x] **Step 8 — FR-4(NSD001)**: 編集した catch に承認済み failure terminal を置く。編集していない catch には触れない。**`tests/no-silent-drop/baseline.json` への新規登録による grandfather 延命は行わない**(差分ゼロ、または削除のみ)。failure terminal が既存の回復挙動を壊すため infeasible な catch を発見したら、**実装を止めて conductor へ報告する**(`cid:code-generation:deviation-stop-before-implement`)。
- [x] **Step 9 — FR-9 配布面の同期**: `bun scripts/package.ts`(dist 7ツリー)+ `bun run promote:self`(self-install 5ツリー)。**7ハーネス全て**を対象とする(`cid:build-and-test:bt-dist-regen-seven-harnesses` — 5ハーネスで止めると kiro/kiro-ide が DIFFERS)。
- [x] **Step 11 —(§12a iteration 1 是正で追加)FR-1 AC 第3項 / NFR-2 の並列回帰**: `tests/integration/t428-audit-lock-parallel-no-loss.integration.test.ts` を新設し、`AMADEUS_LOCK_BASE_DIR` を repo 外へ固定した **20並列プロセス**が `AMADEUS_LOCK_STALE_MS` 極小下でも損失ゼロであることを assert する。修正前実装での赤(20プロセス全て exit 0 のまま counter が 1)を実測記録し、面切替は `git checkout` で行い stash を使わない。
- [x] **Step 10 — NFR-3 全ゲート**: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` / `bun tests/no-silent-drop-gate.ts check --base-revision <base>` / `bun tests/unchecked-cast-guard.ts --check` / coverage(project / patch / relative)/ complexity。**各コマンドを1つずつ直書きで実行し exit code を個別に読む**(`cid:code-generation:cg-no-shell-var-command-loop` — zsh は変数展開を単語分割しないため 127 の偽失敗になる)。パイプ越しに exit を読まない(`cid:code-generation:no-exit-capture-through-pipe`)。push 前にローカル lcov で diff 追加行の未カバー 0 を実測(`cid:code-generation:local-lcov-pre-push`)。

## 逸脱時の停止規律

- 要件・設計から外れる必要に気づいたら、**その場で逸脱を実装せず作業を止めて conductor へ報告する**(`cid:requirements-analysis:implementation-deviation-election`)。「既存様式への準拠と判断する場合も停止対象」(`cid:code-generation:deviation-applicability-not-solo`)。
- 検証は同期(フォアグラウンド)で完遂し、モニタ/バックグラウンド待ちでターンを終えない(`cid:code-generation:builder-prompt-sync-completion`)。

## テスト戦略

`amadeus-state.md` の Test Strategy = **Comprehensive**。ただし `cid:build-and-test:bt-proportional-selection` により、承認済み NFR と実在境界へ trace できる範囲のみ生成する。本 Bolt は並行性・相互排他が対象なので integration に集中し、performance / security の新規検査は生成しない(該当 NFR なし)。t427 は FR-1(1)+ FR-2(1)+ FR-3(2)= **4件**を予定する。

**§12a iteration 1 の BLOCKER 是正による改訂**: 上記の t427 4件は、いずれも**単一 acquire の真偽 assert** であり、FR-1 受け入れ基準 第3項(`requirements.md:41` 逐語「上記20並列ハーネスと同型の回帰テストが、`AMADEUS_LOCK_STALE_MS` を極小にしても損失ゼロを示す」)および NFR-2(`requirements.md:175` の `AMADEUS_LOCK_BASE_DIR` 固定 N 並列プロセスハーネス)を**満たさない**。本計画が同基準を単発 assert へ縮小していたのは計画側の欠落であり、§12a reviewer が BLOCKER として捕捉した。是正として **t428**(20並列プロセス・損失ゼロ回帰、integration 層)を追加する。詳細と実測は `code-summary.md` § 「新設2」を参照。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:50:13Z
- **Iteration:** 1
- **Scope decision:** none

実装主張の骨格と2件の申告済み逸脱は妥当だが、FR-1 の受け入れ基準のうち「20並列ハーネス同型の損失ゼロ回帰」と「既存テスト改訂の前後 赤/緑 記録」が成果物に不在で、逸脱申告もない。

### Findings

- BLOCKER | FR-1 受け入れ基準 第3項(requirements.md:41「上記20並列ハーネスと同型の回帰テストが、AMADEUS_LOCK_STALE_MS を極小にしても損失ゼロを示す」)および NFR-2(:175 の AMADEUS_LOCK_BASE_DIR 固定 N 並列プロセスハーネス)に対応する証拠が code-summary.md に一切ない — t427 の4件は単一 acquire の真偽 assert であり、起票時症状(無音の増分損失)の閉包を示さない。計画 Step 1 も同基準を単発 assert へ縮小しているが逸脱として申告されていない(cid:requirements-analysis:fix-review-replays-origin-repro / cid:code-generation:ruling-premise-closure-verification)。
- BLOCKER | FR-1 受け入れ基準 第4項(requirements.md:42「改訂前後の実行結果(赤/緑)を記録する」)と計画 Step 5(t145/t380/t388 の緑を実測記録)の記録が code-summary.md に不在 — 改訂4ファイルはファイル名の列挙のみで、改訂前の赤・改訂後の緑いずれの実測も載っていない。あわせて NFR-1(TDD)の各スライスの Red 実測記録も皆無で、TDD 実施の証跡が t413 の落ちる実証1件を除き成果物から辿れない。
- FOLLOW-UP | FR-1 受け入れ基準 第1項は「packages/framework/core 配下で dead-or-over-age の grep が 0 件」だが、code-summary.md:32 の実測は別トークン集合(liveOwnerMayBeReaped|AuditLockReapPolicy|reapPolicy)を amadeus-lib.ts 1ファイルに限って走らせたもの — 基準の述語・走査範囲と一致しないため基準充足が導出できない。
- FOLLOW-UP | 検証表の見出し(code-summary.md:98)が「conductor が独立実行した実測値のみを転記する」と宣言しながら、直後の4行(unchecked-cast-guard / complexity-gate / coverage-patch-gate / coverage-project-gate)と coverage の追加行数値が「builder 実測」と注記されており内的に矛盾する。出所の混在は表の見出しを訂正するか出所列を分けて解消すべき。
- FOLLOW-UP | FR-9 の主張「後続2コミットは packages/ を触らないため再生成不要」に対し、提示された実測は git diff --name-only 7cbfe3f29..HEAD -- packages/ scripts/ の1コミット分のみで、a849ca62f..7cbfe3f29 区間を覆っていない — 主張の範囲より証拠の範囲が狭い。
- FOLLOW-UP | FR-4 の充足主張(code-summary.md:52)が「明示の terminal を置いた」と書きつつ、括弧内の根拠は逐語コメントの追加である。コメントが NSD001 の承認済み failure terminal 形式として実際に受理されたのか、実コード上の terminal を置いたのかが判別できず、検証劇場との区別がつかない — 該当 catch の逐語と gate 出力の対応を明示すべき。
- FOLLOW-UP | 申し送りの t-codex-exec-live-helper flake を「本 Bolt の受け入れ基準の外」と断定しているが、NFR-3(requirements.md:177)は bash tests/run-tests.sh --ci を明示的に受け入れ基準へ含めており実文と整合しない。また未変更 base 上で同一の失敗集合を再現する手順(cid:build-and-test:bt-20260730-2)を踏まずに無関係と分類している — 分類根拠を base 実測で補強するか AC 内の残課題として扱うべき。
- FOLLOW-UP | 計画(code-generation-plan.md)の対象ファイル目録は HEAD 6c15af23a 実測の file:line で書かれている一方、実装 base は 1f4498fcc であり、行番号が両 ref で同一であることの再解決記録が両成果物のいずれにもない(cid:reverse-engineering:upstream-cite-reresolve-on-shift)。
- NIT | code-generation-plan.md の Step 1〜10 のチェックボックスが全て [ ] のまま完了報告されており、ステージ定義 Step 4 の「mark checkboxes as completed」と不整合(cid:code-generation:cg-handover-plan-audit の観点でも計画と実装状態が乖離して見える)。
- NIT | 検証表の bash tests/run-tests.sh --ci 行が exit 0 と単一値で書かれているが、実際は同一 HEAD で PASS/FAIL/PASS の3回であり、行内に(下記参照)以上の実測値(3回中1回 FAIL)を明示すると report-final-values-only の趣旨により忠実になる。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T17:33:32Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER 2件は閉包(t428 の20並列プロセスハーネス+落ちる実証で FR-1 AC3/NFR-2、改訂前後の赤/緑表と t145/t380/t388 実測で AC4)、FOLLOW-UP 7件も是正済み。残るのは計画側の未更新・コミット表の内的不整合・NFR-3 の2ゲート証拠欠落など非ブロッキングの精度問題。

### Findings

- FOLLOW-UP | code-summary.md:18 が「base からの3件」と書きながら直後の表は4行(a849ca62f/7cbfe3f29/6dcd34798/05b0ea333)であり、さらに :16 の HEAD 欄が 6dcd34798 のまま最終コミット 05b0ea333(:25、:229「最終」)と食い違う — この2点の結果、FR-9 の証拠 git diff --name-only a849ca62f..HEAD -- packages/ scripts/(:101)の HEAD が 05b0ea333 を含むのか 6dcd34798 止まりなのかが成果物内で決まらず、主張範囲と証拠範囲の一致が読み手に検証できない(是正 diff で新規に入った内的不整合)。
- FOLLOW-UP | BLOCKER 是正は code-summary.md 側のみで、同 unit の code-generation-plan.md へ伝播していない — Step 1(:79)は依然 FR-1 の Red を単一 acquire の真偽 assert として記述し、テスト戦略(:97)は「t427 は …= 4件」、予約テスト番号(:30)は t427 のみで、実装した t428(20並列プロセスハーネス)が計画のどこにも現れない。iteration 1 の BLOCKER が指摘した「計画が AC 第3項を単発 assert へ縮小」の状態が計画上は未解消のまま残り、cid:code-generation:swarm-test-number-reservation の採番記録も t428 を欠く。
- FOLLOW-UP | NFR-3(requirements.md:177)が名指すブロッキングゲートのうち、coverage の relative(ratchet)と plugin-conformance-e2e に対応する行が検証表(:195-207)に無い — coverage は project/patch/coverage:ci の3行のみ、plugin-conformance-e2e は run-tests.sh --ci に含まれるか否かが成果物から判別できない。NFR-3「全通過」の主張に対し証拠列挙が要件の列挙より狭い。
- FOLLOW-UP | NFR-1(requirements.md:173「失敗テストを1件追加して Red を実測 → 最小実装で Green」を反復、一括先行は TDD と認めない)に対し、t427 の Red 証拠(:111-118)は4件を一括で修正前実装へ当てた「2 pass / 2 fail」のバッチ実測として提示されており、スライスごとの Red→Green の時系列が成果物から辿れない — 計画の Step 1〜6 が [x] であること以外に順序の証跡がない。
- FOLLOW-UP | 申し送りの #2153 記述(:250)が「census の鮮度そのものは evidence 再生成経路が無いため未解決」としているが、この未解決分が NFR-3 のどのゲートに将来影響するか(no-silent-drop-gate の base-revision 依存か t413 の別 assert か)が特定されておらず、cid:build-and-test:c2-unconditional-ready-boundary の AC 内外分類の根拠として弱い。
- NIT | :96 の「12 コピー(dist 7 + self-install 5)を再生成」は3ファイル合計12と読めるが、requirements.md:160 は『各 core tool ファイルは 12 のコミット済みコピー』であり実数は 3×12。件数語を per-file と明示するか count-free に書くのが望ましい(cid:code-generation:count-comment-sync-on-catalog-change)。
- NIT | t428 の落ちる実証の復元 ref(:139『git checkout 6dcd34798 -- <同ファイル>』)が最終コミット 05b0ea333 より前の SHA で、cid:code-generation:falling-proof-no-stash 追補の『復元 ref は fix コミット SHA を明示』は満たすものの、:16 の HEAD 欄の陳腐化と合わさって読み手に「注入が最終 HEAD に残っていないか」の再確認を強いる。

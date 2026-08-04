# Code Summary — Bolt A / unit `fix-1906-audit-lock-mutex`

上流入力(consumes 全数): `amadeus/spaces/default/intents/260803-state-integrity/inception/requirements-analysis/requirements.md` — FR-1(生存 owner を reap 対象外にする)、FR-2(stamp 書込失敗時の fail-closed)、FR-3(回収経路の保存)、FR-4(NSD001 の failure terminal)、FR-9(配布面の同期)、NFR-1(TDD)、NFR-3(ブロッキングゲート全通過)、NFR-5(新設テストの層配置)を本 summary の各節が参照する。

**degraded input の記録**: 本スコープ `self-fix` は units-generation / application-design / functional-design / nfr-design / infrastructure-design を SKIP する。directive の `consumes_absent` に `inception/units-generation/unit-of-work.md` が `expected: true` で列挙されており、設計成果物は構造的に存在しない。本 summary は `requirements.md` と同 unit の `code-generation-plan.md`、および実装ブランチの実測から構成した。欠落成果物の内容は捏造していない。

対象 Issue: [#1906](https://github.com/amadeus-dlc/amadeus/issues/1906)(P2 / S1-FATAL / origin:bootstrap)

## 実装ブランチ

| 項目 | 値 |
| --- | --- |
| worktree | `.claude/worktrees/agent-a429e5a9ade2936e4` |
| ブランチ | `worktree-agent-a429e5a9ade2936e4` |
| base | `1f4498fcc7f36ea8d400cf290928be54bd3b980b` |
| HEAD(最終) | `05b0ea333` |

コミット列(base からの4件。以降この summary で `HEAD` と書くときは `05b0ea333` を指す):

| SHA | 件名 | 対応 |
| --- | --- | --- |
| `a849ca62f` | `fix(lock): never reap a live audit-lock owner` | FR-1 / FR-2 / FR-3 / FR-4 / FR-9 |
| `7cbfe3f29` | `test(no-silent-drop): rebind the shrink-only ledger after the audit-lock fix` | FR-4 の台帳面(裁定により追加) |
| `6dcd34798` | `test(no-silent-drop): scope the evidence freshness pin to the gate implementation` | 裁定により追加(Refs #2153) |
| `05b0ea333` | `test(lock): close the 20-process lost-update symptom from #1906` | FR-1 受け入れ基準 第3項 / NFR-2(§12a iteration 1 の BLOCKER 是正) |

## 計画の引用 ref の再解決(`cid:reverse-engineering:upstream-cite-reresolve-on-shift`)

`code-generation-plan.md` の対象ファイル目録は HEAD `6c15af23a` 実測の file:line で書かれている一方、実装 base は `1f4498fcc` である。両 ref で行番号が同一であることを実測した:

```
$ git diff --name-only 6c15af23a 1f4498fcc -- packages/framework/core/tools/amadeus-lib.ts \
    packages/framework/core/tools/amadeus-audit.ts packages/framework/core/tools/amadeus-mirror-state-store.ts
(出力 0 行 — 3ファイルとも両 ref で同一)

$ git show 6c15af23a:packages/framework/core/tools/amadeus-lib.ts | sed -n '6274p;6337p'
function liveOwnerMayBeReaped(
function finalizeAuditLockAcquire(
$ git show 1f4498fcc:packages/framework/core/tools/amadeus-lib.ts | sed -n '6274p;6337p'
function liveOwnerMayBeReaped(
function finalizeAuditLockAcquire(
```

計画の引用は再解決不要であり、シフトは生じていない。

## 実装内容

### FR-1 — 生存 owner の横取り封鎖

`packages/framework/core/tools/amadeus-lib.ts` から `liveOwnerMayBeReaped` を削除し、`reapStaleLockUnderMutex` の生存 owner 分岐を無条件 `return false` にした。あわせて `AuditLockReapPolicy` 型と `reapPolicy` 引数を `reapStaleLock` / `reapStaleLockUnderMutex` / `finalizeAuditLockAcquire` / `acquireAuditLock` から削除し、`amadeus-mirror-state-store.ts` の呼び出しを追随させた。**引数だけ残して常に同じ値を渡す形は採っていない**(org.md Forbidden)。

受け入れ基準 第1項の述語そのものの実測(conductor):

```
$ grep -rn "dead-or-over-age" packages/framework/core
exit=1   一致 0 件
```

対照: base `1f4498fcc` では 4 箇所(`amadeus-lib.ts:6279, :6334, :6345, :6364`)。

補助実測(conductor): `grep -n "liveOwnerMayBeReaped\|AuditLockReapPolicy\|reapPolicy" packages/framework/core/tools/amadeus-lib.ts` が 0 hit。こちらは基準の述語ではなく、削除の網羅性を見る補助である。

### FR-2 — stamp 書込失敗時の fail-closed

`finalizeAuditLockAcquire`(`amadeus-lib.ts:6331-6350`)を、stamp を書けなければ獲得失敗を返す形へ改めた。逐語:

```
  // Every acquire requires a live PID stamp and fails closed before entering its
  // critical section (#1906). An unstamped section is invisible to every
  // liveness check, so a waiter walks in behind it; the acquire that cannot
  // prove ownership must not report success.
  if (writeOwnerStamp(lockDir, key)) return true;
```

### FR-3 — 回収経路の保存

死亡 owner の reap は維持し、クラッシュした holder が待機者を wedge しないことを保った。生存かつ over-age で wedge した holder は `detectLeakedLocks`(`/amadeus --doctor` プローブ)が引き続き報告・解放する。

### FR-4 — NSD001 の failure terminal と台帳

編集した catch に**実行文の terminal** を置いた。コメント追加のみではない。

- 実装: `acquireAuditLock` の catch arm 末尾に `continue;` を置いた。直前の逐語コメント: `// Explicit retry terminal (NSD001): this arm never swallows a failure — it hands control back to the loop, whose exhausted budget returns the loud `false` every caller checks.`
- ゲート側の受理規則: `tests/no-silent-drop/ast-scan.ts:205` の `statementTerminates` が `if (ts.isBreakStatement(statement) || ts.isContinueStatement(statement)) return true;`。NSD001 は同 `:825` の `ts.isCatchClause(node) && !blockTerminates(node.block, checker)` で発火するため、`continue` により発火しない。
- ゲート出力の対応: 当該 NSD001 finding `b775faf8…`(`amadeus-lib.ts`)が census から消え、母集団が 217 → 216 になった。

FR-2 の fail-open catch 除去により no-silent-drop の census 母集団が **217 → 216** に縮小したため、台帳を再バインドした:

- `tests/no-silent-drop/baseline.json` — 216 エントリ(**shrink-only、追加ゼロ**)。消えた1件は `b775faf8…`(NSD001 / `finalizeAuditLockAcquire` の fail-open catch)= FR-2 が除去した当のコード。
- `tests/no-silent-drop/approval.json` / `exemptions.json` — `previousDigest` を base のバイト列へ再バインド。

実測(conductor): `baseline.json` の `previousDigest` = `4e8999f9acbb670f47e0…` は `git show 1f4498fcc:tests/no-silent-drop/baseline.json | shasum -a 256` の出力と一致。

### FR-9 — 配布面の同期

`amadeus-lib.ts` / `amadeus-audit.ts` / `amadeus-mirror-state-store.ts` を `bun scripts/package.ts` と `bun run promote:self` で再生成した。`requirements.md:160` のとおり **core tool ファイル1本につき 12 コピー**(dist 7 + self-install 5)なので、3ファイルで計36コピーが対象になる。

後続3コミット(`7cbfe3f29` / `6dcd34798` / `05b0ea333`)は正本を触らないため再生成不要。証拠は主張と同じ区間で測る:

```
$ git diff --name-only a849ca62f..HEAD -- packages/ scripts/
exit=0   出力 0 行
```

## 新設・改訂したテスト(NFR-1 / NFR-2 / NFR-5)

いずれも実 FS / プロセスを使うため **integration 層**に置いた(NFR-5)。

### 新設1: `tests/integration/t427-audit-lock-live-owner-no-steal.integration.test.ts`

| テスト | 対応 | 修正前実装での結果 |
| --- | --- | --- |
| `FR-1: a LIVE over-age holder is never reclaimed, at any staleness threshold` | FR-1 | **Red**(`Expected: false / Received: true`) |
| `FR-2: an acquire whose owner stamp cannot be written fails CLOSED` | FR-2 | **Red**(`Expected: false / Received: true`) |
| `FR-3a: a wedged LIVE over-age holder is still reported and cleared by the doctor probe` | FR-3 | Green(存続ピン) |
| `FR-3b: a crashed holder's lock is still reaped, so the next waiter gets in` | FR-3 | Green(存続ピン) |

修正前実装での実測は **2 pass / 2 fail**。FR-3a / FR-3b は「修正によって失われてはならない既存保証」を固定する存続ピンであり、修正前から緑であることが正しい。4件すべてが Red になる設計ではない。

**NFR-1(TDD)の証跡の限界を明示する**: 上の Red 実測は、修正前実装に対して t427 の4件を**一括で当てたバッチ実測**である。`requirements.md:173` が求める「1件ずつ Red → 最小実装で Green」のスライス単位の時系列そのものは、計画 Step 1〜6 のチェック順以外に成果物から辿れる形で残していない。TDD の意図(実装より先に失敗テストを置く)には沿って進めたが、**スライス単位の Red→Green の時系列証跡は不完全**である。

### 新設2: `tests/integration/t428-audit-lock-parallel-no-loss.integration.test.ts`(FR-1 受け入れ基準 第3項 / NFR-2)

- テスト名: `FR-1: 20 parallel processes each land their increment with AMADEUS_LOCK_STALE_MS=1`
- **N = 20**(#1906 起票時と同数)、`AMADEUS_LOCK_BASE_DIR` を repo 外 `mkdtemp` へ固定、20個の実 OS プロセスが対象モジュールを直接 import する(NFR-2 が名指すハーネス形式)
- 実行時間 **4.34s**、timeout 120s 明示
- assert: 全プロセス exit 0 かつ `OK` 出力 / counter == 20 / journal 20行 / 各 worker の観測前値が `0..19` の相異なる集合(相互排他違反が「重複観測」として現れる)
- **決定性**(NFR-2): 確率的再現に依存しない。pre-fix steal の唯一の前提は「臨界区間 > `lockStaleMs()`」であり両辺とも注入可能なため、`AMADEUS_LOCK_STALE_MS=1` × `HOLD_MS=120` で全 waiter が初回 reap で over-age と判定し、損失が強制される。

**落ちる実証**(修正前実装 = `1f4498fcc` 時点の `amadeus-lib.ts` を、テストが実際に読む dist 面と正本の両方へ `git checkout` で切替。stash 不使用):

```
132 |       expect(count).toBe(WORKERS);
error: expect(received).toBe(expected)
Expected: 20
Received: 1
(fail) t428 ... FR-1: 20 parallel processes each land their increment ...
 0 pass / 1 fail
```

exit code と `OK` 判定の assert は**両方通過**している — 20プロセス全てが exit 0 で `OK` を出したまま19増分が無音消失しており、#1906 の起票時症状そのものを再現している(`cid:requirements-analysis:fix-review-replays-origin-repro`)。復元は `git checkout 6dcd34798 -- <同ファイル>` で完了し、`AuditLockReapPolicy` の grep が両ファイルとも 0 であることを確認済み。切替は HEAD に乗せていない。

### 改訂したテストの前後(FR-1 受け入れ基準 第4項)

| ファイル | 改訂前テスト × 修正後実装 | 改訂後テスト × 修正後実装 | 改訂後テスト × 修正前実装 |
| --- | --- | --- | --- |
| `tests/unit/t161-per-intent-lock-reaper.test.ts` | **17 pass / 1 fail** | 18 pass / 0 fail | 15 pass / 3 fail |
| `tests/integration/t163-reaper-steal-race.test.ts` | 2 pass / 0 fail | 2 pass / 0 fail | **0 pass / 2 fail** |
| `tests/integration/t-reap-mutex.integration.test.ts` | 5 pass / 0 fail | 5 pass / 0 fail | 5 pass / 0 fail |
| `tests/integration/t413-no-silent-drop-ci-adoption.test.ts` | **8 pass / 2 fail** | 10 pass / 0 fail | — |

t161 の改訂前の赤の実文:

```
179 |   test("a live-but-OVER-AGE lock is reclaimed", () => {
184 |       expect(acquireAuditLock(PD, 0, 1, INTENT, "default")).toBe(true);
Expected: true
Received: false
```

**正直な補足**: `t163` と `t-reap-mutex` は改訂前後どちらも緑である。これらの改訂は基準の緩和ではなく**閾値の強化**(`AMADEUS_LOCK_STALE_MS: "600000"` → `"1"`)であり、旧版は無害な閾値だったため修正後実装でも落ちない。強化が実効であることは第4列(改訂後 × 修正前)で示した — `t163` は 0 pass / 2 fail に転じる。`t-reap-mutex` だけは強化後も修正前実装で赤にならないが、これは同テストが固定する reap mutex 自体の不変条件が本修正と独立だからである。赤を作るためのテスト改変は行っていない。

### 不変を確認したテスト(計画 Step 5)

| ファイル | 結果 |
| --- | --- |
| `tests/integration/t145-state-lock-concurrency.test.ts` | 7 pass / 0 fail |
| `tests/integration/t380-locked-canonical-emit.test.ts` | 8 pass / 0 fail |
| `tests/integration/t388-audit-merge-atomic-canonical.test.ts` | 2 pass / 0 fail |

### coverage registry

`tests/gen-coverage-registry.ts` を再生成し、t428 の2エントリ追加を `05b0ea333` に含めた(`cid:code-generation:integration-registry-regen`)。

## 裁定を要した逸脱(2件・いずれもユーザー承認済み)

### 1. NSD 台帳の再生成と t413 ピンの改訂

計画 Step 8 は台帳を「差分ゼロ、または削除のみ」としていたが、census 縮小により `previousDigest` がベースに接地しなくなり、`t413:110-114` が 217 / removed 10 を逐語ピンしていた。`cid:code-generation:deviation-stop-before-implement` に従い実装前に停止し裁定を仰いだ。

**ユーザー裁定(2026-08-04 承認)**: 「台帳を再生成し、t413 のピンを明示改訂して同一 PR に含める」。実装の後退(catch を戻して census を 217 に保つ)は採らない。

改訂値: `counts` `{217,217,217}` → `{216,216,216}`、`baseline.entries` 217 → 216、`removed` 10 → 11(issue 集合 `{#1874,#1878,#1979}` は不変 — `b775faf8` は既に `#1979`)。`b775faf8` が `removed` に含まれることの assertion を1行追加した。

### 2. t413 の evidence 鮮度ピンの限定

`t413:167-174` は `adoption-evidence.json.currentRevision`(`7c29e33f7`)から HEAD までに `packages/framework/core/tools` の差分が無いことを要求していた。この path spec には **census の被検査対象そのもの**が含まれるため、`core/tools` を触るあらゆる変更で構造的に赤になる。閉じるには evidence bundle 23 receipt の再 adoption が必要だが、生成ツールが存在せず、台帳再生成後は `baseline-proof` receipt が構造的に再現しない(実測 exit 2 / `bootstrap.candidate exact-bytes digest mismatch`)。builder が実装前停止し裁定を仰いだ。

**ユーザー裁定(2026-08-04 承認)**: path spec をゲート実装面(`:(glob)tests/no-silent-drop/**/*.ts`)へ限定する。潜在欠陥として [#2153](https://github.com/amadeus-dlc/amadeus/issues/2153) を起票し、テストのコメントから参照させた。

限定が assertion を空文化していないことは、`tests/no-silent-drop/ledger.ts` へのコメント1行注入をコミットして赤(`Received: "tests/no-silent-drop/ledger.ts"`)を実測し、`git reset --hard 6dcd34798` で revert 後に 10 pass / 0 fail の回復と残渣ゼロ(`git diff --stat 7cbfe3f29..HEAD -- tests/no-silent-drop/` が空)を確認して実証した。注入は HEAD に残していない。

## 検証結果(NFR-3)

実出力からの転記のみ。**出所を列で分ける**(conductor = 本 record の書き手が独立実行、builder = 実装者が実行し報告)。

| コマンド | exit code | 出所 |
| --- | --- | --- |
| `bun run typecheck` | **0** | conductor / builder(両者一致) |
| `bun run lint` | **0** | conductor / builder(両者一致) |
| `bun run dist:check` | **0** | conductor |
| `bun run promote:self:check` | **0** | conductor |
| `bun tests/no-silent-drop-gate.ts check --base-revision 1f4498fcc7f36ea8d400cf290928be54bd3b980b` | **0**(`NO_SILENT_DROP_OK`) | conductor / builder(両者一致) |
| `bash tests/run-tests.sh --ci` | **0**(`RESULT: PASS` / Failed files 0)| conductor / builder(両者一致) |
| `bun run coverage:ci` | **0**(`RESULT: PASS`) | builder(単独所有で実行) |
| `bun tests/coverage-patch-gate.ts --check` | **0**(added 9 / covered 9 / **uncovered 0**) | builder |
| `bun tests/coverage-project-gate.ts --check` | **0**(90.7792%) | builder |
| `bun tests/unchecked-cast-guard.ts --check` | **0**(0 new casts / 36 remaining) | builder |
| `bun tests/complexity-gate.ts --check` | **0** | builder |
| `bun tests/gen-coverage-registry.ts --check`(coverage relative ratchet)| **0**(`coverage registry: OK (fresh, guards green, ratchet held)`)| conductor |
| `bun test tests/e2e/t341-plugin-conformance-journey.serial.test.ts`(plugin-conformance-e2e。`.github/workflows/ci.yml:240` が名指す実体)| **0**(3 pass / 0 fail)| conductor |

coverage は同一 worktree の単独所有者として直列実行した(`cid:code-generation:c1-coverage-single-owner`、NFR-2 の後段要求)。

対象テストファイル単位の実測(conductor):

| ファイル | 結果 |
| --- | --- |
| `t427-audit-lock-live-owner-no-steal.integration.test.ts` | 4 pass / 0 fail |
| `t428-audit-lock-parallel-no-loss.integration.test.ts` | 1 pass / 0 fail |
| `t413-no-silent-drop-ci-adoption.test.ts` | 10 pass / 0 fail |
| `no-silent-drop-repository-adoption.test.ts` + `no-silent-drop-gate.test.ts` | 73 pass / 0 fail |

### `bash tests/run-tests.sh --ci` の全実測(NFR-3)

conductor が同一ブランチに対して実行した全回を隠さず載せる。

| 実行 | 対象 HEAD | 結果 |
| --- | --- | --- |
| 1 | `6dcd34798` | `RESULT: PASS` / Failed files 0 |
| 2 | `6dcd34798` | `RESULT: FAIL` / Failed files 1・Failed assertions 1(下記申し送り) |
| 3 | `6dcd34798` | `RESULT: PASS` / Failed files 0 |
| 4 | `05b0ea333`(最終) | `RESULT: PASS` / Failed files 0 |

最終 HEAD `05b0ea333` に対する実測は PASS である。実行2の1件は下記の申し送りで扱う。

## 申し送り(未閉包の観測)

### `t-codex-exec-live-helper` の間欠赤(NFR-3 の範囲内・未閉包)

4回中1回の FAIL は `tests/integration/t-codex-exec-live-helper.test.ts` の `canonical project setup rolls back copied auth and distribution when trust fails`(`Expected: false / Received: true` — ロールバック後に scratch root が残存)。

**NFR-3(`requirements.md:177`)は `bash tests/run-tests.sh --ci` を明示的に受け入れ基準へ含めているため、本件を「受け入れ基準の外」とは分類しない。** 最終 HEAD での実測は PASS だが、間欠赤が観測されている以上 NFR-3 の充足は**決定的ではない**。

現時点で判明している事実のみ記す:

- 単独実行は 2/2 緑。
- 当該テストと helper(`tests/harness/codex-exec-live.ts`)は base から未変更(`git diff --name-only 1f4498fcc..HEAD -- tests/harness/ tests/integration/t-codex-exec-live-helper.test.ts` が 0 件)。
- helper は `node:child_process` / `node:fs` / `node:os` / `node:path` のみを import し、`amadeus-lib` にも監査ロックにも触れない — 本 Bolt の変更面と静的に非交差。
- **未実施**: `cid:build-and-test:bt-20260730-2` が要求する「未改変 base 上での同一失敗集合の再現」は行っていない。間欠率が低く(1/4)、決定的な帰属には base 側でも複数回のフルスイート実行を要するため、本ステージでは実施していない。したがって「本 Bolt と無関係」は**静的な非交差に基づく強い推定であって、実測による確定ではない**。

[#2154](https://github.com/amadeus-dlc/amadeus/issues/2154)(P2 / S3-MAJOR)として起票し、機序「未特定」と明記した。本 Bolt の verdict は、この1点を**未閉包として明示したうえでの条件付き**として扱う(`cid:build-and-test:verdict-names-unverified-facets`)。

### `#2153` の未解決分が将来どのゲートに効くか

本 Bolt で閉じたのは `t413` の evidence 鮮度 assertion の over-broad な path spec のみ。残る未解決分は「`adoption-evidence.json` に記録された census が、変化したコーパスに対して古くなっていく」ことであり、影響先を特定すると:

- **`bun tests/no-silent-drop-gate.ts check --base-revision <base>`**: 影響しない。この経路は `baseline.json` / `exemptions.json` の `previousDigest` を base のバイト列と突き合わせるだけで、`adoption-evidence.json` を読まない(本 Bolt でも台帳の再バインドのみで通過した)。
- **`t413` の残りの assert**: `validateEvidenceRegistry(registry, registry.currentRevision)` と `currentRevision` の到達可能性・祖先性は引き続き効く。`currentRevision` は据え置いたため現状は緑だが、**evidence bundle の再生成経路が存在しない**ため、将来 registry 自体の改訂が必要になった時点で再び詰まる。
- 上記以外の NFR-3 のゲートには依存が無い。

したがって未解決分は「現行 AC を今は満たすが、evidence 再生成が必要になった時点で `t413` を再び塞ぐ」性質の負債である。`#2153` で追跡する。

## 着地状況(2026-08-04 追記)

| 項目 | 状態 |
| --- | --- |
| PR | [#2155](https://github.com/amadeus-dlc/amadeus/pull/2155)(base `main`、`mergeable: MERGEABLE`、`mergeStateStatus: BLOCKED`) |
| レビュースレッド | 2件とも実測反証のうえ返信・resolve 済み(未解決 0件) |
| CI | 赤4件(`CI Success` / `Coverage Report` / `Coverage Report (head)` / `Tests`)。**すべて main 由来** — `origin/main` の run `30837153546` と失敗ジョブ集合がバイト同一で、失敗テストは `t413` の1件のみ |
| ブロッカー | [#2156](https://github.com/amadeus-dlc/amadeus/issues/2156)(P0 / S1-FATAL)。intent `260804-evidence-revision-rebind` で対応中 |
| ステージ | ゲートはユーザー承認済み。engine の `workspace_requires` が実装の本線面を要求するため、PR 着地まで `report --result approved` は通らない |

**着地順の依存**: #2156 の止血 PR(NSD 台帳の再バインドのみ、JSON 3ファイル)を先に着地させると main が緑に戻り、本 PR の CI も緑になる。ただし止血 PR は本 PR が持つ NSD 台帳(`9458bbda8` 接地)と競合するため、着地後に機械的な再バインドで再接地する必要がある。

**Bolt B(#1875 / FR-5〜FR-8)は未着手。** 本 unit は Bolt A のみを対象とする。

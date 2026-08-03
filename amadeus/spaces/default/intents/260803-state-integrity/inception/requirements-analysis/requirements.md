# Requirements — 260803-state-integrity

上流入力(consumes 全数): `business-overview.md`、`architecture.md`、`code-structure.md`(いずれも `amadeus/spaces/default/codekb/amadeus/`)。あわせて本 intent の差分スキャン記録 `re-scans/260803-state-integrity.md`、Issue [#1906](https://github.com/amadeus-dlc/amadeus/issues/1906) / [#1875](https://github.com/amadeus-dlc/amadeus/issues/1875) の本文とクロスレビュー verdict、および裁定を固定した `requirements-analysis-questions.md` を入力とする。

各上流入力の使用箇所:

- `business-overview.md` § 「state integrity の業務境界(260803-state-integrity、現在)」 — §「意図の分析」の利用者影響と出荷境界を導いた。
- `architecture.md` § 「state integrity(audit lock 相互排他と `Completed` 定義)の対象機構」(とくに §「相互排他破れの構造 — 2 つの steal 分岐」、§「heartbeat 不在」、§「`Completed` の三定義」) — FR-1〜FR-3 および FR-5 の機構前提を導いた。
- `code-structure.md` § 「state integrity の患部配置」(とくに §「ロック機構の配置」、§「`Completed` の書き手と読み手の配置」、§「テストによる pin の配置」、§「生成面 — 各 core tool ファイルは 12 コピーを持つ」) — 変更面の目録、テスト契約の所在、FR-9 の配布面義務を導いた。

## 測定 ref

本文の全 file:line は **`6c15af23af32c89ca2ab18738cbb01b849da634b`(worktree HEAD)** で実読検証した。

`re-scans/260803-state-integrity.md` は observed を `498c3034a` と記録しており、9 共有 codekb 成果物の記録 ref(`6c15af23a`)と 7 コミット分ずれている。本 intent はこの差を次のとおり解消して引用を確定した — 患部5ファイル(`amadeus-lib.ts`、`amadeus-state.ts`、`amadeus-jump.ts`、`amadeus-utility.ts`、`amadeus-audit.ts`)に対する `git log --oneline 498c3034a..HEAD -- <file>` はすべて **0 コミット**(exit 0)であり、両 ref で行番号は同一である。したがって `cid:reverse-engineering:upstream-cite-reresolve-on-shift` の再解決は不要だが、記録面の ref 不整合そのものは §「未決事項」に残す。

## 意図の分析

達成したいのは「state ファイルへの並行書込が無音で増分を失わない」ことと「進捗カウンタが経路によらず1つの値を指す」ことの2点である。機能追加ではなく、`business-overview.md` の記す既存の業務境界(ワークフロー状態と監査ジャーナルの整合)を回復する `self-fix` である。

利用者から見た症状は次のとおり。

- **#1906(P2 / S1-FATAL / origin:bootstrap)**: 同一の mkdir ベース監査ロックが監査ジャーナルの append と state 遷移の両方を守っている。相互排他が破れると、全プロセスが `exit 0` を返したまま state の増分と監査行が失われる。失敗が可視化されないため、利用者は壊れたことに気づけない。
- **#1875(P3 / S4-MINOR / origin:bootstrap)**: `Completed` の値が経路依存で往復する。誤値は append-only の監査イベント(`amadeus-state.ts:605` / `:619` / `:2143`、`amadeus-jump.ts:132`)と CLI JSON(`completed_count`)へ恒久記録される。`architecture.md` § 「`Completed` の三定義」の記すとおり、値そのものはゲート分岐の入力ではないが、`amadeus-state.ts:3377` の fail-closed 検証が読んでいる。

2つは独立した欠陥だが、`code-structure.md` § 「2 パッチのソース衝突面」の示すとおり同じファイル群の上に乗るため、1 intent の中で順序を制御して着地させる。

## 機能要件

### #1906 — 監査ロックの相互排他(Bolt A)

**FR-1. reap 方針を `dead-owner-only` へ一本化する。**

`liveOwnerMayBeReaped`(`amadeus-lib.ts:6274-6282`、逐語 `reapPolicy === "dead-or-over-age" && lockAcquireEpochMs() - owner.startedAtMs > lockStaleMs()`)による**生存 PID の横取りを撤廃する**。実測では `AMADEUS_LOCK_STALE_MS=1` + hold 20ms の20並列で 6/6 run が無音損失(FINAL=4,4,5,6,6,5、全プロセス exit 0)を起こした。`architecture.md` § 「相互排他破れの構造」の記すとおり、CAS 後の検証 `stampMatches(dead, owner)` は生存 holder が stamp を更新しないため必ず通過し、守るべきケースに対して構造的に不活性である。

`AuditLockReapPolicy` は現在 `dead-or-over-age`(既定、`amadeus-lib.ts:6364`)と `dead-owner-only`(唯一の明示指定は `amadeus-mirror-state-store.ts:483`)の2値をとる。一本化により型・パラメータ・分岐が不要になるため、**org.md Forbidden(要求されていない後方互換レイヤーを追加しない)に従い `dead-or-over-age` の分岐と `liveOwnerMayBeReaped` を削除する** — 引数だけ残して常に同じ値を渡す形にはしない。

受け入れ基準:
- `packages/framework/core` 配下で `dead-or-over-age` の grep が 0 件。
- 死亡 PID の reap は維持される(`ownerAlive(owner)` が偽なら従来どおり steal へ落ちる)— クラッシュ後の自動回復を失わないことをテストで固定する。
- 上記20並列ハーネスと同型の回帰テストが、`AMADEUS_LOCK_STALE_MS` を極小にしても損失ゼロを示す。
- **現行の over-age steal 意味論をピン留めしている既存テストを明示改訂する**(下表)。`architecture.md` § 「設計判断候補とトレードオフ」項3(逐語: 「`dead-owner-only` を普遍方針にする。機構は減るが、文書化済みの wedge holder 回復を削除するため代替手段を要する。`t161`/`t163`/`t-reap-mutex` が現行 steal 意味論を pin しており明示改訂が要る。」)が本裁定の必然的帰結として明記している。改訂前後の実行結果(赤/緑)を記録する。

| テスト | 行 | 現行のピン | FR-1 後の扱い |
| --- | --- | --- | --- |
| `tests/unit/t161-per-intent-lock-reaper.test.ts` | `:180-189` | テスト名逐語「a live-but-OVER-AGE lock is reclaimed」、`expect(acquireAuditLock(PD, 0, 1, INTENT, "default")).toBe(true)` | **反転する** — 生存 over-age holder は横取りされないことを assert する形へ改訂 |
| `tests/unit/t161-per-intent-lock-reaper.test.ts` | `:204-` | 「dead-owner-only policy never reclaims a live over-age holder」 | 挙動が普遍化するため**明示 policy 引数が冗長化**する。テスト名・呼び出しを一本化後の API へ揃える |
| `tests/integration/t163-reaper-steal-race.test.ts` | `:133-137`、`:178` | `AMADEUS_LOCK_STALE_MS: "600000"` を置いて over-age reap の混入を意図的に避けている(逐語 `:133` 「over-age and let the losers reap IT too, defeating the test's premise」) | over-age 経路が消えるため当該回避が不要になる。前提コメントと env 設定を実態へ合わせる |
| `tests/integration/t-reap-mutex.integration.test.ts` | `:51-52` | 同上の `AMADEUS_LOCK_STALE_MS = "600000"` 回避 | 同上 |

不変を期待する側(FR-2 の fail-closed 方向と整合するため改訂しない): `tests/integration/t145-state-lock-concurrency.test.ts`(fail-closed acquire 契約)、`tests/integration/t380-locked-canonical-emit.test.ts` / `tests/integration/t388-audit-merge-atomic-canonical.test.ts`(`AuditLockAcquireError` の形)。これらが緑のままであることを確認する。

**FR-2. `finalizeAuditLockAcquire` の fail-open を閉じる。**

`amadeus-lib.ts:6344-6345` 逐語:

```
  if (writeOwnerStamp(lockDir, key)) return true;
  if (reapPolicy === "dead-or-over-age") return true;
```

第2行は `writeOwnerStamp` が失敗しても acquire 成功を返す。実測では、この事後条件(mkdir 成功・`owner.json` は永久に書かれない・holder は続行)を再現した状態で waiter が critical section へ侵入し、双方 `exit 0` のまま増分1件が失われた(`counter_final=1`、期待 2)。タイミングの幸運を必要としない決定的経路である。

FR-1 により当該行は削除され、`writeOwnerStamp` 失敗時は常に既存の fail-closed 経路(`:6346-6355` の `removeLockDirIfOwned` → `chmodSync` → 再 `removeLockDirIfOwned` → `return false`)を通る。

受け入れ基準: `writeOwnerStamp` を失敗させる注入下で `acquireAuditLock` が `false` を返し、ロックディレクトリが残置されないこと。

**FR-3. wedge した holder の回収経路を明文化し、既存コメントを改訂する。**

FR-1 は、生存したまま stale 化した holder に対する**自動**回収を失わせる。`amadeus-audit.ts:429-433` は現挙動を意図的と記している(逐語: "once the holder has been in its section past DEFAULT_LOCK_STALE_MS the reaper judges that live lock stale and steals it — leaving the outer critical section running with no lock at all, silently.")。文書化済み設計判断の逆転を無申告にしないため、同コメントを改訂して次を明示する。

- nested-append の詰みは `withAuditLock` の depth counter が解決済みであり、over-age reap に依存していない。
- 生存 holder が wedge した場合の回収経路は **`/amadeus --doctor` の leaked-lock プローブ**である。`detectLeakedLocks`(`amadeus-lib.ts:6618`)は `LeakedLock.reason` に `"dead-owner" | "over-age" | "unstamped"` を持ち、`:6634-6635` で `lockAcquireEpochMs() - owner.startedAtMs > lockStaleMs()` を評価して**生存 over-age holder を `over-age` として検出する**。`amadeus-utility.ts:1935` が `detectLeakedLocks(projectDir, true)` を呼び、clear=true で loud に解放する。
- したがって回収経路は既に存在し、かつ**人間が明示的に発動する操作**である(無音の横取りをしない)。プロセス終了による死亡 owner reap も引き続き併存する。

**FR-1 の削除範囲との区別(重要):** FR-1 が撤廃するのは **acquire 経路の自動・無音の over-age steal**(`liveOwnerMayBeReaped` / `reapPolicy` / `finalizeAuditLockAcquire` の fail-open)である。`detectLeakedLocks` の over-age 検出は**明示発動の診断・回収経路**として**維持する** — FR-1 の受け入れ基準「`dead-or-over-age` の grep が 0 件」は reap **方針トークン**を対象とし、`LeakedLock.reason` の `"over-age"` を含まない。

受け入れ基準:
- 改訂後の `amadeus-audit.ts:429-433` コメントが、自動 over-age 横取りを前提とせず、回収経路として doctor プローブを名指しすること。
- `detectLeakedLocks` が生存 over-age holder を `reason: "over-age"` として検出し、clear=true で解放することをテストで固定する(FR-1 の変更後も退行しないこと)。
- 「holder プロセス終了 → 死亡 owner reap → 後続 waiter が取得」の系列もテストで固定する。
- `amadeus-mirror-state-store.ts:450-456` のコメント(逐語「once the section has outlived the stale threshold, letting the reaper steal a live lock out from under it」)は FR-1 後に事実として成立しなくなるため、同一変更で改訂する(`cid:code-generation:same-root-inventory`)。

**FR-4. no-silent-drop ゲート(NSD001)に対し failure terminal を置く。**

`technology-stack.md` の記す blocking ゲート `bun tests/no-silent-drop-gate.ts check`(`ci.yml:154`)は、`catch` の silently-continue を fingerprint で追跡する。ロック実装のほぼ全体が現在 baseline(`tests/no-silent-drop/baseline.json`、うち `amadeus-lib.ts` 35件)に grandfather されており、**編集した catch は再 fingerprint されて新規コードとして NSD001 が発火する**。

方針(裁定 Q5=C): 本 intent が実際に編集する catch には承認済み failure terminal を置く。編集しない catch には触れない。**baseline への新規登録による grandfather 延命は行わない**(org.md Forbidden の検証劇場、および Mandated の「落ちる実証」と矛盾するため)。failure terminal の設置が既存の回復挙動を壊すために infeasible な catch を実装時に発見した場合は、`cid:code-generation:deviation-stop-before-implement` に従い**実装前に停止して裁定を仰ぐ** — builder 単独で baseline 更新へ倒さない。

受け入れ基準: `bun tests/no-silent-drop-gate.ts check --base-revision <base>` が exit 0。`baseline.json` の差分がゼロ、または削除のみ(shrink 方向)。

### #1875 — `Completed` の正準定義(Bolt B)

**FR-5. `Completed` を EXECUTE 実効(定義 E)で canonical 化し、全書き手を共有 writer 経由にする。**

Issue #1875「## 期待」が逐語で「全書き手が共有 writer(`rebuildDerivedPlanFields`)経由で計算する」と指名しており、`rebuildDerivedPlanFields`(`amadeus-lib.ts:5781-5784`)は EXECUTE 実効の実装である。

```
  next = setField(next, "Total Stages", String(executeStages.length));
  const completedCount = parseCheckboxes(next).filter(
    (c) => c.state === "completed" && effective(c.slug) === "EXECUTE",
  ).length;
  next = setField(next, "Completed", String(completedCount));
```

補強: `amadeus-statusline.ts:140-157` は phase 節の内側で `SKIP` / `[S]` 行を除外して数えており(第4の実装)、実効側と一致する。定義 E を選べば利用者が statusline で見る進捗と `Completed` フィールドが初めて一致する。また `Total Stages` は同関数が `executeStages.length` として書くため、定義 E のもとで `Completed <= Total Stages` が構造的に保たれる。

変換対象(`code-structure.md` § 「`Completed` の書き手と読み手の配置」に基づく目録):

| 定義 | サイト | 対処 |
| --- | --- | --- |
| R(生カウント) | `amadeus-state.ts:1456`(`handleCheckbox`)、`:2287`(`handleAdvance`)、`:2368`(`handleFinalize`)、`:2536`(`completeWorkflowForTarget`)、`:3422`(`approveUnderLock`) | 共有 writer 経由へ |
| R(生カウント) | `amadeus-jump.ts:565`(`handleExecute`) | 同上 |
| E(grid 基準の独立実装) | `amadeus-utility.ts:5231-5239`(`handleScopeChange`) | 共有 writer へ畳む |
| G(graph 由来 seed) | `amadeus-utility.ts:4433` → `:4513` | 共有 writer 由来へ揃える |

受け入れ基準:
- `grep -rn 'setField(.*"Completed"' packages/framework/core` の結果が、共有 writer 1箇所と state テンプレート初期化を除いてゼロ。
- SKIP 実効行に `[x]` を持つ state に対し、`checkbox` / `advance` / `approve` / `--stage` ジャンプ / `scope-change` / `recompose` / re-sync のどの経路を通しても `Completed` が同一値を返す(経路間の往復が消える)。
- 初期化 seed の値が現行と不変であること(全 scope が初期化3ステージを EXECUTE にしているため。実装時に実測で確認する)。

**FR-6. approve 検証器を正準定義から読ませ、検証劇場を解消する。**

`amadeus-state.ts:3377` 逐語:

```
  if (getField(content, "Completed") !== String(countCheckboxes(content, "completed"))) return "completed count";
```

これは `approveUnderLock` が `:3422` で生カウントを書いた直後に、**同じ生定義で再計算して比較**しており、定義の乖離を構造的に検出できない(org.md Forbidden の検証劇場)。定義 E への統一時にここを同時に直さないと、**全 approve が fail-closed で拒否される**。

受け入れ基準: 検証器が共有 writer の算出値と state 上の値を比較すること。定義が乖離した state を注入すると当該検証が実際に赤くなること(落ちる実証)。

**FR-7. 定義 R をピン留めしている既存テスト契約を明示改訂する。**

独立再列挙(`cid:requirements-analysis:enumeration-completeness-review`)により **3本**を確定した。RE 報告およびクロスレビュー2名はこのうち2本のみを列挙しており、3本目は本ステージで新規に検出した。

| テスト | 行 | ピンの形 |
| --- | --- | --- |
| `tests/e2e/t52-workflow-state-progression.test.ts` | `:118`(helper `:86-88` が `/^- \[x\]/gm`) | `expect(counter).toBe(completedCount(state))` |
| `tests/e2e/t-tui-kiro-fix-scope.serial.test.ts` | `:142-143` | `xCount = (state.match(/^- \[x\]/gm)).length` と field の一致 |
| `tests/e2e/t-tui-t139-revision-loop-idempotency.serial.test.ts` | `:243`、`:307`(helper `:160-162` が `/^- \[x\] (\S+)/gm`) | `expect(completedCounter).toBe(completedGrid)` |

**RE 報告の「いかなる統一も既存テストを最低1本は必ず壊す」という記述は、本ステージでは採用しない。** R と E が乖離するのは `[x]` 行が SKIP 実効を持つ場合に限られ、上記3本のフィクスチャがその形を作るかは未実測である。したがって受け入れ基準は「赤くなること」ではなく次のとおりとする。

- 3本のアサーションを正準定義(EXECUTE 実効)へ改訂する。現に赤かったか否かに関わらず、生カウント意味論をピン留めしたままにしない。
- 改訂の可否判断のため、実装時に改訂前後の実行結果(赤/緑)を記録する。
- 定義 E をピン留めする `tests/integration/t394-compose-state-resync.integration.test.ts:126-144`(テストブロックは `:126` 開始 `:145` 終了、E の assert 群は `:138-144`。`Completed === completedExecute.length` かつ `Completed <= Total Stages`)は改訂せず、緑を維持する。

**FR-8. 文書化済み canonical を Issue 期待に合わせて更新する。**

`packages/framework/core/amadeus-common/protocols/stage-protocol.md:545` 逐語: `- **Completed**: auto-synced by \`checkbox\` and \`advance\` commands (count of [x] stages)`。この記述は (i) 定義を生カウントと読める (ii) 書き手の列挙が古く `checkbox` / `advance` の2つしか挙げていない、の2点で現状と乖離している。正本 `packages/framework/core/amadeus-common/` を編集し、定義 E と実際の書き手経路を反映する。

受け入れ基準: 更新後の記述が FR-5 の canonical と一致し、全配布面へ再生成されていること。

### 横断

**FR-9. 正本変更を全配布面へ同期する。**

`code-structure.md` § 「生成面」の記すとおり、各 core tool ファイルは 12 のコミット済みコピー(dist 7 + self-install 5)を持つ。`packages/framework/core/` を変更した後は `bun scripts/package.ts` と `bun run promote:self` を実行し、`bun run dist:check` / `bun run promote:self:check` で検証する。7ハーネス全てを対象とする(`cid:build-and-test:bt-dist-regen-seven-harnesses` — 5ハーネスで止めると `kiro` / `kiro-ide` が DIFFERS になる)。

`packages/framework/core/` のコメント・文字列に `scripts/<file>` パストークンを持ち込まない(`cid:code-generation:c1-1569-shipped-comment-vocab` — 全 dist コピーで `t258-boundary-guard` が落ちる)。

**FR-10. スコープ外と裁定した所見を Issue として起票する。**

裁定 Q3=A によりスコープ外とした2件を起票する。起票は `cid:requirements-analysis:bug-issue-canonical-body` の正書式に従い、`cid:requirements-analysis:pre-filing-dup-and-branch-check`(closed を含む重複検索と既修正の自ブランチ未取込確認)を先行させ、種別 + P + S ラベルを起票時に同時付与する。

1. **ロック bucket の不整合** — `auditLockIdentity`(`amadeus-lib.ts:5960-5966`)が `intent === undefined` で workspace sentinel を使うため、`handlePark` / `handleUnpark` は workspace bucket、`handleSet --intent X` は per-intent bucket で**同じ state ファイル**を変更する。**code-derived であり lost update の実測再現をしていない**旨を本文に明記する。
2. **UNLOCKED な state read-modify-write 6件** — `amadeus-jump.ts:370→627`、`amadeus-bolt.ts:872→889` / `:927→954`、`amadeus-utility.ts:5162→5244` / `:5561→5578`、`amadeus-lib.ts:5843→5888`(`resyncOneIntent`)。うち3件は `Completed` を書く。

## 非機能要件

**NFR-1. TDD を既定とする。** team.md `cid:code-generation:tdd-default-with-narrow-exceptions` により、実行時の振る舞いを変える FR-1・FR-2・FR-5・FR-6 は、合意済みの公開 seam へ失敗テストを1件追加して Red を実測してから最小実装で Green にする vertical slice を反復する。テストの一括先行や実装後のテスト追加は TDD 実施とみなさない。FR-8 の文書更新と FR-9 の生成物同期は適用外(それぞれ文書のみの変更、正本から機械生成される投影物の同期)だが、drift check で検証する。

**NFR-2. 相互排他の回帰検証は決定的でなければならない。** 確率的再現(起票時の「1/2 回」)に依存しない。repo 外 scratch に `AMADEUS_LOCK_BASE_DIR` を固定した N 並列プロセスから対象モジュールを直接 import するハーネス形式を用いる(`cid:reverse-engineering:c2-parallel-process-repro-harness`)。同一 worktree での coverage 計測は `cid:code-generation:c1-coverage-single-owner` により単独所有者を決めて直列化する。

**NFR-3. 既存のブロッキングゲート集合を全通過する。** `bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`、coverage ゲート(project / patch / relative)、complexity、`bun tests/no-silent-drop-gate.ts check`、`bun tests/unchecked-cast-guard.ts --check`、plugin-conformance-e2e。

**NFR-4. ロック取得の予算特性を退行させない。** 既定は `maxRetries = 50` / `retryMs = 100`(`amadeus-lib.ts:6360-6361`)= 5000ms。`packages/framework/core/otel/fatal-latch.ts:99` は削減予算 `(5, 50)` = 250ms で取得する。FR-1 の変更後も、既定構成での競合時の挙動が fail-closed(予算枯渇で `AuditLockAcquireError` を throw、`amadeus-lib.ts:6520-6521`)であることを維持する。差分スキャンの `defaults-budget` run が示した「41 成功 + 19 の loud な非ゼロ終了 = 60、無音損失ゼロ」の性質を壊さない。

**NFR-5. 新設テストの層配置。** 実 FS / プロセスを使う検証は integration 層に置き、unit 層は純関数に限る(`cid:code-generation:fs-tests-integration-first`)。in-process 駆動(coverage 盲点回避)とテスト層は独立の2軸であり、実 FS を触る in-process テストは integration 層に置いたまま lcov 有効である。

## 制約

- **スコープは `self-fix`。** 既存設計・方針・契約との不一致の限定的是正であり、新機能・新仕様を持ち込まない。FR-3 の回収経路は既存の「プロセス終了 → 死亡 owner reap」の明文化であり、新規 CLI verb を追加しない(§「前提」参照)。
- **Bolt は直列とする**(裁定 Q4=A)。`cid:code-generation:c6` の交差判定を実ファイル目録で実施した結果、Q3=A によりソース交差は消えるが、**両パッチとも `amadeus-lib.ts` を編集するためその生成コピー12個が交差する**。後続 Bolt には `cid:code-generation:base-advance-regrounding` を適用する(merge-base 実測 → rebase → 正本を触ったため dist / self-install を完全再生成 → 全検証コマンド再実行)。
- **1 Issue = 1 Unit**、複数 Issue を単一 PR に束ねない(`cid:units-generation:c1`)。
- **本線ツリーで実装しない。** ソロモードでも Bolt 実装は git worktree 分離で行う(`cid:code-generation:solo-bolt-worktree-required`)。
- **`t164` の bucket 意味論ピンは改訂しない**(裁定 Q3=A によりスコープ外)。
- reaper の steal 意味論をピン留めする `t161` / `t163` / `t-reap-mutex` は、FR-1 により**改訂が必須**である(任意ではない)。対象行と改訂方針は FR-1 の受け入れ基準の表に規定する。fail-closed acquire 契約(`t145`)と `AuditLockAcquireError` の形(`t380` / `t388`)は不変を期待し、やむを得ず改訂する場合のみ理由を PR と record に明記する。
- coverage patch ゲートに備え、push 前にローカルで lcov を生成し diff 追加行の未カバーが 0 であることを実測する(`cid:code-generation:local-lcov-pre-push`)。

## 前提

- **A-1. wedge 回収に新規 CLI verb を追加しない。** 裁定 Q2=A の選択肢文は回収経路を「専用 CLI verb 等」と例示したが、実測により**既存機構が既に充足している**と判断した — `/amadeus --doctor` の leaked-lock プローブ(`detectLeakedLocks`、`amadeus-lib.ts:6618`、`reason` に `"over-age"` を持ち `:6634-6635` で生存 over-age holder を判定、`amadeus-utility.ts:1935` が clear=true で解放)が、人間の明示発動による回収経路として既に存在する。死亡 owner reap も FR-1 後に維持される。したがって FR-3 は既存経路の明文化とテストによる固定に留める。**承認ゲートでユーザーが「新設しない(`self-fix` 維持)」を選択して確定(2026-08-03T13:47:12Z)。** なお承認時点の根拠は「プロセス終了 → 死亡 owner reap」だったが、その後 code-generation の計画段で doctor プローブという**より強い既存根拠**を実測発見したため本項を精密化した(結論・スコープは不変)。
- **A-2. 初期化 seed の値は不変。** クロスレビュー2名の実測(全15 scope が初期化3ステージを EXECUTE、init-SKIP hits: 0)により、定義 G を定義 E へ揃えても値は変わらない。実装時に再実測する。
- **A-3. 3本のテスト pin が現に赤いかは未確定。** R と E は `[x]` 行が SKIP 実効を持つ場合にのみ乖離する。FR-7 は赤の実在を前提にせず、意味論の改訂を要求する。
- **A-4. 患部ファイルは記録 ref 間で不変。** `498c3034a..HEAD` で患部5ファイルへの touch が 0 コミットであることを実測済み。

## スコープ外

- **ロック bucket の統一**(`auditLockIdentity` の per-intent / workspace 分離、`withLockedIntentRegistry` の「registry ロック」/「state file ロック」への分割)。裁定 Q3=A。FR-10 で起票する。
- **UNLOCKED な state RMW 6件の施錠**。裁定 Q3=A。FR-10 で起票する。
- **`Stages to Skip` の2定義問題**(reviewer-2 §5 の同根所見 — `rebuildDerivedPlanFields` は birth / scope-change 注記を逐語保存するが `handleScopeChange` は bare rebuild で破壊する)。`Completed` とは別フィールドであり #1875 の期待に含まれない。別 Issue とする。
- **`resyncOneIntent` のカウンタ全文走査問題**(reviewer-1 §同根 — 行の棚卸しは Stage Progress 節に限定されたがカウンタは `parseCheckboxes(content)` の全文走査のままで、節外の checkbox 形の行がカウンタだけを水増しする)。FR-5 の共有 writer 化と隣接するが独立の欠陥であり、別 Issue とする。
- **ロックの heartbeat 機構**。裁定 Q2=A(撤廃)を採ったため不要になった。
- **#1875 の S ラベル再判定**(reviewer-1 が S3-MAJOR の余地を指摘し判断を回付)。ラベル運用であり本 intent の実装スコープ外。
- 要求されていない後方互換レイヤー・移行シム・二重実装(org.md Forbidden)。

## 未決事項

1. ~~**A-1(新規 CLI verb を追加しない前提)の承認。**~~ **解決済み** — 承認ゲートでユーザーが「新設しない(`self-fix` 維持)」を選択(2026-08-03T13:47:12Z)。FR-3 は既存経路(holder プロセス終了 → 死亡 owner reap による自動解放)の文書化とテスト固定に留め、専用 CLI verb は追加しない。スコープは `self-fix` のまま。
2. **記録 ref の不整合の是正。** `re-scans/260803-state-integrity.md` の observed(`498c3034a`)と 9 共有 codekb 成果物の記録 ref(`6c15af23a`)が 7 コミットずれている。引用の正しさには影響しない(A-4)が、`cid:reverse-engineering:measurement-ref-in-artifacts` の趣旨からは記録面の是正が望ましい。本 intent の record-sync 時に扱うか、別途扱うかを決める。
3. **FR-4 の実際の発火範囲。** 編集する catch がどれだけ再 fingerprint されるかは、パッチ確定後に `no-silent-drop-gate` を実行するまで確定しない。infeasible な catch が出た場合の停止・エスカレーションは FR-4 に規定済み。
4. **本番既定値(`DEFAULT_LOCK_STALE_MS = 10 min`)での分岐 B 到達可能性**は未計測のまま残る。計測は `AMADEUS_LOCK_STALE_MS=1` でのみ行った。FR-1 が分岐 B を構造的に消すため修正には影響しないが、S ラベルの妥当性判断の材料としては未確定である。
5. **`writeOwnerStamp` の実発生確率**(FR-2 の引き金)。失敗の帰結は実証したが発生確率は未実証(想定原因: ENOSPC、共有 tmpdir での EACCES、EMFILE)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T13:28:41Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1 の MAJOR(FR-1 のテストピン改訂要求の欠落)と MINOR(t394 の行範囲不一致)はいずれも閉包し、是正 diff 内に新たな検証可能な誤りは検出されなかった。

### Findings

- None

# RE 差分リフレッシュ記録: 260803-state-integrity

上流成果物(consumes): なし。入力は intent state、[Issue #1906](https://github.com/amadeus-dlc/amadeus/issues/1906) / [Issue #1875](https://github.com/amadeus-dlc/amadeus/issues/1875) の本文とクロスレビュー verdict、および Developer Code Scan の完全要点。Project Type は Brownfield、Scope は `self-fix`、Depth は Minimal。

## 実行メタデータ

- Date: `2026-08-03`
- Base commit: `a8e1ce025a918310ab7d803270bb6fc6b649c598`（`git merge-base --is-ancestor` exit 0 で祖先性を実測確認。HEAD から 42 コミット手前の最近祖先を `cid:reverse-engineering:rescan-base-ancestry` に従って選択）
- Observed commit: `498c3034a78bd432dc426f9f807b79c8ae980762`（worktree HEAD、`git rev-parse` exit 0。scan による source 変更なし）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal
- Focus: audit lock の相互排他破れ（#1906、P2 / S1-FATAL / `origin:bootstrap`）と `Completed` カウンタ定義の三分裂（#1875、P3 / S4-MINOR / `origin:bootstrap`）。両 Issue とも本 observed SHA でクロスレビュー2名成立済み。
- Scan mode: **xrev scan mode**（`cid:reverse-engineering:c1-xrev-scan-mode`、単発 Issue への拡張 `c1-xrev-single-issue`）。両 Issue のクロスレビュー verdict を Developer scan の一次入力とし、Architect が主要 seam を verbatim spot-check で二重化した。
- **行番号再解決の免除は適用される（APPLIES）**。理由: 両 Issue のレビュー verdict が引用した file:line はすべて本 observed SHA `498c3034a` で検証されており、レビュー対象 SHA == observed SHA が成立する（`c1-xrev-single-issue` の免除条件）。したがって全引用の機械的再解決は不要とした。ただし Architect は §「引用の spot-check」の 6 箇所を独立に verbatim 実読して裏取りした。
- Preflight deviation: なし。git 状態を変更する操作は行っていない。coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない。
- Base 選定根拠: `re-scans/` の直近記録（`260802-registry-drift-guard`、observed `64b44a9f8`）は本 worktree の HEAD 系譜に対して祖先性を持たないため採用しなかった。`a8e1ce025` は `git merge-base --is-ancestor` exit 0 で祖先と確認できた最近点である。

## Developer Code Scan の実測要約

### 差分区間の性質（base → HEAD、42 コミット）

`git diff --stat` exit 0: **1584 files changed, 171746 insertions(+), 6216 deletions(-)**。

患部ファイルに触れたコミットは 2 件だけである（`git log -- <file>` exit 0）。

| ファイル | 区間内コミット |
| --- | --- |
| `packages/framework/core/tools/amadeus-lib.ts` | `7c29e33f7` |
| `packages/framework/core/tools/amadeus-state.ts` | `7c29e33f7`, `35c88498c` |
| `packages/framework/core/tools/amadeus-jump.ts` | `7c29e33f7` |
| `packages/framework/core/tools/amadeus-utility.ts` | `7c29e33f7` |
| `packages/framework/core/tools/amadeus-audit.ts` | なし |
| `packages/framework/core/tools/amadeus-bolt.ts` | なし |

`35c88498c` は `amadeus-state.ts` への 1 行変更（registry drift guard）で両バグと無関係。

**#1906 にとって決定的な事実: ロック機構は区間内で一切変更されていない。** `git show 7c29e33f7 -- amadeus-lib.ts | grep '^@@'` exit 0 が返す hunk header は `@@ -5362,71 +5362,308 @@` の 1 件のみで、変更は checkbox / text-mutation 領域（5362–5670）に限局する。ロックコード（5937–6600）は **+237 行下方へシフトしただけで論理は byte 単位で不変**である。レビュアーの引用（`:6107`、`:6142`、`:6284`、`:6294`、`:6344`、`:6360`）はシフト後の値であり、observed SHA で verbatim 一致する。

**#1875 にとっては区間変更が患部そのもの。** `7c29e33f7`（PR #2088、no-silent-drop gate）が導入したもの:

- `TextMutationResult` 判別ユニオン（`amadeus-lib.ts:5425`）= `changed | not-found`
- `StateMutationTargetError`（`:5450`）
- `requireChanged(result, operation)`（`:5660-5667`）— `not-found` で throw
- `setCheckbox` / `setStageSuffix`（`:5599`、`:5629`、`:5645`）がユニオンを返すようになった
- `countCheckboxes`（`:5669`）は意味論不変 — **依然として EXECUTE/SKIP suffix に対して定義盲目**

`requireChanged` の呼び出し点は現在 **19**（`amadeus-state.ts` 11、`amadeus-jump.ts` 5、`amadeus-utility.ts` 3）。

### 新設 CI ゲート — 両パッチを拘束する

`.github/workflows/ci.yml:154`、`package.json:24` → `bun tests/no-silent-drop-gate.ts check --base-revision <base>`。規則は `tests/no-silent-drop/ast-scan.ts:845-846, :16`:

- **NSD001** — catch ブロックが承認済み failure terminal なしに silently continue する経路を持つ
- **NSD002** — `applyTransition` の `StateResult` を検査せず捨てている
- **NSD003** — `persistBlocked` / `setCheckbox` / `setStageSuffix` / `resyncOneIntent` の戻り値を捨てている（`NSD003_FUNCTIONS`、`ast-scan.ts:16`）

baseline（`tests/no-silent-drop/baseline.json`）は **217** 件の grandfather 済みエントリを持ち、うち `amadeus-lib.ts` **35** 件、`amadeus-state.ts` **10** 件（`grep -c` exit 0）。

> **本 intent 最大の CI リスク。** audit lock の実装はほぼ全体が `try { … } catch { /* comment */ }` の silent-continue で構成されている: `writeOwnerStamp:6013`、`readOwnerStamp:6060`、`removeLockDirIfOwned:6048`、`lockDirMtimeMs:6122`、`reapStaleLock` finally `:6210`、`acquireReapMutex:6241/:6250/:6258/:6263/:6269`、`reapStaleLockUnderMutex:6306/:6316/:6319/:6327`、`finalizeAuditLockAcquire:6350`、`acquireAuditLock:6372/:6380`。これらは現在 baseline に入っている。**#1906 のパッチがこれらの catch を編集すると再 fingerprint され、NSD001 が新規コードとして発火する。** 各 catch に承認済み failure terminal を残すか、同一 PR で根拠付きの baseline 更新を入れる必要がある。別ゲート `bun tests/unchecked-cast-guard.ts --check`（`ci.yml:169`）も走る。

## #1906 — レビュアー間の不一致の解決

### 二つの steal 分岐（コード由来）

`reapStaleLockUnderMutex`（`amadeus-lib.ts:6284-6331`）が CAS steal へ落ちる経路はちょうど 2 つある。

**分岐 A — 「古い unstamped dir」**（`:6285-6295`）

```
const owner = readOwnerStamp(lockDir);
if (owner === null) {
  const mtime = lockDirMtimeMs(lockDir);
  if (mtime === null) return false;
  if (lockAcquireEpochMs() - mtime <= unstampedGraceMs()) return false;   // :6294
  // else fall through to steal
}
```

CAS 後の検証 `stampMatches(dead, null)`（`:6144-6152`）は **入口と同じ述語**（依然 unstamped かつ依然 grace 超過）を再評価する。独立した検査ではなく、入口述語を満たして変化していない dir を却下できない。

**分岐 B — 「生きている所有者が age 超過」**（`:6296-6300` → `liveOwnerMayBeReaped:6274-6282`）

```
} else if (ownerAlive(owner)) {
  if (!liveOwnerMayBeReaped(owner, reapPolicy)) return false;   // :6299
}
// liveOwnerMayBeReaped: reapPolicy === "dead-or-over-age"
//   && lockAcquireEpochMs() - owner.startedAtMs > lockStaleMs()
```

CAS 後の検証 `stampMatches(dead, owner)`（`:6153-6154`）は移動後の dir が同じ `pid + startedAtMs` を持つことを要求する。**生きている holder は自分の stamp を決して更新しない**（`writeOwnerStamp` は acquire 時に 1 回だけ呼ばれる）。したがって stamp は常に一致し、**検証は守るべきケースそのものに対して必ず通過する。分岐 B の CAS は構造的に不活性（inert）である。**

### 実測による決着（scratch、`AMADEUS_LOCK_BASE_DIR` を scratchpad に固定）

ハーネス: 20 並行 `bun` プロセスが各々 `withAuditLock(pd, () => { read counter; sleepSync(hold); write counter+1 })` を実行。正解は 20。

| Run | Env | 結果 |
| --- | --- | --- |
| baseline ×1 | defaults | `FINAL=20 NONZERO_EXITS=0` |
| graceA ×6 | `AMADEUS_LOCK_UNSTAMPED_GRACE_MS=1`、hold 20ms | 6/6 で `FINAL=20 NONZERO_EXITS=0` — 損失なし |
| staleB ×6 | `AMADEUS_LOCK_STALE_MS=1`、hold 20ms | `FINAL=4,4,5,6,6,5` `NONZERO_EXITS=0` — 6/6 で大量の無音損失 |
| defaults-budget ×1 | defaults、N=60 hold 120ms | `FINAL=41 NONZERO_EXITS=19`（41+19=60） |

**不一致の裁定 — 両レビュアーとも部分的に正しく、reviewer-2 の機序が支配的。**

- **分岐 B は決定的に到達可能で、これが真の相互排他破れである。** 6/6 の run で 20 増分のうち 14–16 を失い、全プロセスが exit 0。stamp 書込失敗もスケジューリングの幸運も不要で、必要条件は **critical section 継続時間 > `lockStaleMs()`** だけ。reviewer-2 の 2/8 は同じ現象の弱い版（hold が閾値近辺だったと推定）で、hold ≫ stale では ~100% 再現する。
- **分岐 A は grace ノブ単独では到達しない**（0/6、reviewer-2 の非再現と一致）。理由は `stampMatches` ではなく、reaper が `mkdir` を EEXIST で失敗 → reap mutex を `mkdirSync` → `readOwnerStamp` と、holder の `mkdir` の後に 2 回以上の追加 syscall を要するため。その頃には holder はほぼ必ず `owner.json` を書き終えている。reviewer-1 の 1/6 の `"19"` は holder の `mkdir`→`writeFileSync` 間隙での稀なスケジューラ停止と整合する — **実在するが限界的**であり主経路ではない。
- **ただし分岐 A は `finalizeAuditLockAcquire:6344-6345` 経由で決定的になる。** これが両レビュアーの指摘した fail-open である。

  ```
  if (writeOwnerStamp(lockDir, key)) return true;
  if (reapPolicy === "dead-or-over-age") return true;   // :6345  ← stamp 書込失敗でも acquire 成功
  ```

  この事後条件（mkdir 成功、`owner.json` は永久に書かれない、holder は続行）をそのまま再現し、`UNSTAMPED_GRACE_MS=300`・2000 ms の critical section で実測:

  ```
  HOLDER_ACQUIRED …/.amadeus-audit-5512c8ad.lock
  WAITER_EXIT=0
  counter_after_waiter=1
  HOLDER_DONE
  counter_final=1        # 相互排他が保たれていれば 2
  ```

  waiter は holder が中にいる間に critical section へ入り、双方 exit 0、増分 1 件が無音で失われた。`:6345` は一時的な書込失敗を**恒久的に steal 可能な live lock** へ変換する — タイミングの幸運を一切必要としない分岐 A である。

### 既定ノブでの挙動は fail-CLOSED

`defaults-budget` run が決定的である。50×100 ms の予算を使い切る競合下で **41 成功 + 19 の loud な非ゼロ終了 = 60**、無音損失ゼロ。相互排他は完全に保たれ、失われた増分はすべて `exit 1` として表面化した。Issue 原文の「19/20 が生き残り全プロセスが exit 0」という記述は**既定構成の挙動を描写していない**。`withAuditLock` は予算枯渇時に `AuditLockAcquireError` を throw する（`amadeus-lib.ts:6520-6521`）。

### 予算と grace の結合

`acquireAuditLock` の既定（`:6360-6361`）: `maxRetries = 50`、`retryMs = 100` → mkdir 試行 51 回、sleep 50 回 = **5000 ms**。`unstampedGraceMs()` の既定（`:6113`）= **5000 ms**。steal 述語は厳密（`> grace`、`:6294`）なので、t=0 に生まれた unstamped dir は t>5000 で合法的に steal 可能になる — ちょうど waiter の**最後の**リトライ機会にあたる。実在する脆い結合だが、これは *タイミングの一致* であって機序ではない。機序は分岐 A / B である。

### コードベースは既に分岐 B を文書化している

`amadeus-audit.ts:429-433`、verbatim（Architect が独立実読で確認、exit 0）:

> "once the holder has been in its section past DEFAULT_LOCK_STALE_MS the reaper judges that live lock stale and steals it — leaving the outer critical section running with no lock at all, silently."

そこで適用された緩和は *nested-append* ケースに対する `withAuditLock` の depth counter だけである。一般の「critical section が `lockStaleMs()` を超える」ケースは開いたまま残された。本番では `DEFAULT_LOCK_STALE_MS = 10 min`（`:5945`）なので、分岐 B は 10 分超の critical section を要する — 稀だが不可能ではない（wedge した section、停止したプロセス、遅い FS）。`packages/framework/core/otel/fatal-latch.ts:99` は削減予算 `(5, 50)` = 250 ms で acquire する。

### 新規所見 — ロックは heartbeat を持たない

`writeOwnerStamp` は 1 acquire につきちょうど 1 回だけ呼ばれる（`finalizeAuditLockAcquire:6344`）。したがって `owner.startedAtMs` は *acquire 時刻* であり、決して更新されない。`liveOwnerMayBeReaped` の `now - owner.startedAtMs > lockStaleMs()` と組み合わせると、**健全な長時間 holder と wedge した holder が区別不能**である。分岐 B のいかなる修正も、stamp の heartbeat を供給するか、live PID を一切 reap しない方針（`dead-owner-only` を普遍方針にし wedge holder を別手段で回復）を採るかのいずれかを要する。

## observed SHA での列挙

### ロック取得点

`grep -rn --include='*.ts' 'withAuditLock(' packages/` exit 0 → **36** hits。ファイル別（`grep -rc` exit 0）:

| ファイル | 件数 |
| --- | --- |
| `amadeus-state.ts` | **15** |
| `amadeus-presence-reservation.ts` | 5 |
| `amadeus-utility.ts` | 3 |
| `amadeus-runtime.ts` | 2 |
| `amadeus-sensor.ts` | 2 |
| `amadeus-grant-authorization.ts` | 2 |
| `amadeus-audit.ts` | 2 |
| `amadeus-lib.ts` | 2（定義 + `withLockedIntentRegistry:2289`） |
| `amadeus-learnings.ts` | 1 |
| `amadeus-orchestrate.ts` | 1 |
| `amadeus-graph.ts` | 1 |

`amadeus-state.ts` の 15 件: `:823`（`operationWithLock`）、`:1079`、`:1159`、`:1193`、`:1237`、`:1269`、`:1387`、`:1444`、`:2341`、`:3474`、`:3634`、`:4338`、`:5157`、`:5359`、`:5466`。

`withAuditLock` の depth counter を**経由しない** bare `acquireAuditLock` / `enterAuditLock`（exit 0）:

- `amadeus-audit.ts:549`
- `amadeus-mirror-state-store.ts:457`（`enterAuditLock`、two-phase port）、`:477`（`acquireAuditLock`）
- `packages/framework/core/otel/fatal-latch.ts:99` — `acquireAuditLock(probe.projectDir, 5, 50)` = 250 ms 予算

### ロック BUCKET の不整合 — 新規所見、どちらの Issue にも記載なし

`auditLockIdentity`（`amadeus-lib.ts:5960-5966`、Architect が verbatim 実読で確認）は `intent === undefined` のとき identity を `projectDir + WORKSPACE_LOCK_SENTINEL` にする。つまり 2 引数の `withAuditLock(pd, fn)` は、body がどの record の state file を書こうと **workspace bucket** をロックする。

実際に `intent, space` を渡している `amadeus-state.ts` の取得点（引数は末尾にあるため **閉じ行**で判定した）:

| 開いた行 | 閉じ行 | bucket |
| --- | --- | --- |
| `:1079`（`handleSet`） | `:1133` `}, resolvedIntent, space);` | **per-intent** |
| `:1444`（`handleCheckbox`） | `:1460` `}, resolvedIntent, space);` | **per-intent** |
| `:5157` | `:5241` `}, resolvedIntent, space);` | **per-intent** |
| `:5359` | `:5414` `}, resolvedIntent, space);` | **per-intent** |
| `:1159`、`:1193`、`:1237`、`:1269`、`:2341`、`:3634`、`:4338`、`:5466` | `});` | **workspace sentinel** |

`handlePark`（`:1269`→`:1295`）と `handleUnpark`（`:1334`、`withIntentLifecyclePreflight` → `withLockedIntentRegistry` → `withAuditLock(projectDir, …)`、`amadeus-lib.ts:2289` — intent 引数なし）はいずれも **アクティブ intent の state file** を **workspace** bucket の下で変更する。一方 `handleSet --intent X` は **同じファイル**を **per-intent X** bucket の下で変更する。

> **1 つの state file に 2 人の書き手がいて、互いに異なる mutex を取る → 相互排他しない。** これは §「二つの steal 分岐」の reaper race とは独立した相互排他欠陥であり、env ノブを一切必要としない。`handleSet` 自身のコメント `:1063-1064` と `:1076-1077` は "LOCK == WRITE" を主張するが、この不変条件は `handleSet` 単体では成立し、state CLI 全体では**大域的に偽**である。
>
> **この経路での lost update は実測再現していない（code-derived、not measured）。** 再現には live record と 2 回の CLI 起動が必要で、repo state を変更してしまうため実施していない。

`handleIntentBirthStateBuild` は `amadeus-utility.ts:4542` で `:4149` の workspace lock 下に state を書く — 同じ規則で bucket 不一致だが、実務上は無害（まだ born していない intent を他プロセスは参照できない）。

### ロックされていない state の read-modify-write

`readStateFile(`（39 サイト）と `writeStateFile(`（21 サイト）の列挙を、囲んでいるロックスコープと交差して導出（すべて exit 0）:

| 関数 | read → write | 状態 |
| --- | --- | --- |
| `amadeus-jump.ts` jump handler | `:370` → `:627` | **UNLOCKED**（`amadeus-jump.ts` に `withAuditLock` が存在しない）— `:565` で `Completed` を書く |
| `amadeus-bolt.ts` | `:872` → `:889` | **UNLOCKED**（`amadeus-bolt.ts` に `withAuditLock` なし） |
| `amadeus-bolt.ts` | `:927` → `:954` | **UNLOCKED** |
| `amadeus-utility.ts` `handleScopeChange`（`:5141-5299`） | `:5162` → `:5244` | **UNLOCKED** — `:5239` で `Completed` を書く |
| `amadeus-utility.ts` `handleConfigChange`（`:5538-5616`） | `:5561` → `:5578` | **UNLOCKED**（`Completed` には触れない） |
| `amadeus-lib.ts` `resyncOneIntent`（`:5830-5891`） | `:5843` → `:5888` | **UNLOCKED** — `rebuildDerivedPlanFields:5784` 経由で `Completed` を書く。**新規 — どちらの Issue にも記載なし** |

ロック済みと確認: `handleRecompose`（`amadeus-utility.ts:5385`→`:5516`）、`handleSetStatus`（`:5640`→`:5667`）、および上表の `amadeus-state.ts` の全 RMW。

## #1875 — `Completed` フィールドの書き手と読み手

`grep -rn --include='*.ts' 'setField(.*"Completed"' packages/` exit 0 → **9** hits、うち **7** が *カウント* を書く（残り 2 の `amadeus-state.ts:2419` / `:2538` は `Status: "Completed"` — 別フィールド）。加えて `amadeus-state.ts:2536`（位置引数の `setField`）と state テンプレート `amadeus-utility.ts:4513` → **値の書き手は 9 件**で Issue と一致。

`grep -rn 'countCheckboxes(content, "completed")' packages/` exit 0 → **8** hits。`grep -rn 'getField(.*"Completed")' packages/` exit 0 → **2** hits（うち 1 は `Status`）。

**定義 R — 生の `countCheckboxes(content,"completed")`**（SKIP 行の `[x]` も数える）:

| サイト | 役割 |
| --- | --- |
| `amadeus-state.ts:1455` → write `:1456` | `checkbox` サブコマンド。JSON `completed_count` `:1459` |
| `amadeus-state.ts:2286` → write `:2287` | advance。audit "Stages completed" `:2143`、JSON `:2318` |
| `amadeus-state.ts:2367` → write `:2368` | advance-family。JSON `:2433` |
| `amadeus-state.ts:2536`（inline）と `:2554` | complete-workflow。audit `:605`、`:619`、JSON `:2592` |
| `amadeus-state.ts:3422` | approve commit の再書込 |
| `amadeus-state.ts:3377` | **読み手** — `approvalNextStateIssue`、fail-closed な approve 検証。定義がハードコード |
| `amadeus-jump.ts:564` → write `:565` | jump。audit `:132`、JSON `completed_count` `:638` |

**定義 E — EXECUTE 実効のみ:**

| サイト | 役割 |
| --- | --- |
| `amadeus-lib.ts:5781` → write `:5784` | `rebuildDerivedPlanFields`（共有書き手）— `parseCheckboxes(next).filter(c => c.state === "completed" && effective(c.slug) === "EXECUTE")` |
| 消費: `amadeus-lib.ts:5886` | `resyncOneIntent`（**UNLOCKED**） |
| 消費: `amadeus-utility.ts:5507` → write `:5516`、表示 `:5529` | `handleRecompose`（locked） |
| `amadeus-utility.ts:5236` → write `:5239`、表示 `:5266` | `handleScopeChange` — **独自の inline コピー**。共有書き手を呼ばない（**UNLOCKED**） |

**定義 G — graph 由来:**

| サイト | 役割 |
| --- | --- |
| `amadeus-utility.ts:4433` | `const completedInit = graph.filter(s => s.phase === "initialization").length` |
| → テンプレート `:4513` `- **Completed**: ${completedInit}` | state 初期化の seed |
| → audit `:4568` `"Stages completed": String(completedInit)` | `WORKSPACE_INITIALISED` |

**確認済み:** 3 定義すべてが append-only の audit 行（`amadeus-state.ts:605`、`:619`、`:2143`、`amadeus-jump.ts:132`、`amadeus-utility.ts:4568`）と CLI JSON（`amadeus-state.ts:1459`、`:2318`、`:2433`、`:2592`、`amadeus-jump.ts:638`）へ到達する。

Architect による追加の構造的所見（コード由来）: `rebuildDerivedPlanFields` は同じ関数内で `Total Stages` を `executeStages.length` として書く（`amadeus-lib.ts:5780`、verbatim 確認）。定義 R は SKIP 行の `[x]` も数えるため、**同一 state file 上で `Completed > Total Stages` が構造的に成立しうる**。`t394` が `Completed <= Total Stages` を assert しているのはこの不変条件を守る意図であり、定義 R の書き手はそれを破りうる。

## 修正面

### #1906

| 変更 | 位置 | 備考 |
| --- | --- | --- |
| `:6345` の fail-open を閉じる | `amadeus-lib.ts:6337-6356` | `dead-or-over-age` で `writeOwnerStamp` 失敗時に `true` を返すのをやめ、両方針で fail closed にする。小さく surgical、価値が高い — 唯一の *決定的* な分岐 A 経路 |
| 分岐 B の無害化 | `amadeus-lib.ts:6274-6282`、`:6296-6300` | stamp heartbeat を足す（長い section 中に `startedAtMs` を更新）か、live PID の reap を止める。**裁定が必要** — over-age reap の削除は wedge holder の回復手段を変え、`amadeus-audit.ts:429-433` はそれを意図的と文書化している |
| 予算と grace の分離 | `:6360-6361` vs `:6113` | acquire 予算を unstamped grace より厳密に小さくするか、grace 比較が予算を織り込む |
| ロック bucket の統一 | `amadeus-state.ts:1159, 1193, 1237, 1269, 3634, 4338, 5466` + `amadeus-lib.ts:2289` | **影響範囲が大きい** — `t164` が現行 bucket 意味論を pin しており、`withLockedIntentRegistry` は `intents.json` のため意図的に workspace スコープ。「registry ロック」と「state file ロック」の分離は設計変更 |
| UNLOCKED な RMW をロックする | `amadeus-jump.ts:370→627`、`amadeus-bolt.ts:872→889`/`927→954`、`amadeus-utility.ts:5162→5244`/`5561→5578`、`amadeus-lib.ts:5843→5888` | 機械的だが、`amadeus-jump.ts` と `amadeus-bolt.ts` は現在ロックプリミティブを一切 import していない |

**テストによる pin:** reaper の steal 意味論（`t161`、`t163`、`t-reap-mutex`）、bucket 意味論（`t164`）、fail-closed acquire 契約（`t145`）、`AuditLockAcquireError` の形（`t380`、`t388`）。

### #1875

| 変更 | 位置 |
| --- | --- |
| 定義を 1 つ選び、全書き手を単一関数へ通す | `amadeus-lib.ts:5669`（`countCheckboxes`）／ `:5781`（`rebuildDerivedPlanFields`） |
| 定義 R の書き手を変換 | `amadeus-state.ts:1455, 2286, 2367, 2536, 2554, 3422`；`amadeus-jump.ts:564` |
| `handleScopeChange` の inline コピーを共有書き手へ畳む | `amadeus-utility.ts:5236-5239` |
| state 初期化 seed の整合 | `amadeus-utility.ts:4433, 4513, 4568` |
| approve 検証器を正準定義から読ませる | `amadeus-state.ts:3377` — 現状は**自分が書いたのと同じ定義で再計算**しており、乖離を検出することが構造的に不可能（repo `Forbidden` の検証劇場に該当） |

### テストによる定義の pin — R と E は直接矛盾している

*定義 R が pin されている箇所:*

- `tests/e2e/t52-workflow-state-progression.test.ts:118` — `expect(counter).toBe(completedCount(state));`。コメントは「Completed カウンタは `- [x]` の数と等しい — framework の中核 state-integrity 不変条件」
- `tests/e2e/t-tui-kiro-fix-scope.serial.test.ts:143` — `const xCount = (state.match(/^- \[x\]/gm) ?? []).length; expect(completedCount(sandbox)).toBe(xCount);`

*定義 E が pin されている箇所:*

- `tests/integration/t394-compose-state-resync.integration.test.ts:126-144` — テスト名「derived fields are recomputed, so no Completed > Total skew survives」。`expect(fieldOf(state,"Completed")).toBe(String(completedExecute.length))`（`completedExecute` は `r.suffix.startsWith("EXECUTE")` で絞る）に加え `expect(Completed).toBeLessThanOrEqual(Total Stages)`

その他の数値 pin: `tests/unit/t17.test.ts:234,268,324,331,387,825`；`t19.test.ts:442`；`t11.test.ts:324,630,773,798,832`；`t186-foreach-per-unit-iteration.test.ts:127`；`t211-swarm-batch-progress.test.ts:282`；`tests/integration/t256-state-intent-selector.test.ts:254`；`t224-state-set-failclosed.test.ts:168,170,245,252`。

> **`Completed` 定義のいかなる統一も、既存テストを最低 1 本は必ず壊す。** `[x]` 行が SKIP suffix を持つ場面で R と E は同時に成立しない。これは実装判断ではなく仕様判断であり、repo ノルム `cid:reverse-engineering:c1-pinned-behavior-ruling` により requirements / 裁定の管轄で、builder の管轄ではない。

## Bolt 並行性 — 2 パッチの衝突面

**ソースファイル、領域別:**

| ファイル | #1906 の領域 | #1875 の領域 | ソース重複 |
| --- | --- | --- | --- |
| `amadeus-lib.ts` | 6274–6390（bucket を取るなら +2289） | 5669、5781–5785 | **不交差**（約 490 行離れる）— #1906 が bucket 作業を取らない限り |
| `amadeus-state.ts` | 1079/1133、1159、1193、1237、1269、1444/1460、2341、3474、3634、4338、5157、5359、5466 | 1455–1456、2286–2287、2367–2368、2536、2554、3377、3422 | **`handleCheckbox` 1444–1460 を両者が触る。** 2341/2367、3422/3474 も数十行以内 |
| `amadeus-jump.ts` | 370→627（RMW をロックするなら） | 564–565 | **同一関数・行が重複** |
| `amadeus-utility.ts` | 5162→5244（同上） | 4433、5236–5239 | **`handleScopeChange` を両者が触る** |

**生成面により、いずれにせよ衝突する。** 両パッチとも完全な再生成を強制し、core tool ファイルはそれぞれ **12** 個のコミット済みコピーを持つ（`find` exit 0）:

- 7 つの `dist/` ツリー: `claude`、`codex`、`cursor`、`kimi`、`kiro`、`kiro-ide`、`opencode`
- repo root に存在する 5 つの self-install ツリー: `.claude/tools`、`.codex/tools`、`.cursor/tools`、`.opencode/tools`、`.kimi-code/tools`（`.kiro/tools` と `.kiro-ide/tools` は**存在しない** — dist 専用ハーネス）

> **推奨: 2 つの Bolt を直列化する**（あるいは隔離 worktree で走らせるが、マージ間に `git fetch` + rebase + 完全再生成を必須として順次着地させる。`cid:code-generation:base-advance-regrounding`）。`cid:code-generation:c6` により非交差判定は実ファイル目録で行う — ここではソース（`amadeus-state.ts:1444-1460`、`amadeus-jump.ts:564`、`handleScopeChange`）と生成面の両方で交差する。
>
> 並行が必要な場合の唯一の綺麗な分割は: **Bolt A = `amadeus-lib.ts` のロックプリミティブのみ**（`:6337-6356` + `:6274-6300` + `:6360-6361`）で bucket 統一と RMW ロックを後続へ繰り延べ、**Bolt B = #1875**。これで `amadeus-lib.ts` 内のソース hunk が約 490 行離れ、`amadeus-state.ts` / `amadeus-jump.ts` / `amadeus-utility.ts` は Bolt B の単独管轄になる。`amadeus-lib.ts` の 12 個の生成コピーは依然衝突する — 回避不能。

## dist / self-install の義務

`packages/framework/core/` を変更した後:

```
bun scripts/package.ts        # 7 つの dist/<harness>/ ツリーを再生成
bun run promote:self          # repo root の 5 self-install ツリーを再生成
```

`bun run dist:check` と `bun run promote:self:check`（ともに blocking）で検証する。

> `cid:build-and-test:bt-dist-regen-seven-harnesses`: 5 ハーネスだけ再生成すると `kiro`/`kiro-ide` が DIFFERS になり `dist:check` が落ちる。
> `cid:code-generation:c1-1569-shipped-comment-vocab`: `packages/framework/core/` のコメントへ `scripts/<file>` パストークンを持ち込まない — 全 dist コピーで `t258-boundary-guard` が落ちる。

## 引用の spot-check（Architect が observed SHA で独立実読、すべて exit 0）

| 引用 | 実読内容 |
| --- | --- |
| `amadeus-lib.ts:6274-6282` | `liveOwnerMayBeReaped` = `reapPolicy === "dead-or-over-age" && lockAcquireEpochMs() - owner.startedAtMs > lockStaleMs()` — 一致 |
| `amadeus-lib.ts:6294` | `if (lockAcquireEpochMs() - mtime <= unstampedGraceMs()) return false;` — 一致 |
| `amadeus-lib.ts:6344-6345` | `if (writeOwnerStamp(lockDir, key)) return true;` / `if (reapPolicy === "dead-or-over-age") return true;` — 一致 |
| `amadeus-lib.ts:5960-5966` | `auditLockIdentity` の `intent === undefined` → `${projectDir}\x00${WORKSPACE_LOCK_SENTINEL}` — 一致 |
| `amadeus-state.ts:3377` | `if (getField(content, "Completed") !== String(countCheckboxes(content, "completed"))) return "completed count";` — 一致 |
| `amadeus-audit.ts:429-433` | 分岐 B を "leaving the outer critical section running with no lock at all, silently" と記す既存コメント — 一致 |
| `amadeus-state.ts:1444-1460` | `withAuditLock(pd, () => {` … `}, resolvedIntent, space);`、内部で `countCheckboxes` → `setField(…,"Completed",…)` — 一致 |
| `amadeus-jump.ts:564-565` | `const completedCount = countCheckboxes(content, "completed");` / `content = setField(content, "Completed", String(completedCount));` — 一致 |
| `amadeus-lib.ts:5781-5784` | EXECUTE 実効 filter → `setField(next, "Completed", …)`、直前 `:5780` に `Total Stages = executeStages.length` — 一致 |

**引用の不一致は 0 件。** Developer scan の自己訂正（`withAuditLock` の bucket 引数は callback の **閉じ行**にあり、開き行の grep では bucket を誤分類する）を Architect も確認し、上表の bucket 分類はすべて閉じ行由来である。

## 明示的に未決 / 未実測（推測せずフラグする）

- **§ロック bucket の不一致が本 repo で実際に lost update を起こしたことがあるか** — code-derived のみ。再現には live record と 2 並行 CLI 起動が必要で repo state を変更するため未実施。
- **分岐 B が 10 分の既定値で本番到達可能か** — 構成上は到達可能でコードベース自身が文書化しているが、計測は `AMADEUS_LOCK_STALE_MS=1` でのみ行った。本番相当時間での計測はしていない。
- **この配備で `writeOwnerStamp` が実際に失敗しうるか**（決定的な分岐 A 経路の引き金）— 失敗の *帰結* は実証したが、*発生確率* は実証していない。想定原因は ENOSPC、共有 tmpdir での EACCES、EMFILE。未計測。
- **#1906 の修正の正確なスコープ** — `amadeus-lib.ts` のロックプリミティブに限るか、bucket 統一と RMW ロックを含むか。これが Bolt 並行性を決める計画判断であり、scan の所見ではない。
- **`resyncOneIntent` の UNLOCKED な RMW（`amadeus-lib.ts:5843→5888`）が本 intent のスコープか** — `Completed` を書く真の UNLOCKED state RMW でありどちらの Issue にも記載がない。両バグの交差点に位置し、`NSD003` の追跡対象関数でもある。

## Requirements Analysis へ送る裁定事項

1. **`Completed` の正準定義**（R / E / 第 3 案）。R と E は既存 e2e / integration テストで矛盾して pin されているため、いずれの裁定も既存テストの明示改訂を伴う。`cid:reverse-engineering:c1-pinned-behavior-ruling` により実装前に裁定を確定する。定義 G（state 初期化 seed）を選定定義と整合させるかも同時に決める。
2. **live PID の over-age reap を残すか除くか。** 残すなら heartbeat 機構（新規機構）、除くなら wedge holder の回復手段を別途定義する必要がある。`amadeus-audit.ts:429-433` は現行挙動を意図的と文書化しているため、除去は文書化済み設計判断の逆転にあたる。
3. **ロック bucket の統一と UNLOCKED な RMW のロック化を本 intent に含めるか、繰り延べるか。** 含める場合 `t164` の bucket 意味論 pin の改訂が必要で、`withLockedIntentRegistry` の workspace スコープを「registry ロック」と「state file ロック」へ分割する設計判断を伴う。`resyncOneIntent` の扱いも同じ裁定に含める。
4. **Bolt 直列化か、唯一の綺麗な並行分割か。** 生成面 12 コピーは分割しても衝突するため、並行化の実益は限定的である。
5. **NSD001 の対処方針**（付随裁定）。ロック catch ブロックへの編集は baseline 再 fingerprint を伴うため、各 catch に承認済み failure terminal を置くか、同一 PR で根拠付き baseline 更新を入れるかを実装前に決める。

## 更新成果物

- `business-overview.md`: 利用者影響、成功境界、スコープ境界、次段裁定
- `architecture.md`: 2 つの steal 分岐と不活性 CAS、heartbeat 不在、bucket 不整合、`Completed` 三定義と自己参照検証器、Interaction Diagrams + テキスト代替
- `code-structure.md`: ロックプリミティブ領域、`Completed` の書き手／読み手、UNLOCKED な RMW、12 生成コピー、テスト pin の配置
- `api-documentation.md`: `withAuditLock` の bucket 契約、env ノブ、`Completed` の CLI JSON / audit 行契約、`AuditLockAcquireError`
- `component-inventory.md`: 対象コンポーネントと health
- `technology-stack.md`: runtime、テスト、ゲート（NSD ゲート含む）、配布
- `dependencies.md`: source → guard → CI → distribution の依存方向と修正面の衝突
- `code-quality-assessment.md`: 強み、欠陥表、検証劇場、NSD001 リスク、推奨検証設計
- `reverse-engineering-timestamp.md`: 共有 freshness pointer
- `re-scans/260803-state-integrity.md`: 本 intent 固有の base/observed/focus/date、実測、次段裁定

直前の共有「現在」断面 `260802-registry-drift-guard` は 9 共有成果物で本文を削除せず「履歴」へ降格した。

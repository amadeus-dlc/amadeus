# Reverse Engineering スキャン所見(Developer)— 260710-p3-cleanup-batch5

> 手法: diff-refresh(cid:reverse-engineering:c1)。読み取り専用スキャン。git 状態変更なし。

## 実行メタデータ

- base SHA: `58f3453ad`(前回 batch4 RE の observed)
- observed SHA: `d8de2362b`(コード基準。origin/main の batch3/batch4 全着地点)
- 現 HEAD: `6279efe58`(`d8de2362b` の1コミット先。intent birth checkpoint のみ — フォーカスファイル無変更)
- 介在コミット数: 16(`58f3453ad..d8de2362b`)
- スキャン対象ブランチ: `intent/p3-cleanup-batch5`

### 介在16コミットのうちフォーカス領域に触れたもの

| commit | Issue | 触れたフォーカスファイル | 影響 |
|---|---|---|---|
| `d985bf892` | #751 | codex adapter | import(:56)と wrapContext(:190-204)のみ。mint/runCore 無関係 |
| `c34ccaba0` | #753 | kiro-ide adapter | import(:37)と buildForward(:178-203)のみ。mint(:88)/runCore(:232)無関係 |
| `3563d84c3` | #746 | amadeus-lib.ts | worktreeBaseDir 昇格・worktree.ts 読み側移行。**utility.ts(doctor)は未変更** |
| `7e38b08e1` | #758 | amadeus-lib.ts | stop-hook carve-out。audit lock 無関係 |

- kiro adapter / utility.ts / run-tests.ts / t92.test.ts / t76.test.ts は範囲内で**変更0**。
- 結論: **6件すべて現 main で未修正**(バッチ3/4 で偶発修正なし)。行番号は下記で現行値へ更新済み。

---

## 候補別の実測所見

### #811 — adapter inline mint が #755 分類器をバイパス(未修正・実在確認)

3アダプタとも `appendAuditEntry("HUMAN_TURN")` を**state 存在のみでゲート**し、機械注入ターン分類(`isMachineInjectedTurnText`)を通していない。

| 所在 | 起票主張 | 現行 file:line | 差分 |
|---|---|---|---|
| codex adapter `case "mint"` | :347-362 | **`:349-364`**(HUMAN_TURN 直呼びは `:357`) | +2 行シフト |
| codex adapter `rawInput` | :83 | `:83` | 変化なし |
| kiro adapter mint | :129-134 | **`:130-134`**(HUMAN_TURN `:132`) | ほぼ同一 |
| kiro-ide adapter mint | (未指定) | **`:84-94`**(HUMAN_TURN `:88`) | — |
| codex emit HOOK_WIRING | emit.ts :31 | `emit.ts:29-38`(`UserPromptSubmit → mint` は `:31`) | 変化なし |

- 対照(正しい実装): core `amadeus-mint-presence.ts`(場所は core/**tools** ではなく **`core/hooks/amadeus-mint-presence.ts`** — 起票時の path 記述に注意)。`:65` で `isMachineInjectedTurnText(prompt)` を呼び、機械注入ターンなら mint を抑止する。
- `isMachineInjectedTurnText` の定義・export: **`core/tools/amadeus-lib.ts:347`**(`export function`)。stop-hook(`amadeus-stop.ts:584,626`)も同関数を共用し #755 の tier-3 carve-out と分岐不一致にならない構造。**3アダプタはこの共有分類器を import すらしていない**(`grep -c isMachineInjected` = 3ファイルとも 0)。
- 実測コマンド: `grep -n 'appendAuditEntry|HUMAN_TURN|isMachineInjected' packages/framework/harness/{codex,kiro,kiro-ide}/hooks/amadeus-*-adapter.ts`、`grep -c isMachineInjected <3ファイル>` → 全 0。
- 修正済み判定: **未修正**。#751 の codex adapter 変更は wrapContext のみで mint case を touch せず。

### #822 — kiro 系 runCore の cwd 喪失(未修正・実在確認)

`runCore` が `Bun.spawnSync` に `cwd` を渡さず、spawn された core フックがアダプタプロセスの cwd を継承する(kiro が渡す `kiro.cwd` が伝播しない)。

| 所在 | 起票主張 | 現行 file:line | cwd の扱い |
|---|---|---|---|
| kiro adapter runCore | :378-385 | **`:378-385`**(spawnSync `:379`) | **cwd なし**(バグ) |
| kiro-ide adapter runCore | :233-239 | **`:232-239`**(spawnSync `:233`) | **cwd なし**(バグ) |
| codex adapter runCore(対照) | :162-169 | **`:162-169`**(spawnSync `:163`、`cwd: projectDir` `:167`) | **cwd を渡す(正しい側)** |
| kiro buildForward | :277-376 | **`:277-376`**(関数定義 `:277`) | `kiro.cwd ?? process.cwd()` を各ハンドラで解決するが runCore へは未伝播 |
| kiro-ide buildForward | :233-239相当 | **`:179` 起点**(#753 で改修済み領域) | 同上 |

- 差分: kiro/kiro-ide の runCore は `stdin/stdout/stderr` のみ指定で `cwd` フィールドが欠落。codex は `cwd: projectDir`(`:90` で `codex.cwd ?? process.cwd()` を解決)を渡す。3アダプタで唯一 codex だけが正しい。
- 実測コマンド: `sed -n '378,392p'`(kiro)/`sed -n '232,246p'`(kiro-ide)/`sed -n '162,176p'`(codex)。
- 修正済み判定: **未修正**。#753 の kiro-ide 変更は buildForward(:179-203)止まりで runCore(:232)に未到達。

### #830 — doctor Check1/Check3 が anchored base dir 非適用(未修正・行番号鮮度確認のみ)

※クロスレビュー2名 CONFIRMED 済み。行番号は起票時から**完全一致**。

| 所在 | 起票主張 | 現行 file:line | 実測 |
|---|---|---|---|
| Check 1 生 join | :831 | **`:831`** | `const worktreesDir = join(projectDir, ".amadeus", "worktrees");`(生 join) |
| Check 2 worktreePath | :960 | **`:960`** | `const wtDir = worktreePath(projectDir, slug);`(anchored、正しい側) |
| Check 3 生 join | :998 | **`:998`** | `const worktreesDir = join(projectDir, ".amadeus", "worktrees");`(生 join) |
| lib `worktreeBaseDir` | :1981 | **`:1981`** | `export function`。`resolveWorktreeBaseDir(...)` へ委譲 |
| lib `worktreePath` | :1989 | **`:1989`** | `export function` |

- 因果: **#830 は #746 の伝播漏れの直接残渣**。#746(`3563d84c3`)は lib に `worktreeBaseDir` を新設し `amadeus-worktree.ts` の読み側を移行したが、**`amadeus-utility.ts`(doctor)は touch していない**(`git show 3563d84c3 -- amadeus-utility.ts` = 空)。Check 1/3 は生 join のまま取り残された。cid:code-generation:same-root-inventory(同根パターンの全数棚卸し)の実例。
- 実測コマンド: `grep -n 'worktreeBaseDir|worktreePath|join(' amadeus-utility.ts`、`git show 3563d84c3 --stat`、`sed -n '829,833p'/'996,1000p'`。
- 修正済み判定: **未修正**。

### #730 — bun lcov の関数内コメント/空白行 DA:0(未修正・merge 経路特定)

決定的再現レシピ(e4 実測: mod.ts+load-only.test.ts の単独プロセス実行で全行 DA:0 → 外部 lcov merge union で false-red 合成)が刺さる箇所を特定。

- ファイルは **`tests/run-tests.ts`**(起票主張と一致。テストインフラ側で `packages/framework` 配下ではない → **dist/self-install 同期不要**)。
- `normalizeCoverageReport`: 起票主張 :509 → 現行 **`:509`**(変化なし)。
- **union/merge の核心 = `:534`**:
  ```
  current.lines.set(lineNo, (current.lines.get(lineNo) ?? 0) + count);
  ```
  DA 行を(file,line)キーで**加算合成**する。ロードのみチャンクが in-body コメント/空白行を `DA:N,0` で stamp し、実行チャンクは当該行に正 count を与えないため、`0 + 0 = 0` が恒久化 → LH から漏れて false-red。
- チャンク結合の呼び出し元 = `combineCoverageReports`(**`:674`**)。各 per-file lcov を `chunks.join("\n")`(**`:689`**)で連結し `normalizeCoverageReport` へ渡す。ここが「外部 lcov merge union」の実体。単一プロセスでは1チャンクのみで union が起きないため再現しない、というレシピの説明と整合。
- #772 リマップの現在形: `normalizeCoverageSourcePath(source, COVERAGE_SOURCE_PATH_CONTEXT)`(`:519`、context は `:61`)。SF 行ごとにソースパスを正規化。DA:0 問題とは独立。
- 実測コマンド: `grep -n 'normalizeCoverageReport|DA:|merge|union' tests/run-tests.ts`、`sed -n '509,575p'`、`sed -n '674,695p'`。
- 修正済み判定: **未修正**。範囲内で run-tests.ts 変更0。
- 補足: cid:code-generation:bun-inbody-comment-da0(説明コメントをモジュールスコープへ退避)は**発生源コード側の回避策**。#730 の本丸は「計測不能行の false-red を merge/normalize 経路で loud 検出 or 除外する」設計であり、`:534` の union が是正の焦点。

### #819 — t92 case 15 並列フレーク(未修正・spawn 経路特定)

- ファイル `tests/integration/t92.test.ts`。case 15 = **`test("15: linter — failing TS (no-unused-vars error) -> Findings count=1")` `:661-663`**(bun-test timeout 60000ms 指定)。
- 本体 `runFailedTsReal`(`:610-637`)→ `fire`(`:327-333`)→ `spawnSync(BUN, [SENSOR_TS, "fire", ...])` で **amadeus-sensor.ts を実プロセス spawn → その先で実 eslint バイナリを spawn**(manifest `timeout_seconds=30`)。
- フレーク機序(Findings 1→0): **非ヘルメティックな実 eslint spawn**。full-suite 並列負荷下で eslint が(a)timeout で打ち切られ tool-unavailable→0 findings、(b)リソース競合で空結果、のいずれかに落ち、期待 Findings=1 に対し 0 を返しうる。`fire` は child_process 側 timeout を指定せず、sensor manifest の timeout_seconds と bun-test の 60000ms 上限に依存。
- 実測コマンド: `grep -n 'case 15|Findings|runFailedTsReal|fire' t92.test.ts`、`sed -n '571,665p'`、`sed -n '/function fire/,/^}/p'`。
- 修正済み判定: **未修正**。

### #831 — t76 test 12 並列フレーク(未修正・ロックパス構成要素を特定)

- ファイル `tests/unit/t76.test.ts`。test 12 = **`test("12: merge audit-lock timeout — slug-tagged failure, no partial state write")` `:626-654`**(起票主張 :647 = ロック stamp 書き込み行 `:645`。宣言は :626)。
- テスト構造: `auditLockDir(proj, DEFAULT_RECORD_DIR, DEFAULT_SPACE)`(`:641`)へ lock dir を先行作成し、`owner.json` を**テストランナー自 PID + fresh startedAtMs** で stamp(`:644-645`)。reaper が live+fresh を reap 拒否 → merge の lock 取得が retry 予算を使い切って失敗する、という期待。
- **ロックパス構成要素(仮説検証材料)**:
  - `auditLockDir`(lib `:2798`): `join(tmpdir(), '.amadeus-audit-<md5(identity)[:8]>.lock')`。
  - `auditLockIdentity`(lib、`:2790` 付近): `` `${projectDir}\x00${space}\x00${intent}` `` — **PID を含まない**。区切りは NUL(`\x00`、#786 と同系)。
  - つまり **ロックパスはプロセス依存の PID を含まず、(proj, space, intent) で決定的**。tmpdir() は `TMPDIR` env 由来で兄弟プロセス間で同値。→ 仮説「パスに PID/プロセス依存値が入って観測されない」は**反証**。テストと merge サブプロセスは同一 lockDir を算出するはず。
  - **観測されない divergence の実候補**: `intent` 成分は merge 時に active-intent cursor から解決される(コメント `:637-639` が「per-intent bucket = active-intent cursor → DEFAULT_RECORD_DIR」と明記)。並列負荷下で cursor 解決がテスト前提の DEFAULT_RECORD_DIR と食い違えば merge は別 bucket の lockDir を算出し、植えたロックを観測せず merge 成功 → 期待 failure に対しフレーク。これが「テストが植えたロックが観測されない」の最有力機序。
  - もう一つの候補: reaper の staleness/liveness 判定。`ownerAlive`(lib `:2851`)は `process.kill(owner.pid, 0)`(ESRCH→dead、EPERM→alive 扱い)。staleness は `lockAcquireEpochMs()`(`performance.timeOrigin + performance.now()`、lib `:2845`)と `owner.startedAtMs` の差 > `lockStaleMs()`(default `DEFAULT_LOCK_STALE_MS = 10*60*1000`、env `AMADEUS_LOCK_STALE_MS` で上書き可、`:2775-2783`)。テストは自 PID(生存)+ fresh stamp(10分閾値内)で植えるため通常は reap 拒否されるが、**cross-process の `performance.timeOrigin` の epoch 家系が完全一致する前提**(コメント `:2841-2844`)に依存する点は timing 脆弱性の材料。
  - retry 予算: `acquireAuditLock(projectDir, 50, 100, intent, space)`(lib `:3135`)= 50×100ms = **~5s**(テストコメント「~5s budget」と一致)。
- 実測コマンド: `sed -n '626,654p' t76.test.ts`、`sed -n '/export function auditLockDir/,/^}/p'`・`/auditLockIdentity/`・`/function ownerAlive/` in lib、`grep -n 'AMADEUS_LOCK_STALE_MS|acquireAuditLock|lockAcquireEpochMs'`。
- 修正済み判定: **未修正**。範囲内で t76.test.ts・audit lock 実装とも変更0。

---

## #741 決定化手法の要約(#819/#831 への適用可能性)

**#741(`fd4009671`)がやったこと**: t90 test 13 が emit/suppress の判定を**実時計(wallclock)順序 + 2秒 sleep + 秒精度の "now"**に結合していた。emit/suppress 境界(emit-timestamp ≥ completed_at)が「実時間マージンが秒切り捨てを生き延びるか」に依存し、full-suite 並列負荷でスケジューリング異常がマージンを圧縮すると境界が反転し count 1 vs 2 のフレークになった。**プロダクトの計数ロジック(amadeus-runtime.ts)は正しく、テストだけが非決定的**。修正は「順序に効く全タイムスタンプを**明示的な固定定数**へ置換」— 先行 MEMORY_EMPTY を 10:05、再承認 completed_at を 10:10 に seed し、fresh emit は live-now(10:10 の遥か先)に落ちる。これで emit(10:05<10:10)も suppression(live≥10:10)も固定値で決まり、2つの sleep も除去。

**適用可能性**:
- **#831(強)**: フレークが staleness/timing マージン由来なら #741 パターンが直接効く。owner stamp の `startedAtMs` を**明示定数(far-past だが 10分閾値内、あるいは `AMADEUS_LOCK_STALE_MS` を env で明示固定)**にし、cross-process `performance.timeOrigin` 依存の実時間マージンをテストから排除する。ただし本命機序が「intent 解決 divergence(別 lockDir)」なら #741 の定数化では不足で、cursor 解決を決定化する(テストが merge の解決する intent bucket を明示 pin する)方向が必要。両機序の切り分けが修正設計の前提。
- **#819(部分)**: フレークが**外部プロセス(実 eslint)の並列競合**由来で、テスト内部の wallclock 結合ではない。#741 の「定数 seed」は直接には当たらない。適用できるのは上位の教訓「アサーションを実時間・実ツール競合から切り離す」— 具体的には eslint spawn の hermetic 化(結果を固定 fixture 化 / スタブ経路へ寄せる)、または実 eslint を保つなら競合非依存の隔離(timeout 余裕は既に 60s、直交リソース分離)。#741 のような単純な定数置換では閉包しない可能性が高い。

---

スキャン完了: 2026-07-10T23:08:29Z

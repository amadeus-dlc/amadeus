# RE 差分リフレッシュ記録: 260801-kimi-bootstrap-deadlock

上流入力(consumes 全数): なし(RE は起点ステージ。入力は intent-statement と Issue #1922)

- Date: `2026-08-01T12:15:00Z`
- Base commit: `c49e385ac7b787ce151ab0f077943620bd8bf7e2`(observed の祖先、`git merge-base --is-ancestor c49e385ac HEAD` exit 0)
- Observed commit: `861688c31fd08cc0068318d71b0d5c5a87153b57`(origin/main tip `d9f68e13c` とコード同一 + intent-record 1件 `record: birth intent 260801-kimi-bootstrap-deadlock (self-fix, #1922)`)
- Distance: `33 commits`
- 区間規模: `537 files changed, 28879 insertions(+), 3094 deletions(-)` — 大半は otel 基盤拡張(resource-core / span-context / exception イベント / metrics 語彙配線)、mirror 系(boundary 対称性・title バイトクランプ)、plugin scope opt-in、composed-scope drop、metrics snapshot 定期コミット群
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal
- Scan mode: **differential refresh**。base 候補検証は re-scans/ の observed を新しい順に確認し 260801-open-bug-batch-5 の `c49e385ac` を採用(260731-perf-ci-separation `da51af375`、260731-open-bug-batch-4 `6e7a9d701` はより古い)。Developer scan の結果を conductor が observed HEAD で全 file:line 再実測して二重化(下記「引用再確認」)

## 対象バグ(#1922)の患部確定(全引用 = observed `861688c31` で検証済み)

### kimi ハーネス bootstrap デッドロック

アクティブ intent 無しのワークスペースで kimi harness を起動すると、`.current-session` が永久に書かれず main conductor 認可が恒久 fail-closed となり初回起動がデッドロックする。

**デッドロック連鎖**

1. Kimi SessionStart → `~/.kimi-code/config.toml` 管理ブロック → `bun .kimi-code/hooks/amadeus-kimi-adapter.ts session-start`
2. adapter 内部で `trackKimiRoleLifecycle`(`packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts:418-437`)の `"session-start"` case が `establishKimiMainBaseline`(`:236-`)経由で `kimi-active-subagents.json` を書く(state-file 非依存で常に走る)。`routeTarget`(`:580-`)の `"session-start"` case(`:588-596`)が `normalizePayload`(`:491-500`)経由で core `amadeus-session-start.ts` を spawn(dispatch 点 `:693-694`)
3. core hook: `packages/framework/core/hooks/amadeus-session-start.ts:67` `stateFilePath` → `:70` `if (!existsSync(stateFile)) process.exit(0)` で終了 → `:117` `if (sessionId) writeCurrentSessionId(projectDir, sessionId)` は `:70` より後で到達不能。`writeCurrentSessionId` 定義 `amadeus-lib.ts:2170-2178`、`CURRENT_SESSION_FILE` `:2152`。ガード前段配置の先例は `repointHarnessIncludes`(`:62`、理由コメント `:55-60`)
4. 認可 fail-closed: `amadeus-caller-authorization.ts` `authorizeMainConductor` — `:75` 非 kimi 即 authorized、`:80-86` deny latch、`:88-94` marker 読めず denied、`:96-109` `.current-session` ≠ `mainSessionId` → denied "unknown"。bootstrap 状態では `.current-session` が永久に書かれないため、(2) の baseline marker が存在しても認可は恒久 fail-closed = デッドロック。呼出側 `amadeus-orchestrate.ts:2190` / `amadeus-state.ts:869`
5. `isTrustedMainStop`(`amadeus-kimi-lib.ts:372-407`、`.current-session` 直読み `:399-403`)も同じ fail-closed

**`.current-session` writers/readers**

- Writer: `amadeus-session-start.ts:117` のみ(全 repo で唯一)
- Readers: `amadeus-caller-authorization.ts:96-109`(直読み)、`amadeus-kimi-lib.ts:399-403`(直読み)、`readCurrentSessionId`(`amadeus-lib.ts:2159-2166`)経由 `amadeus-orchestrate.ts:230` / `amadeus-state.ts:853` / `amadeus-utility.ts:4843`

**最小修正方向**: `writeCurrentSessionId`(`:117`)を `:70` ガードより前へ移す。`supplyResourceAttribute`(`:119-130`、区間で入った otel seam)を一緒に動かすかは別論点(otel 属性は audit 経路)。直読み2箇所を `readCurrentSessionId` に寄せるリファクタはスコープ外。

### 区間 touch 判定(患部 × `c49e385ac..HEAD`)

- `amadeus-session-start.ts` — +14(`supplyResourceAttribute("session.id", …)` の otel resource seam 配線のみ、HEAD `:119-130`)。early-exit ガード(`:70`)と `writeCurrentSessionId`(`:117`)の順序は不変 — **#1922 の機序は observed HEAD に生存**
- `amadeus-caller-authorization.ts` — 無変更
- `amadeus-lib.ts` — +202 は `:5372` 一塊(countCheckboxes 領域)。`.current-session` 領域(`:2144-2178`)と `stateFilePath`(`:3406-3410`)は無変更
- `packages/framework/harness/kimi/` — 無変更。`.kimi-code/` と `dist/` は生成物(`bun scripts/package.ts` 再生成領域、手編集禁止)
- テスト: 患部直下の新規テストなし

## 近傍テスト(修正の足場)

- `tests/unit/t10-hook-session-start.test.ts` — `:211` / `:222` が `:70` early-exit(no state file で silent exit / no heartbeat)を直接固定。回帰テスト追加先の自然な場所で、現行 pin の改訂を伴う(`cid:reverse-engineering:c1-pinned-behavior-ruling` に従い要件段で宣言)
- `tests/integration/t-kimi-adapter.test.ts:317` 付近、t365-kimi-reviewer-boundary(`.current-session` を `:826` / `:958` / `:1199` / `:1884` で使用)、t173-session-switch-restamp
- `amadeus-caller-authorization.ts` 専用の単体テストファイルは無し

## 引用再確認の結果(conductor が observed `861688c31` で再実測)

| 対象 | Developer 報告 | 再実測 | 判定 |
| --- | --- | --- | --- |
| observed / base 祖先性 | `861688c31` / `c49e385ac` 祖先 | `git rev-parse HEAD` = `861688c31fd08cc0068318d71b0d5c5a87153b57`、`--is-ancestor` exit 0 | 一致 |
| Distance / 区間規模 | — | `git rev-list --count` = **33**、`git diff --shortstat` = `537 files / +28879 / −3094`(報告の −3,064 は typo、正しくは −3,094) | 実質一致・精密化 |
| ガード / writer | `:70` / `:117` | `amadeus-session-start.ts:70` `if (!existsSync(stateFile)) process.exit(0);` / `:117` `if (sessionId) writeCurrentSessionId(projectDir, sessionId);` | **完全一致** |
| otel seam | `:119-130` | コメント `:119-123` + `if (sessionId) { try { supplyResourceAttribute(...) } catch }` `:124-130` | **完全一致** |
| `stateFilePath` 呼出 | `:67` | `:67` `const stateFile = stateFilePath(projectDir);` | **完全一致** |
| ガード前段先例 | `:61-65` | `repointHarnessIncludes` 呼出 `:62`、理由コメント `:55-60` | 一致(精密化) |
| lib 定義 | `writeCurrentSessionId :2170-2178` / `CURRENT_SESSION_FILE :2152` | `:2170` / `:2152`(`readCurrentSessionId :2159`) | **完全一致** |
| 認可 | `:75` / `:80-86` / `:88-94` / `:96-109` | `amadeus-caller-authorization.ts:75` 非 kimi return、deny latch `:80-86`、marker parse `:88-94`、`.current-session` 比較 `:96-109` | **完全一致** |
| 認可呼出側 | orchestrate `:2190-2192` / state `:869-872` | `amadeus-orchestrate.ts:2190` / `amadeus-state.ts:869` | 一致 |
| `isTrustedMainStop` | `:372-407`、直読み `:399-403` | 宣言 `:372`、`.current-session` readFileSync `:399-403` | **完全一致** |
| kimi adapter 内部 | `trackKimiRoleLifecycle :418-437` / `establishKimiMainBaseline :236-` / `routeTarget :580-` / case `:588-596` / `normalizePayload :491-500` | `:418` / `:236` / `:580` / `:588` / `:491` | **完全一致** |
| readers 3箇所 | orchestrate `:230` / state `:853` / utility `:4843` | 同一行で `readCurrentSessionId(pd)` / 同 / 同 | **完全一致** |
| t10 pin | `:211` / `:222` | `:211` `silent exit (no stdout) when no state file` / `:222` `no heartbeat when no state file` | **完全一致** |
| writer 唯一性 | 全 repo で唯一 | `grep -rn 'writeCurrentSessionId(' packages/framework` — 呼出は `amadeus-session-start.ts:117` のみ(定義・import 除く) | **完全一致** |

**総括**: Developer 報告の所在・機序・結論は全件一致。相違は shortstat の deletions 表記(−3,064 → −3,094)と先例コメント行範囲の精密化(:61-65 → :55-60+`:62`)のみで、修正方針に影響しない。

## 要件段へ送る裁定事項

1. **t10 pin 改訂の宣言**: `writeCurrentSessionId` をガード前段へ移すと no-state-file でも `.current-session` が書かれるようになり、現行の silent-exit 前提 pin(`t10:211` / `:222`)のどこまでが不変か(heartbeat は依然書かれない)を要件で固定する
2. **`supplyResourceAttribute`(`:119-130`)の扱い**: `writeCurrentSessionId` と一緒にガード前段へ動かすか、後段に残すか(otel 属性は audit 経路のため bootstrap 状態では emit されず、動かす実益は薄い — 判断は要件段)

## 更新した成果物

実質更新3件 = `architecture.md`(#1922 機構断面: デッドロック連鎖 + `.current-session` writer/reader + 最小修正方向)、`code-structure.md`(患部配置と区間 touch 判定)、`code-quality-assessment.md`(テスト空白の記録 — no-state-file SessionStart → `.current-session` 書込みを検証するテスト不在、t10 `:211` / `:222` が現行 early-exit を pin)。判断1行のみ5件 = `business-overview.md` / `api-documentation.md` / `component-inventory.md` / `technology-stack.md` / `dependencies.md`。加えて `reverse-engineering-timestamp.md` と本ファイル。

直前の現在断面 `260801-open-bug-batch-5`(observed `c49e385ac`)は全成果物で履歴へ全文保存のまま降格した(`cid:reverse-engineering:c3-relabel`)。履歴節の file:line は当時の observed 時点を指すため一切変更していない(`cid:requirements-analysis:historical-section-cite-check-at-observed`)。

**(c) 旧「現在」マーカーの降格確認** — `grep -rn '、現在、' amadeus/spaces/default/codekb/amadeus/*.md` を実行し、H2 見出しに現れる残存ヒットが本 intent `260801-kimi-bootstrap-deadlock` の **8 節のみ**(8 成果物各 `:3`)であることを機械確認した。`reverse-engineering-timestamp.md` は `:3` が `（現在: 260801-kimi-bootstrap-deadlock）`、旧 `:15` が `（履歴: 260801-open-bug-batch-5）` へ降格済み。前 intent `260801-open-bug-batch-5` の H2 は 8 成果物すべて「、履歴、」へ降格済み(`cid:reverse-engineering:c3-relabel`)。見出し以外の残存ヒット(`reverse-engineering-timestamp.md:305` / `:340` / `:372`)はいずれもこの grep パターン自体を引用する履歴節の散文であり降格対象ではない(先例: `re-scans/260726-crossreviewed-bug-batch.md` の同旨注記)。

# Developer Code Scan — 260726-mirror-state-split(#1547 + #1534)

## 1. 差分区間実測サマリ

Base `1673c4332` → Observed(HEAD)`f9a0fb86a`。

- `git diff --shortstat`: **1225 files changed, 215089 insertions(+), 2682 deletions(-)**
- 面別内訳(`git diff --name-only` からの grep 転記):

| 面 | 件数 |
|---|---|
| record(`amadeus/`) | 333 |
| 実装正本(`packages/framework/core/`) | 15 |
| harness 正本(`packages/framework/harness/`) | 12 |
| dist(`dist/`) | 389 |
| tests(`tests/`) | 86 |
| docs(`docs/`) | 10 |
| self-install(`.claude/`) | 15 |
| その他 | 359(`.kimi-code` 286 / `.opencode` 17 / `.codex` 16 / `.cursor` 15 / `metrics` 12 / `scripts` 7 / `.agmsg-ballots` 3 / 他 3) |

区間内で **mirror 正本(`packages/framework/core/tools/`)が触られたのは `amadeus-mirror-gateway.ts` 1ファイルのみ**(`+75/-39` = #1537 mirror envelope bare-LF 修正)。本 intent の欠陥面(`amadeus-mirror.ts`・lifecycle スタック・`amadeus-orchestrate.ts`)は区間内未変更 — 分裂は区間より前から現存。

## 2. パッケージ・モジュール構造(mirror スタック中心・責務表)

正本 `packages/framework/core/tools/` の mirror 群 全16モジュール(9300行)。

| モジュール | 行数 | 責務 |
|---|---|---|
| `amadeus-mirror.ts` | 587 | CLI 層。create/sync/close/status パース、buildSnapshot(legacy field 読取)、status 比較、main ディスパッチ |
| `amadeus-mirror-lifecycle.ts` | 1027 | lifecycle 境界オーケストレーション、repair relink |
| `amadeus-mirror-executor.ts` | 1223 | operation 実行、mutateMirrorStateAtomic 呼出(v1 write 実行者) |
| `amadeus-mirror-coordinator.ts` | 717 | transition 調停・境界判定 |
| `amadeus-mirror-state-store.ts` | 428 | v1 ブロック read/atomic write |
| `amadeus-mirror-state-codec.ts` | 1526 | v1 ブロック sentinel encode/parse、スキーマ検証 |
| `amadeus-mirror-state-reducer.ts` | 733 | snapshot × transition → 次 snapshot 純 reduce |
| `amadeus-mirror-provenance.ts` | 246 | ownership marker render/parse、verifyOwnership、候補分類 |
| `amadeus-mirror-gateway.ts` | 760 | gh 呼出境界 ※区間内変更 |
| `amadeus-mirror-presentation.ts` | 312 | 出力レンダ、legacy help |
| `amadeus-mirror-repair.ts` | 307 | repair CLI/計画 |
| `amadeus-mirror-config.ts` | 411 | mirror 設定解決 |
| `amadeus-mirror-types.ts` | 403 | 型 |
| `amadeus-mirror-runner.ts` | 306 | ランナー配線 |
| `amadeus-mirror-policy.ts` | 226 | ポリシー判定 |
| `amadeus-mirror-capability.ts` | 88 | gh capability プローブ |

## 3. v1 ブロックの write / read 経路

**Write(唯一):** lifecycle → executor → state-store。
- `amadeus-mirror-executor.ts:71` `mutateMirrorStateAtomic(ports, {...})`
- `amadeus-mirror-lifecycle.ts:629` `return mutateMirrorStateAtomic(target.ports, {...})`
- `amadeus-mirror-state-store.ts:158` `export function mutateMirrorStateAtomic(...)` → `writeMirrorStateDocument(doc, block, ...)`(:216/:252/:277)
- sentinel: `amadeus-mirror-state-codec.ts:38-39` `MIRROR_STATE_SENTINEL_START = "<!-- amadeus:mirror-state:v1:start -->"` / `..._END = "<!-- amadeus:mirror-state:v1:end -->"`。snapshot 型 `issueNumber: number | null`(`amadeus-mirror-types.ts:176`)。

**Read(v1 を読むのは lifecycle スタック内のみ):**
- `amadeus-mirror-state-store.ts:91` `readMirrorState` → `parseMirrorStateDocument(doc)`
- `amadeus-mirror-state-codec.ts:1301` `parseMirrorStateDocument` → :1302 `allIndexesOf(document, MIRROR_STATE_SENTINEL_START)`

CLI 実行時、create/sync/close は `main`(:582 `runLegacyMutation`)→ lifecycle 経由でこの **v1 ブロックのみ**を永続化。legacy「Mirror Issue」field は書かれない。

## 4. legacy「Mirror Issue」field の read/write 経路(独立 grep で全数再列挙)

**Writer(唯一・CLI 実行時不到達):**
- `amadeus-mirror.ts:363` `function writeMirrorIssueField(...)` → :370 `setOrInsertField(content, "## Project Information", "Mirror Issue", ...)`。呼び手は :413（`handleCreate` 内、main 不到達）のみ。

**Reader(3箇所、v1 ブロック非参照):**
1. `amadeus-mirror.ts:169` `const mirrorRaw = getField(stateContent, "Mirror Issue")`(buildSnapshot → status）。:188 で mirrorIssue 決定。
2. `amadeus-orchestrate.ts:314` `const hasMirrorIssue = (getField(stateContent, "Mirror Issue") ?? "").trim().length > 0`(boundary auto-sync/suppress 第1読み手)
3. `amadeus-orchestrate.ts:3522` 同型(boundary report 経路 第2読み手)

**→ #1547 根因(write⇔read 非対称):** write は v1 ブロック、read(status + orchestrate ×2)は legacy field。lifecycle create 後も status/orchestrate は「field 無し」=`mirror-missing`（`amadeus-mirror.ts:249-258` `compareMirrorStatus(snapshot, null)`）を報告。

## 5. legacy CLI 経路の孤立(dead code)

- `main`(:570-585)は `args.kind !== "status"` をすべて `runLegacyMutation`(:582)へ、`status` のみ `handleStatus`(:584)へ。
- `handleCreate`(:379)/`handleSync`(:425)/`handleClose`(:450)は main 不到達。参照元は t232 のみ。
- 命名衝突注意: `amadeus-worktree.ts:249` / t245 の `handleCreate` は別物。
- `runLegacyMutation`(:533-565)は名称に反し v1 lifecycle(`runMirrorLifecycleBoundary`)を呼ぶ。成功時 :562 `outcome.issueNumber` を echo するのみで state に可視 field を残さない。

## 6. #1534 の構造(legacy 生成 Issue の in-tool 復旧不能)

- repair relink は marker 必須: `amadeus-mirror-lifecycle.ts:783` `runRepairRelink` → :788 `parseMirrorMarker(viewed.value.body)` → :789-793 `if (marker.kind !== "parsed") return { kind: "error", message: "Repair relink requires one valid ownership marker." }`。
- marker 唯一の書き手: `amadeus-mirror-provenance.ts:47` `renderMirrorMarker(identity)`。legacy 経路は marker を書かない。
- `verifyOwnership`(`amadeus-mirror-provenance.ts:149`)も :164-165 `if (marker.kind === "missing") return { kind: "missing-marker", ... }`。
- **→ marker 無き legacy Issue は relink/adopt とも fail-closed、in-tool 復旧経路ゼロ。**

## 7. API・CLI 契約(mirror verb 群)

`amadeus-mirror.ts` CLI(:57 `parseArgs`):
- verb: `create | sync | close | status`(:59)。create/sync/close は `--instance <id>` 必須(:90-92)、status は `--instance` 禁止(:85-88)。全 verb `--intent <dir>` 任意。
- exit: mutating 0/1/2(成功/runtime fault/usage、:9-11)。status 0/1/2(clean/divergence/precondition|usage、`exitOfStatus` :282-286）。
- status findings: `stale-status-line | mirror-missing | issue-drifted`(:230-233)。
- DI シーム: `main(argv, projectDir, run: GhRunner, runLifecycle)`(:570-575)。mutating は runLifecycle のみ、legacy gh runner は read-only status 限定(:567-569）。

## 8. テストカバレッジ状況(不在テストの明示)

mirror テスト31ファイル存在。しかし **write⇔read 非対称を貫通する e2e が構造的に不在**:
- **real-create → status e2e が無い。** t232 C6 dispatch test(:245-307)は lifecycle を stub 化(:254-274 `const lifecycle = async (...) => ({ ... issueNumber: 1161 })`)し、1:1 委譲と gh.calls 空のみ assert。実 lifecycle は走らない。
- **status test は legacy field を直接シード。** `makeWorkspace`(:33-)は :61 `...(over.mirrorIssue ? [\`- **Mirror Issue**: ${over.mirrorIssue}\`] : [])` で legacy field を書く。v1 ブロックは書かない。status test(:333-428)は全て `makeWorkspace({ mirrorIssue: "#1161" })` 起点。
- 結果: 「lifecycle create が永続化した v1 ブロックを status が読めるか」を検証するテストが不在。create(stub)と status(legacy seed)が別世界で閉じ、非対称が全スイートで不可視。#1547 がこの盲点を通過。
- t278/t279/t274/t275 は v1 経路を単体で緑にするが CLI status の legacy 読取と非接続。t283/t284 は marker 前提 relink を扱うが marker 欠落 legacy Issue の復旧経路は未実装。

## 9. 技術的負債シグナル

- write⇔read 非対称(symmetric-pair-review 該当): v1 ブロック(write)と legacy field(read)の分裂。
- dead code: handleCreate/handleSync/handleClose/writeMirrorIssueField が export・被テストのまま main 不到達。テストが dead path を緑に保ち生きた path の欠陥を隠す。
- 命名 misdirection: `runLegacyMutation` が実は v1 lifecycle を呼ぶ。
- orchestrate 側同型読取2箇所(:314/:3522）。CLI status のみ直しても境界判定が非対称のまま残る（同根全数棚卸し対象）。
- legacy record 資産: legacy 生成 10 intent が field-only・marker 無しで in-tool 復旧不能(#1534)。互換フォールバックは org.md Forbidden(要求なき互換シム禁止)と要件段で照合すべき論点。

## 10. 区間内の関連変更履歴

- `amadeus-mirror-gateway.ts` `+75/-39`（区間内唯一の mirror 正本変更 = #1537 envelope bare-LF 修正）。状態表現分裂の write/read 経路は未変更。
- record `260726-mirror-envelope-lf` と re-scan `260726-mirror-envelope-lf.md` が区間内着地。
- 直近コミット `f9a0fb86a merge origin/main into fix/plugin (pick up mirror envelope fix #1537)`。

## Architect 合成への引き継ぎ要点

修正の核は §4 read 経路3箇所(status 1 + orchestrate 2)を v1 ブロック(§3)権威へ寄せる write⇔read 統一。§5 dead legacy 群の扱い、§8 real-create→status e2e 新設(regression-first)、§6 legacy 10 record 復旧経路(marker 無き Issue の in-tool adopt/relink 設計)が設計判断点。互換フォールバックの是非は org.md Forbidden 照合でユーザー裁定寄り。

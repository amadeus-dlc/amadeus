# re-scan: 260726-mirror-state-split

上流入力（consumes 全数）: Developer スキャン結果 `amadeus/spaces/default/intents/260726-mirror-state-split/inception/reverse-engineering/scan-notes.md`

## スキャン諸元

| 項目 | 値 |
| --- | --- |
| intent | `260726-mirror-state-split`（[Issue #1547](https://github.com/amadeus-dlc/amadeus/issues/1547) + [Issue #1534](https://github.com/amadeus-dlc/amadeus/issues/1534)） |
| Scope | `amadeus-bugfix`、Brownfield、単一 repo `amadeus` |
| Base commit | `1673c433209c74820881c75a0816bbce3fb2d512`（前々 intent `260726-crossreviewed-bug-batch` の observed） |
| 祖先性 | `git merge-base --is-ancestor 1673c4332 HEAD` **exit 0**、`git rev-list --count 1673c4332..HEAD` = **38**（cid:reverse-engineering:rescan-base-ancestry） |
| Observed commit | `f9a0fb86abaa2450d559cd04b4ee889d2271fd71`（= 現 HEAD、`git rev-parse HEAD` 実測） |
| 区間規模 | `git diff --shortstat 1673c4332 HEAD` = **1225 files changed, 215089 insertions(+), 2682 deletions(-)** |
| 面別内訳 | record 333 / 実装正本 15 / harness 正本 12 / dist 389 / tests 86 / docs 10 / self-install 15 / その他 359（`git diff --name-only … \| grep -c` 出力） |
| 患部の区間変更 | mirror スタック 8 モジュール（`amadeus-mirror.ts` / `amadeus-mirror-lifecycle.ts` / `-executor` / `-state-store` / `-state-codec` / `-provenance` / `-coordinator` / `-state-reducer`）いずれも `git log --oneline 1673c4332..HEAD -- <path>` = **0 行** |
| 方式 | 差分リフレッシュ（フルスキャン不実施、cid:reverse-engineering:c1） |

## 欠陥の要旨（write⇔read 状態表現分裂）

mirror の Issue 番号を永続化する経路が **2 系統に分裂**し、書き手と読み手が別の表現を使っている（対操作の非対称、cid:requirements-analysis:symmetric-pair-review）。

- **Write（唯一）**: lifecycle → executor → state-store が **v1 sentinel ブロック**（`<!-- amadeus:mirror-state:v1:start --> … :end -->`）だけを書く。CLI の create/sync/close はすべて `main`（`amadeus-mirror.ts:582` `runLegacyMutation`）→ `runMirrorLifecycleBoundary` 経由でこの v1 ブロックを永続化し、legacy「Mirror Issue」フィールドは書かない。
- **Read（3 箇所、v1 ブロック非参照）**: status（`amadeus-mirror.ts:169` `getField(stateContent, "Mirror Issue")`）と orchestrate 境界判定 2 箇所（`amadeus-orchestrate.ts:314` / `:3522` の `hasMirrorIssue`）はいずれも legacy「Mirror Issue」フィールドを読む。
- **帰結（#1547）**: lifecycle が Issue を作成し v1 ブロックへ書いても、status/orchestrate は「field 無し」= `mirror-missing`（`amadeus-mirror.ts:249-258` `compareMirrorStatus(snapshot, null)`）を報告し続ける。auto-sync も `hasMirrorIssue=false` 前提で毎回 create を促す。
- **帰結（#1534）**: legacy 経路で過去に生成された Issue は ownership marker を持たず、repair relink（`amadeus-mirror-lifecycle.ts:785` `marker.kind !== "parsed"` → fail-closed）も `verifyOwnership`（`amadeus-mirror-provenance.ts:165` `missing-marker`）も拒否するため、**in-tool 復旧経路がゼロ**。legacy 生成 10 record が field-only・marker 無しで取り残されている。

## Architect 段の独立再検証（observed `f9a0fb86a`）

上流 scan-notes の file:line・数値を observed で全数直読照合した（cid:reverse-engineering:cite-shift-vs-nonshift-separation に従い、一括シフト補正では救えない単発ずれも個別に照合）。

| 照合対象 | 結果 |
| --- | --- |
| Write 経路: executor `:71` / lifecycle `:629` / state-store `:158`（`mutateMirrorStateAtomic`）/ `:91`（`readMirrorState`） | 一致 |
| sentinel: codec `:38-39`（v1 start/end）/ `:1301-1302`（`parseMirrorStateDocument` → `allIndexesOf`） | 一致 |
| snapshot 型: types `:176` `issueNumber: number \| null;` | 一致 |
| Read 経路: mirror `:169`（`getField("Mirror Issue")`）/ `:188`（`mirrorIssue` 決定） | 一致 |
| Read 経路: orchestrate `:314` / `:3522`（`hasMirrorIssue = (getField(…, "Mirror Issue") ?? "").trim().length > 0`） | 一致 |
| status 分岐: mirror `:249-258`（`mirror-missing`）/ findings 型 `:231-233`（`stale-status-line` / `mirror-missing` / `issue-drifted`）/ `:282`（`exitOfStatus`） | 一致 |
| legacy writer: mirror `:363`（`writeMirrorIssueField`）/ `:370`（`setOrInsertField`）/ `:413`（唯一の呼び手 = `handleCreate` 内、main 不到達） | 一致 |
| dead legacy 群: mirror `:379`（`handleCreate`）/ `:425`（`handleSync`）/ `:450`（`handleClose`）/ `:533`（`runLegacyMutation`）/ `:570-585`（`main` ディスパッチ） | 一致 |
| marker: provenance `:47`（`renderMirrorMarker` = 唯一の marker 書き手）/ `:149`（`verifyOwnership`）/ `:165`（`missing-marker`） | 一致 |

**訂正 2 件**（cid:reverse-engineering:cite-shift-vs-nonshift-separation）:

1. **scan §6 の repair relink 行番号**。scan-notes は `runRepairRelink` を `:783`・`parseMirrorMarker` を `:788`・marker 検査を `:789-793` としたが、observed の実測は **関数 `:775`**（呼び出しは `:925`）/ **`parseMirrorMarker` `:784`** / **`if (marker.kind !== "parsed")` `:785`** / **error message `:788`**。単発ずれのため個別に訂正した。
2. **scan §1 の「欠陥面は区間内未変更」の精密化**。`amadeus-mirror.ts` と lifecycle スタック 7 モジュールは区間内 **0 変更**で正しいが、`amadeus-orchestrate.ts` は区間内で [PR #1521](https://github.com/amadeus-dlc/amadeus/pull/1521)（dedup refactor、`git show 071cb2f7b --numstat` = **8 insertions / 29 deletions**、`PHASE_NUMBERS` / `ownPhase` の除去と `KNOWN_CODEKB_STAGES` 集約）**により変更されている**。ただし変更ハンクは `:102` / `:116` / `:1288` / `:3019`（`grep '^@@'` 出力）であり、**欠陥 reader 行 `:314` / `:3522` はいずれのハンクにも含まれない**（`git show 071cb2f7b … | grep -c "hasMirrorIssue\|Mirror Issue"` = **0**）。両 reader 行は observed で `:314` / `:3522` に正しく解決する。すなわち「mirror.ts と lifecycle スタックは真に 0 変更、orchestrate.ts は非欠陥面のみ区間変更」と精密化する。

数値も再実測で一致: mirror スタック行数（`amadeus-mirror.ts` **587** / lifecycle **1027** / executor **1223** / state-store **428** / codec **1526** / provenance **246** / types **403**）/ orchestrate **4001** 行 / `git ls-files "*amadeus-mirror.ts"` = **13** パス / mirror テスト `git ls-files 'tests/**' | grep -i mirror | grep -c '.test.ts$'` = **31**（e2e 2 / integration 13 / unit 16）。

## 合成上の主要な確定事項

1. **修正の核は read 経路 3 箇所を v1 ブロック権威へ寄せる write⇔read 統一**。status（`amadeus-mirror.ts:169`）と orchestrate 境界判定 2 箇所（`:314` / `:3522`）を legacy field 読取から v1 sentinel（`amadeus-mirror-state-codec.ts:1301` `parseMirrorStateDocument`）権威へ切り替える。3 read 面を同根全数として棚卸しする（cid:code-generation:same-root-inventory）— status のみ直すと orchestrate 境界が非対称のまま残る。
2. **legacy「Mirror Issue」writer は CLI 実行時に不到達**（`writeMirrorIssueField` の唯一の呼び手 `:413` は `handleCreate` 内で main から到達しない）。dead code（`handleCreate` / `handleSync` / `handleClose` / `writeMirrorIssueField`）が export・被テストのまま生き、テストが dead path を緑に保って生きた path の欠陥を隠している。
3. **偽 green の機序**: real-create → status の e2e が構造的に不在。status テスト（t232）は `snapshot({ mirrorIssue: 1161 })`（`tests/unit/t232-amadeus-mirror.test.ts:104` / `:124`）で **legacy field を直接シード**し、v1 ブロックは書かない。create は lifecycle stub 化で実 lifecycle を走らせない。両者が別世界で閉じ、非対称が全スイートで不可視（org.md Forbidden = 検証劇場の同族、cid:build-and-test:pbt-oracle-cancellation）。regression-first の e2e（lifecycle create が永続化した v1 ブロックを status が読めるか）が修正の中心テストになる。
4. **#1534 の in-tool 復旧経路ゼロ**。marker 唯一の書き手は `renderMirrorMarker`（`amadeus-mirror-provenance.ts:47`）で legacy 経路は marker を書かない。marker 無き legacy Issue は relink（`amadeus-mirror-lifecycle.ts:785` fail-closed）も adopt（`verifyOwnership:165` `missing-marker`）も拒否する。legacy 10 record の復旧設計（marker 無き Issue の in-tool adopt/relink）が設計判断点。
5. **互換フォールバックの是非**は org.md Forbidden（要求なき互換シム禁止）と要件段で照合すべき論点。legacy field への二重書き戻し（write を両系統へ）は互換負債であり、v1 ブロックへの片寄せ（read を統一）が既決ノルムと整合する方向。ユーザー裁定寄り。

## センサー不適用と代替検証

RE ステージが宣言する 3 センサー（`required-sections` / `upstream-coverage` / `answer-evidence`）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**であり発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わない。** 代替として以下を実施。

**(a) H2 見出し数の機械確認（`grep -c '^## '`、H2 ≥ 2 を要件とする）** — 更新 9 成果物 + 本ファイルすべてで H2 ≥ 2 を確認（各成果物とも既存の複数節に本 intent 節を追加したため充足）。

**(b) 上流入力への実参照の確認** — 更新 9 成果物および本ファイルの本文に上流入力 `scan-notes` への参照が実在することを `grep -c 'scan-notes'` で機械確認（全件 1 以上、装飾トークンでなく本文の依拠箇所からの参照）。

**(c) 旧「現在」マーカーの降格確認** — `grep -n '^## .*現在' amadeus/spaces/default/codekb/amadeus/*.md` を実行し、intent マーカーを含む残存ヒットが本 intent `260726-mirror-state-split` の節のみであることを機械確認。前 intent `260726-mirror-envelope-lf` の H2 は「履歴」へ降格済み（cid:reverse-engineering:c3-relabel）。

## Delivery boundary

本 scan の成果物は codekb 9 成果物の差分更新と本 per-intent 記録のみ。患部コード（mirror スタック）・テスト fixture・coverage allowlist・GitHub Issue の操作・intent record / state / audit・生成配布物への書込は一切行っていない。修正方式（read の v1 片寄せ vs write の legacy 二重化、dead legacy 群の扱い、legacy 10 record の in-tool 復旧設計、互換フォールバックの是非）は後続の requirements-analysis 以降で裁定する。

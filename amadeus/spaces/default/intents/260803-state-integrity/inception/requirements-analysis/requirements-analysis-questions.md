# Requirements Analysis — 明確化質問

上流入力(consumes 全数): `business-overview.md`、`architecture.md`、`code-structure.md`(いずれも `amadeus/spaces/default/codekb/amadeus/`)。差分スキャン記録 `re-scans/260803-state-integrity.md` が全質問の実測根拠である。

## 選挙不要判定(cid:requirements-analysis:no-election-judgment-gate)

本セッションはソロモード。`amadeus/config.json` の `auto-solo-election: true` が自動発動する類型は (a) 設計逸脱 (b) ブロッカー (c) §13 学習選定 の3類型のみで、明確化質問はその外にある。したがって以下は選挙にかけず、種別ごとに次の根拠でユーザー裁定とする。

- Q1: **質問を撤回**。ユーザー指摘(2026-08-03、逐語「issueでわかることは質問するな」)により、Issue #1875 本文の「期待」から機械的に確定する執行事項へ再分類した。`cid:requirements-analysis:c3-260729-open-bug-batch`(Issue 本文の要求を質問票へ正本として固定する)に従い、下記 Q1 の [Answer] は Issue 逐語からの導出として記入する。
- Q2: 文書化済み設計判断(`amadeus-audit.ts:429-433`)の逆転可否 → エスカレーション正準リスト(4)によりユーザー専権。**ユーザー裁定済み**。
- Q3: 本 intent のスコープ境界、および `t164` がピン留めした bucket 意味論の改訂可否 → 同(4)。**ユーザー裁定済み**。
- Q4: **質問を撤回**。`cid:code-generation:c6` が「編集正本と dist/self-install 再生成面がファイル単位で非交差なら並行、交差する場合のみ直列化」を既決しており、交差は実ファイル目録で機械判定できる → 既決 contract への機械的適用=執行。`cid:requirements-analysis:always-elect` の「権威ある一次証拠によって事実が一意に確定し、その事実を既決 contract へ機械的に適用するだけなら、判断ではなく執行として証拠を記録して自律実行する」に該当。
- Q5: **質問を撤回**。org.md Forbidden(検証劇場)と Mandated(新設ゲートの落ちる実証)から、baseline による grandfather 延命でなく failure terminal の設置が一意に導かれる → 執行。ただし failure terminal が infeasible な catch を実装時に発見した場合は `cid:code-generation:deviation-stop-before-implement` により実装前に停止しエスカレーションする。

Q2/Q3 は `cid:reverse-engineering:c1-pinned-behavior-ruling` により実装前の裁定を要した(既存テスト・既存コメントがピン留めした挙動の変更を伴うため)。

---

## Q1. `Completed` カウンタの正準定義(#1875)

`architecture.md` の記す3定義が経路依存で発散している。差分スキャンの実測: 値の書き手は9件、定義 R(生カウント)7サイト、定義 E(EXECUTE 実効)4サイト、定義 G(graph 由来 seed)1系統。`code-structure.md` の示すとおり既存テストが R と E を**相互に矛盾してピン留め**しており、どの裁定でも既存テストの明示改訂を伴う。

- 定義 R のピン: `tests/e2e/t52-workflow-state-progression.test.ts:118`、`tests/e2e/t-tui-kiro-fix-scope.serial.test.ts:143`
- 定義 E のピン: `tests/integration/t394-compose-state-resync.integration.test.ts:126-144`(`Completed <= Total Stages` を含む)
- `rebuildDerivedPlanFields` は同一関数内で `Total Stages = executeStages.length` を書く(`amadeus-lib.ts:5780`)ため、定義 R では `Completed > Total Stages` が構造的に成立しうる

いずれの選択でも、`amadeus-state.ts:3377` の approve 検証器(自分が書いたのと同じ定義で再計算しており乖離を検出不能 = repo Forbidden の検証劇場)を正準定義から読ませる是正を含む。

A. **定義 E(EXECUTE 実効)へ統一** — 全書き手を `rebuildDerivedPlanFields` 相当の単一関数へ通す。定義 G の初期化 seed も EXECUTE 実効へ揃える。`t52:118` と `t-tui-kiro-fix-scope.serial:143` を明示改訂する。`Completed <= Total Stages` の不変条件が構造的に保たれる。
B. **定義 R(生カウント)へ統一** — 全書き手を `countCheckboxes(content,"completed")` へ寄せる。`t394:126-144` を明示改訂し、`Completed <= Total Stages` の不変条件は放棄する(SKIP 行の `[x]` を数えるため)。
C. **定義 E へ統一するが、初期化 seed(定義 G)は本 intent では触らない** — `amadeus-utility.ts:4433/4513/4568` を別 Issue へ繰り延べ、変更面を state CLI と jump に限定する。
D. **本 intent では定義統一を行わない** — `amadeus-state.ts:3377` の検証劇場の解消のみ行い、定義裁定は別 intent へ繰り延べる(#1875 は本 intent でクローズしない)。
X. Other (please specify)

[Answer]: A(Issue 本文からの導出 — 選挙・ユーザー裁定なし)

**導出根拠(一次証拠):** Issue #1875「## 期待」節の逐語 — 「Completed の定義を canonical 1定義(どちらかへ統一)し、全書き手が共有 writer(`rebuildDerivedPlanFields`)経由で計算する。」`rebuildDerivedPlanFields`(`amadeus-lib.ts:5781-5784`)は `parseCheckboxes(next).filter(c => c.state === "completed" && effective(c.slug) === "EXECUTE")` すなわち**定義 E(EXECUTE 実効)**の実装である。したがって統一先は Issue 本文が既に指名しており、仕様裁定として未決ではない。

**補強証拠(クロスレビュー2名の独立実測、target SHA `498c3034a`):**
- reviewer-2 §4.1: canonical は `stage-protocol.md:545` に既に文書化されているが、その記述(逐語「count of [x] stages」)は書き手の列挙が古く checkbox / advance の2つしか挙げていない。→ 本 intent で Issue 期待に合わせて改訂する。
- reviewer-1 §同根: 第4の定義として `amadeus-statusline.ts:140-157` が存在し、フェーズ単位で `SKIP` / `[S]` 行を除外して数える = **実効側と一致**。定義 E を選べばユーザーが statusline で見る進捗と `Completed` フィールドが初めて一致する。
- reviewer-2 §4 末尾: 生カウントが許す `Completed > Total Stages` skew は `t394:15` が逐語「Total 18 / Completed 19 skew」として名指しで閉じにいった不整合であり、コードベース自身が不正と宣言している。

**したがって本 intent が含む変更面(A の実質):**
1. 全書き手を共有 writer 経由へ — 定義 R 6サイト(`amadeus-state.ts:1456`/`2287`/`2368`/`2536`/`3422`、`amadeus-jump.ts:565`)+ `scope-change` の独立実装(`amadeus-utility.ts:5232-5239`、grid 基準)+ 初期化 seed(`amadeus-utility.ts:4433`/`4513`)。reviewer-2 の実測により全15 scope が初期化3ステージを EXECUTE にしている(init-SKIP hits: 0)ため seed の値は不変。
2. `amadeus-state.ts:3377` の approve 検証器を正準定義から読ませる — **必須**。reviewer-2 §4.3 の実測どおり、これを同時に直さないと定義 E への統一で**全 approve が fail-closed で拒否される**。あわせて自己再計算(検証劇場)も解消する。
3. テスト契約の明示改訂 — 独立再列挙により **3本**を確定した(RE 報告とクロスレビュー2名は2本のみ列挙): `tests/e2e/t52-workflow-state-progression.test.ts:112-118`、`tests/e2e/t-tui-kiro-fix-scope.serial.test.ts:142-143`、`tests/e2e/t-tui-t139-revision-loop-idempotency.serial.test.ts:243`/`:307`(helper `:160-162` が `/^- \[x\] (\S+)/gm` の生マッチ)。詳細は `requirements.md` FR-7。
4. `stage-protocol.md:545` の canonical 記述と書き手列挙の更新(正本 `packages/framework/core/amadeus-common/` を編集し全配布面を再生成)。

---

## Q2. 生存 PID の over-age reap(#1906 分岐 B)

差分スキャンの実測: `AMADEUS_LOCK_STALE_MS=1` + hold 20ms の20並列で **6/6 run が無音損失**(FINAL=4,4,5,6,6,5、全プロセス exit 0)。必要条件は「critical section 継続時間 > `lockStaleMs()`」のみ。CAS 後検証 `stampMatches(dead, owner)` は生存 holder が stamp を更新しないため**必ず通過し、構造的に不活性**である。既定値 `DEFAULT_LOCK_STALE_MS = 10 min` では10分超の critical section を要する。

`amadeus-audit.ts:429-433` が現挙動を意図的と明記している(verbatim: "once the holder has been in its section past DEFAULT_LOCK_STALE_MS the reaper judges that live lock stale and steals it — leaving the outer critical section running with no lock at all, silently.")ため、撤廃は文書化済み設計判断の逆転にあたる。

なお `:6345` の fail-open(`writeOwnerStamp` 失敗でも `dead-or-over-age` なら acquire 成功を返す)は、分岐 A を**タイミングの幸運なしに決定的**にする経路として実測再現済み(counter_final=1、期待 2)であり、A〜D いずれの選択でも閉鎖対象に含める。

A. **over-age reap を撤廃** — `dead-owner-only` を普遍方針とし、生存 PID は一切 reap しない。wedge した holder の回復手段は明示的な回収経路(専用 CLI verb 等)として別に定義し、`amadeus-audit.ts:429-433` のコメントを改訂する。
B. **維持 + heartbeat 機構を新設** — critical section 継続中に `owner.startedAtMs`(または別の liveness stamp)を更新し、健全な長時間 holder と wedge holder を区別する。CAS 後検証が実効化する。
C. **本 intent では `:6345` の fail-open のみ閉じる** — 分岐 B は新規 Issue として起票し繰り延べる。既定値10分では実務上の発現頻度が低いという判断。
D. **over-age reap を撤廃しつつ、wedge 回復手段は本 intent では新設しない** — 回復が必要な場面は現在も手動介入で対処可能という前提で、A の第2文を別 Issue へ繰り延べる。
X. Other (please specify)

[Answer]: A(ユーザー裁定)

**帰結:** `liveOwnerMayBeReaped`(`amadeus-lib.ts:6274-6282`)の `dead-or-over-age` 分岐を撤廃し、生存 PID を一切 reap しない `dead-owner-only` を普遍方針とする。あわせて `:6345` の fail-open(`writeOwnerStamp` 失敗でも `dead-or-over-age` なら acquire 成功を返す)を閉じる。wedge した holder の回復手段は明示的な回収経路として定義し、`amadeus-audit.ts:429-433` の現挙動を「意図的」と記すコメントを改訂する — 文書化済み設計判断の逆転を無申告にしない。

---

## Q3. ロック bucket の統一と UNLOCKED な read-modify-write

差分スキャンが新規に発見した、env ノブを一切要しない独立の相互排他欠陥(どちらの Issue にも記載なし)。

- **bucket 不整合**: `auditLockIdentity`(`amadeus-lib.ts:5960-5966`)は `intent === undefined` のとき workspace sentinel を使う。`handlePark`/`handleUnpark` はアクティブ intent の state file を **workspace** bucket 下で変更し、`handleSet --intent X` は**同じファイル**を **per-intent** bucket 下で変更する → 相互排他しない。**code-derived であり実測再現していない**(再現には live record と2並行 CLI 起動を要し repo state を変更するため未実施)。
- **UNLOCKED な RMW 6件**: `amadeus-jump.ts:370→627`(`Completed` を書く)、`amadeus-bolt.ts:872→889` / `927→954`、`amadeus-utility.ts:5162→5244`(`Completed` を書く) / `5561→5578`、`amadeus-lib.ts:5843→5888`(`resyncOneIntent`、`Completed` を書く)。`amadeus-jump.ts` と `amadeus-bolt.ts` は現在ロックプリミティブを import していない。

含める場合、`t164` の bucket 意味論ピンの改訂と、`withLockedIntentRegistry`(`intents.json` のため意図的に workspace スコープ)の「registry ロック」/「state file ロック」への分離という設計変更を伴う。

A. **本 intent には含めない** — #1906 の修正を `amadeus-lib.ts` のロックプリミティブに限定し、bucket 不整合と UNLOCKED RMW は新規 Issue を起票して繰り延べる(クロスレビュー2名成立を経てから着手)。
B. **UNLOCKED な RMW のロック化のみ含める** — 機械的で `t164` の改訂を要しない。bucket 統一は繰り延べる。ただし bucket が不整合なまま施錠しても `handlePark`/`handleSet` 間の相互排他は成立しない点を受け入れる。
C. **bucket 統一のみ含める** — `t164` を改訂し registry / state file ロックを分離する。UNLOCKED RMW は繰り延べる。
D. **両方含める** — 本 intent を state 整合性の一括是正とし、`resyncOneIntent` の扱いも同じ裁定に含める。変更面と CI リスクが最大になる。
X. Other (please specify)

[Answer]: A(ユーザー裁定)

**帰結:** #1906 の修正面を `amadeus-lib.ts` のロックプリミティブに限定する。bucket 不整合(`auditLockIdentity`、`amadeus-lib.ts:5960-5966`)と UNLOCKED な RMW 6件は本 intent のスコープ外とし、新規 Issue を起票する。起票は `cid:requirements-analysis:bughunt-file-only`(実測のみ・推測起票禁止)と `cid:requirements-analysis:pre-filing-dup-and-branch-check`(closed を含む重複検索+既修正の自ブランチ未取込確認)に従い、`cid:requirements-analysis:issue-cross-review` の2名成立を経てから着手する。`t164` の bucket 意味論ピンは本 intent では改訂しない。

**未実測である旨の引き継ぎ:** bucket 不整合は code-derived であり lost update の実測再現をしていない(再現には live record と2並行 CLI 起動を要し repo state を変更するため)。起票時にこの限界を明記する。

---

## Q4. Bolt 編成 — 直列か並行か

差分スキャンの交差判定(`cid:code-generation:c6` に従い実ファイル目録で実施):

- ソース交差: `amadeus-state.ts:1444-1460`(`handleCheckbox`)を両パッチが触る。`amadeus-jump.ts:564` は #1875 の患部かつ #1906 の RMW ロック対象。`handleScopeChange` も同様。
- 生成面: core tool ファイルは **12個のコミット済みコピー**(dist 7 + self-install 5)を持ち、**分割しても衝突は回避不能**。

Q3 で A を選んだ場合、ソース交差は消える(#1906 = `amadeus-lib.ts:6274-6390` のみ、#1875 = 他3ファイル。`amadeus-lib.ts` 内で約490行離れる)。

A. **直列**(Bolt A: #1906 → 着地 → `git fetch` + rebase + 完全再生成 → Bolt B: #1875)。生成面が必ず衝突する以上、並行の実益は限定的であるという判断。差分スキャンの推奨。
B. **並行**(隔離 worktree、Bolt A = `amadeus-lib.ts` のロックプリミティブのみ / Bolt B = #1875)。着地順に `cid:code-generation:base-advance-regrounding` を適用し、後続 Bolt は fetch + rebase + 完全再生成のうえ全検証を再実行する。
X. Other (please specify)

[Answer]: A(執行 — cid:code-generation:c6 への機械的適用、選挙・ユーザー裁定なし)

**導出根拠:** `cid:code-generation:c6` は「編集正本と dist/self-install 再生成面がファイル単位で非交差なら worktree 隔離の並行ディスパッチを既定とする(交差する場合のみ直列化)」と既決。交差判定を実ファイル目録で機械実施した結果:

- Q3=A によりソース交差は消える(#1906 = `amadeus-lib.ts:6274-6390`、#1875 = `amadeus-lib.ts:5669`/`:5781-5784` + `amadeus-state.ts` + `amadeus-jump.ts` + `amadeus-utility.ts`)。
- しかし**両パッチとも `amadeus-lib.ts` を編集する**ため、その生成コピー12個(dist 7 + self-install 5)が交差する。差分スキャン逐語:「`amadeus-lib.ts` の 12 個の生成コピーは依然衝突する — 回避不能」。

交差が実在する以上、c6 の条件分岐は直列化を一意に指す。後続 Bolt には `cid:code-generation:base-advance-regrounding` を適用する(merge-base 実測 → rebase → 正本を触ったため dist/self-install を完全再生成 → 全検証コマンド再実行)。

---

## Q5. no-silent-drop ゲート(NSD001)への対処方針

`technology-stack.md` の記す新設 blocking ゲート `bun tests/no-silent-drop-gate.ts check`(`ci.yml:154`)。audit lock 実装はほぼ全体が `try { … } catch { /* comment */ }` の silent-continue で構成され、現在 baseline(`tests/no-silent-drop/baseline.json`、計217件・うち `amadeus-lib.ts` 35件)に grandfather されている。**#1906 のパッチがこれらの catch を編集すると再 fingerprint され NSD001 が新規コードとして発火する** — 本 intent 最大の CI リスク。

A. **各 catch に承認済み failure terminal を置く**(baseline 更新なし)。silent-continue を実際に解消するため、ゲートの趣旨に最も忠実。変更面は広がる。
B. **同一 PR で根拠付き baseline 更新を入れる**。触れた catch のみ再登録し、根拠を PR 本文と record に残す。変更面は最小だが grandfather を延命する。
C. **ハイブリッド** — 修正の本体に関わる catch(`finalizeAuditLockAcquire`、`reapStaleLockUnderMutex` 等)は A で failure terminal を置き、修正と無関係に fingerprint がずれるだけの catch は B で baseline 更新する。方針の線引きを code-generation の plan に明記する。
X. Other (please specify)

[Answer]: C(執行 — org.md Forbidden / Mandated からの機械的導出、選挙・ユーザー裁定なし)

**導出根拠:** org.md Forbidden「検証・ゲート・チェックの結果を実行結果から導出せずに構築しない」および Mandated「新設のゲート・検証スクリプト・チェックは、失敗ケースを注入して実際に赤くなることを実証してから完成扱いにする」により、silent-continue を baseline へ再登録して grandfather を延命する選択(B)は既決ノルムと矛盾する。一方、修正と無関係にfingerprintがずれるだけの catch まで一律に書き換えることは surgical 原則(P5)に反する。両者を同時に満たす一意解が C である。

**方針:** #1906 のパッチが実際に編集する catch(`finalizeAuditLockAcquire`、および over-age reap 撤廃で触れる範囲)には承認済み failure terminal を置く。編集しない catch には触れない(fingerprint は不変のため再発火しない)。実装時に「failure terminal を置くと既存の回復挙動を壊す」等で A が infeasible な catch を発見した場合は、`cid:code-generation:deviation-stop-before-implement` により実装前に停止し裁定を仰ぐ — builder 単独で B へ倒さない。

---

## 裁定の記録

| 質問 | 裁定 | 種別 | 根拠 |
| --- | --- | --- | --- |
| Q1 | A(定義 E へ統一) | 執行(Issue 導出) | Issue #1875「## 期待」逐語が共有 writer `rebuildDerivedPlanFields` を指名 |
| Q2 | A(over-age reap 撤廃) | ユーザー裁定 | エスカレーション正準リスト(4)仕様変更 |
| Q3 | A(bucket / UNLOCKED RMW は含めない) | ユーザー裁定 | 同(4)スコープ境界 |
| Q4 | A(直列 Bolt) | 執行(ノルム適用) | `cid:code-generation:c6` の交差判定 |
| Q5 | C(ハイブリッド) | 執行(ノルム適用) | org.md Forbidden 検証劇場 / Mandated 落ちる実証 |

ユーザー承認: 2026-08-03T13:04:30Z — Q2=A、Q3=A の裁定を AskUserQuestion で受領。
ユーザー承認: 2026-08-03T13:06:14Z — Q1 を質問せず Issue から確定せよとの指示を受領し、Q1/Q4/Q5 を執行として記入。

選挙は実施していない。選挙不要判定の根拠種別は本ファイル冒頭 §「選挙不要判定」に1問1行で記載済み(`cid:requirements-analysis:no-election-judgment-gate`)。

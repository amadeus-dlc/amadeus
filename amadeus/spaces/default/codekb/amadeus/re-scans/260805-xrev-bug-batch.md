# re-scan record — 260805-xrev-bug-batch

本ファイルは intent `260805-xrev-bug-batch`（scope `self-fix`、Brownfield、Depth Minimal、Test Strategy Comprehensive）の Reverse Engineering における**全数列挙の正本**である。共有9成果物の現在断面は本ファイルを要約したものであり、件数・file:line の疑義は本ファイルを参照して解決する。

## 実行メタデータ

- Date: `2026-08-05`
- Base commit: `b938898f364160d4b5857e153579b40b5ab18372`（`cid:reverse-engineering:rescan-base-ancestry`。`git merge-base --is-ancestor b938898f3 HEAD` exit 0 を実測）
- Observed commit: `1043b7e67857494f38a4c9020709528e859c641b`（= 本 worktree HEAD = `origin/main`。`git rev-parse HEAD` で一致を実測。`cid:reverse-engineering:c2-observed-mainline-commit` により mainline 系譜のコミットを記録）
- 区間規模: **28 commits / 474 files**（`git diff --shortstat b938898f3 1043b7e67` → `474 files changed, 38598 insertions(+), 201 deletions(-)`）。`amadeus/` record を除く実質変更は **85 files**。
- Scan mode: **xrev**（`cid:reverse-engineering:c1-xrev-scan-mode`）。6件すべてがクロスレビュー2名成立済み（run `xrev-20260805-openbugs`、review target SHA `8409c2039c5281e533db88a637649276d8bc4a73`、全件 ESTABLISHED_WITH_REFINEMENTS）。2名の verdict を Developer scan の一次入力とし、Architect が observed 断面での verbatim 実読で二重化した。

### 行番号再解決の扱い — 免除は主張しない

`cid:reverse-engineering:c1-xrev-single-issue` / E-OBB5-RES13 の免除条件は「当該引用が observed と一致する SHA で検証済みであること」だが、**レビュー target SHA `8409c2039` は observed `1043b7e67` と一致しない**。したがって免除は主張しない。

代わりに区間の実測で currency を確定した:

- `git diff --name-only 8409c2039..HEAD` → `amadeus/spaces/default/memory/project.md` の **1 ファイルのみ**。
- 患部9パスの touch 判定: `git diff --name-only b938898f3 1043b7e67 -- <9 paths>` → **空出力**（患部ファイルは base→observed 区間で1行も変更されていない）。対象は `amadeus-reviewer-runtime.ts` / `amadeus-orchestrate.ts` / `amadeus-election.ts` / `amadeus-election-model.ts` / `amadeus-lib.ts` / `knowledge/amadeus-shared/verification.md` / `tests/unchecked-cast-guard.ts` / `amadeus-swarm.ts` / `amadeus-state.ts`。

よって全 file:line 引用は observed 断面で同一に解決する。これは**免除の適用ではなく、区間実測による currency の確定**である。

### Architect による verbatim 二重化（実施分）

| seam | 引用 | 実読結果 |
|---|---|---|
| `amadeus-orchestrate.ts:3005-3010` | `#2251` の error 分岐 | 一致（`if (getField(stateContent, "Status")?.trim() !== "Completed") { emit(errorDirective(…)); return; }`） |
| `amadeus-orchestrate.ts:4379-4396` | `#1953` の join key | 一致（`batchNumberOf` は `Batch number` のみ／`collectBatchNumbers` は `found.timestamp` を破棄） |
| `amadeus-reviewer-runtime.ts:437-452` | `#2147` の早期 return | 一致（`:443` `if (result.scopeTranscript.length === 0) return undefined;` が replay 検査 `:449` `:452` より前） |
| `amadeus-election-model.ts:190-198` | `#1946` の shape-only 検証 | 一致（`SUBMITTED_AT_RE` + `Number.isNaN` の2段のみ） |
| `amadeus-election-model.ts:307-313` | `#1946` の `resolveBallots` | 一致（`b.submittedAt >= cur.submittedAt` で自己申告値が勝者を決める） |
| `tests/unit/t234-election-model.test.ts:310-315` | `#1946` のピン | 一致（コメント逐語「Conversely, a FUTURE submittedAt received before the tally is on-time.」+ `expect(classifyLate(…)).toBeNull()`） |
| `knowledge/amadeus-shared/verification.md:15,25` | `#2145` の陳腐化2行 | 一致（`amadeus-docs/verification/traceability.md` / `amadeus-docs/verification/phase-check-[phase].md`） |
| `tests/unchecked-cast-guard.ts:94-103` | `#2112` の per-node visiting | 一致（`visitNodes` + `isAsExpression` + `unwrapExpression`、コメント逐語も一致） |
| `amadeus-lib.ts:7982-8000` | `#1953` の判定関数 | 一致（`wideBatchesOf` は `units.length >= 2`／`swarmEvidenceVerdict` は batch **番号**の集合所属のみ） |
| `stage-protocol.md:1012` | `#2147` の正準契約 | 一致（「Bypass, tampering, invocation/iteration replay, … fail non-zero without Review or READY evidence.」） |

引用不一致 **0 件**。

### 独立に再実測した数値

| 値 | 実測コマンド | 結果 |
|---|---|---|
| `traceability.md` の repo 全域参照 | `git grep -n 'traceability\.md'` | **1 hit**、かつそれは `verification.md:15` 自身（= 機構不在の決定的証明） |
| `dist:check` / `promote:self:check` の実在 | `grep -n '"dist:check"\|"promote:self:check"' package.json` | **0 hit**（現行は `source-only:check` `:13` / `distribution:check` `:14`） |
| 空 transcript の既存テスト | `grep -rn "scopeTranscript: \[\]" tests/` | **0 hit**（`#2147` の通常経路は未カバー） |
| cast allowlist 台帳規模 | `tests/.unchecked-cast-allowlist.json:4` | `"total": 35` |
| sensor の live glob | `grep -n "^matches:" .claude/sensors/*.md` | `amadeus-required-sections.md:8` / `amadeus-upstream-coverage.md:8` がともに `"**/{amadeus-docs,intents,codekb}/**"` |
| `amadeus-docs` の canonical 残存 | `grep -rn "amadeus-docs" packages/framework/core/knowledge/ packages/framework/core/sensors/` | **12 hit** |
| core tools | `ls packages/framework/core/tools/*.ts \| wc -l` | **119**（前回記録 116 から +3） |
| テストファイル | `git ls-files 'tests/**/*.test.ts' \| wc -l` | **945**（前回記録 927 から +18） |
| ハーネス | `ls packages/framework/harness/` | **8**（`claude` `codex` `cursor` `kimi` `kiro` `kiro-ide` `opencode` `pi`、増減なし） |

- Verification: 本 RE では新規テスト実行を行っていない（Depth Minimal、患部ファイルが区間で無変更）。coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない。
- Updated artifacts: 共有9成果物の現在断面を更新し、直前の `260804-phase-boundary-approval` 節を本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。

---

## 対象6件 — 患部・機序・裁定ポイント

以下はすべて observed `1043b7e67` 断面での実測である。**裁定ポイントは Requirements Analysis へ送る未決事項であり、本ステージでは解決しない。**

### #2251 — completion 未コミット窓の `next` が正規状態を `ERROR_LOGGED` として記録

**患部**: `packages/framework/core/tools/amadeus-orchestrate.ts:3005-3010`。in-scope ステージが枯渇し、かつ `Status !== "Completed"` の state に対して `errorDirective` を emit する。`emit()` の集約点（`:756-758`）が error directive を無条件に `recordEngineError`（`:845-871`）へ落とし、`ERROR_LOGGED` / `amadeus.operation.failed` が監査へ永続する。opt-out は `emitStateNeutralError`（`:804-808`）と `emitMigrationError`（`:964-968`）のみで、`:3005` はそれを使っていない。

**機序は仮説でなくコードから決定的に導かれる**。窓の到達条件は2つ:

- (a) `complete-workflow` が goal reconciliation で拒否された（`amadeus-state.ts:2513-2520`）
- (b) その状態のまま park され、別セッションが `next` から再開した

正常経路では `approveUnderLock` が `handleCompleteWorkflow` へ同一プロセス内で自己委譲する（`amadeus-state.ts:3510-3521`）ため、窓は外部から観測できない。mirror 委譲による deferred 完了も `amadeus-orchestrate.ts:2752-2759` で先に抜けるため本エラーにならない。

**導入**: PR #2171 / `43b1be53e`（2026-08-04）。それ以前は同じ状態で `done` を emit しており偽完了を許していた。**fail-closed 化そのものは是正**であり、争点は「fail-closed の表現として typed directive でなく監査に失敗を刻む error directive を選んだこと」に限られる。`43b1be53e` は base `b938898f3` の祖先（`--is-ancestor` exit 0）であり、本 intent の区間で導入されたものではない。

**設計上の非対称（最も強い根拠）**: 論理的に同じ窓に対し、mirror 委譲経路は `mirrorLifecyclePrint`（`amadeus-orchestrate.ts:360-366`）が次アクションを案内し、`report` 側（`:4979-4982`）は error にせず `complete-workflow` を sequence へ積む。**`next` の非 mirror 経路だけが error に落ちている。** 求められる typed directive は既存 print 経路と同型で実装可能であり新機構を要さない。

**Issue 記述に対する両方向の訂正（両レビュアー独立に一致）**:

- 「正常完了した intent **すべて**に残る」→ **CONTRADICTED**。全 intent の audit shard 全域 grep で当該メッセージは **1 件 / 1 intent**（`260803-intent-autonomy`、clone `6d454e07160a`、seq 4、`2026-08-05T02:47:36Z`）。#2171 着地後に `WORKFLOW_COMPLETED` を出した intent 2件のうち `260804-phase-boundary-approval` は同種の窓を約2分保持しながら当該行を**持たない**。
- 「機能影響なし」→ 見解が分かれる。r1 は「exit code を変えない（`:833-836` のコメント逐語「keeps a non-error exit code」）ため表示・監査層のみ」として CONFIRMED。r2 は「`error` は forwarding-loop 契約の**停止 directive** であり、ループが止まって追加の人間ターンを要する」として否定。**この点は要件段で一意化が要る。**
- `project.md` Forbidden（grant 失効の fatal 経路禁止）との関係は **REFINED** — 逐語対象は「grant 失効・取消・scope 不一致 fallback」であり、本件は同族の機序クラスだが規範の逐語違反ではない。

**同根**: `amadeus-orchestrate.ts:585` / `:3020` / `:4970`、state 側 `amadeus-state.ts:2510` / `:2522`。

**既存テスト**: `tests/` 全域に当該メッセージ **0 件**。ピンされた挙動はなく、落ちる実証テストは新規に組む必要がある。

**裁定ポイント（要件段）**
1. **抑止側で直してはならない** — `ERROR_LOGGED` の emit を止める方向の修正は #839 / #878 の契約（error directive は必ず監査へ落ちる）を退行させる。正しい方向は typed directive 化だが、**新 directive kind の追加は公開契約の変更**であり要件段の裁定を要する。
2. 「機能影響なし」の一意化 — r1（exit code 不変＝表示層のみ）と r2（forwarding loop 停止＝進行性の実害）が割れている。受入基準の重さがこれで変わる。
3. 同根5箇所を同一 intent で是正するか、`:3005` に限定するか。
4. 原因所在の帰属 — #2171 の設計判断（fail-closed の表現選択）であり実装逸脱ではない。`bug-intent-linkage` の記載を要件段で確定する。

---

### #2147 — reviewer replay 検査が spot-check 経路の内側にある

**患部**: `packages/framework/core/tools/amadeus-reviewer-runtime.ts`、`revalidateTranscript`（`:432-468`）。実読した順序:

```
:437  cardinality（transcript / requestedReads がともに ≤1）
:440  transcript 数 === requestedReads 数
:443  if (result.scopeTranscript.length === 0) return undefined;   ← 早期 return
:446  decision !== "approved" → throw
:449  recorded.invocationId !== result.invocationId → throw        ← replay 検査
:452  recorded.iteration !== result.iteration → throw              ← replay 検査
:462  tamper 検査
:465  path 検査
```

`:443` が欠陥の全体である。`:440` が `requestedReads` も空に強制するため、**「spot-check を辞退した」≡「replay 検査を飛ばした」**となる。ガードは証拠を自発提出した者にだけ課されている。

**生き残る検査は自己整合のみ**: `completeReview`（`:574`）の `:578-580` は `carrier.invocationId` と `result.invocationId` を比較するが、**両辺とも呼び出し側が渡した同一 JSON carrier に由来する**。

**必要条件 — `scope` は払い出した値を永続しない**: `runScope`（`:626-636`）の唯一の書き出しは `deps.stdout.write`（`:632`）であり、ファイル内の唯一のディスク書込は artifact の `appendFile`（`:612`）。**照合すべき保存値が存在しない**ため、`:443` を移動するだけでは契約を回復できない。`checkRead`（`:377-397`）も対称の穴を持ち、`:385` は UUID v4 の**形**しか検証せず `:386` は `carrier.iteration` を信頼する。両レビュアーが独立に、`scope` を一度も実行せず払い出されていない UUID で `check-read` → `complete-review` を **exit 0** まで駆動し READY 着地を実測した（fabrication の決定的再現）。

**壊してはならないもの**
- `stage-protocol.md:1012`（正準契約、逐語確認済み）。**契約文は既に正しく、実装だけが契約に追いついていない** — 実装のみの是正では契約文の変更は不要。
- spot-check の cardinality 契約（`:437` は1 invocation あたり最大1件、`checkRead:381-383` は受入 transcript が長さ0であることを要求）。両者とも load-bearing であり `cid:code-generation:c2-260803-state-integrity` の対象。
- `revalidateTranscript` の戻り `ScopeDecision | undefined` と、`undefined` → `canonicalReviewProjection` の `none` 投影。「要求なし → `Scope decision: none`」は `stage-protocol.md:1012` が名指しする契約である。

**既存テスト**: `t245:1112` / `:1139` は replay 拒否の名を持つが**いずれも非空 transcript を組む**。`grep -rn "scopeTranscript: \[\]" tests/` → **0 hit**（再実測）。したがって pinned-behaviour 裁定は不要だが、通常経路テストを伴わない修正は同じ盲点を再生産する。

**波及**: `amadeus-reviewer-runtime.ts`（`revalidateTranscript` / `checkRead` / `runScope` / `completeReview`）、`tests/integration/t245-reviewer-protocol-production-path.test.ts`。invocation 永続化を入れる場合、このファイルは**初めて artifact 以外のディスク書込を持つ**ことになり保存先の決定が要る。`dist` / self-install は #2152 以後 untracked のため投影同期は不要。

**裁定ポイント（要件段）**
1. **`:443` の移動だけでは不十分**という点で両レビュアーが独立に一致。`scope` 側の invocationId 永続化（または署名）が必要条件。**保存先・ライフタイム・保存が無い場合の fail-open / fail-closed** は設計判断であり実装判断ではない。
2. **原因所在の再帰属** — Issue は実装段としているが、両者が設計段への retarget を提案。`bug-intent-linkage` フィールドが変わる。
3. **重大度・優先度の再分類** — 両者が S3 → **S2-CRITICAL**（r2 は P2 → **P1** も）を提案。理由は記載の回避策「毎イテレーション `scope` を実行する」が **CONTRADICTED** であること（再実行しても実行時検証はゼロ増）。
4. r2 の副次観測 `SR2`: `completeReview:586-591` が iteration 上限を `directive.reviewer_max_iterations &&` の真値性でゲートするため、フィールド不在で上限が消える。engine は常に `?? 2` を供給する（`amadeus-orchestrate.ts:2261`）ため本番到達不能。**観測として報告、欠陥として主張していない。**

---

### #2145 — `verification.md` が現行 record レイアウトと不一致

**患部**: `packages/framework/core/knowledge/amadeus-shared/verification.md:15` と `:25`（逐語確認済み）。ともに `amadeus-docs/verification/…` を指す。

**規模の訂正**: `git ls-files | grep 'knowledge/amadeus-shared/verification.md'` → **正本1ファイル**。source-only 移行（#2152）が `dist/` と self-install ツリーを untracked にしたため、**「13投影面×2＝26箇所」という前提は失効している。修正は1ファイル2行。**

**機構不在の決定的証明**: `git grep -n 'traceability\.md'` → **repo 全域で 1 hit**、かつそれは `verification.md:15` 自身。宣言も生成も消費も存在しない。

**隣接する矛盾（最も鋭い証拠）**: `packages/framework/core/amadeus-common/protocols/stage-protocol-governance.md:21` は「`{{HARNESS_DIR}}/knowledge/amadeus-shared/verification.md` を読め」と指示し、`:23` は「`<record>/verification/phase-check-<phase>.md` へ書け」と指示する。**読めと言われたファイルが、書けと言われた場所と別の場所を書いている。** ランタイム側は正しく fail-closed（`amadeus-state.ts:388-392`）。

**影響の訂正（両レビュアー）**: その fail-closed ガードのため、最悪でも**ゲート拒否と1往復の無駄**であり、無音の誤書込ではない。**`S4-MINOR` が支持される。**

**同型の陳腐化（再 grep で確認、canonical `knowledge/` と `sensors/`）**

| file:line | 性質 |
|---|---|
| `knowledge/amadeus-shared/ai-dlc-principles.md:13` | 純粋な陳腐化、同クラス |
| `knowledge/amadeus-shared/audit-format.md:146`, `:232` | **純粋な陳腐化ではない** — hook は意図的に legacy `amadeus-docs/` の腕を維持している（`amadeus-audit-logger.ts:88`、`amadeus-sensor-fire.ts:216`）。fallback を primary のように記述しているのが問題 |
| `knowledge/amadeus-shared/worktree-info-schema.md:42` | `amadeus-bolt.ts:693` のコメントを写している。陳腐か現行か未検証 |
| `sensors/amadeus-required-sections.md:81`、`amadeus-linter.md:42`、`amadeus-answer-evidence.md:54`、`amadeus-type-check.md:32` | detail 出力パスが陳腐。実解決は `amadeus-lib.ts:4501-4503` で record 配下 |

**ハードな制約 — `amadeus-docs` の一括置換は禁止**: `sensors/amadeus-required-sections.md:8` と `sensors/amadeus-upstream-coverage.md:8` の `matches: "**/{amadeus-docs,intents,codekb}/**"` は**生きた glob**（実測）。機械的な sweep は sensor dispatch を壊す。

**裁定ポイント（要件段）**
1. **Issue の受入基準が実行不能**。`bun run dist:check` と `bun run promote:self:check` の exit 0 を要求するが、`package.json` に**どちらも存在しない**（現行は `source-only:check` `:13` / `distribution:check` `:14`）。「13投影面がすべて0」も無効。**受入基準の書き換えは要件段の作業であり、実装段の回避ではない。**
2. **ラベルの見解相違**。r1: 修正は完全に文書側なので `cid:requirements-analysis:issue-type-decision` step (2) → **`documentation`**。r2: canonical knowledge ファイルは合意済み契約に違反する実行可能成果物なので step (3) → **`bug`**。この裁定は `bug-intent-linkage` のハーネス／バージョン欄（現在 Issue 本文に不在）の要否も決める。
3. **スコープ** — 2行のみか、上記の兄弟 knowledge / sensor 集合まで含めるか。`audit-format.md` は `verification.md` とは**異なる是正**（legacy の腕を fallback として記述し直す）を要する。
4. Traceability Matrix の処分は #624（CLOSED）へ明示的に繰り延べられている。Issue は「未実装であることを読み取れるようにする」ことのみ求めている。**実装すると決めるのはスコープ拡大であり、ユーザーエスカレーション事項。**
5. 陳腐な参照: `#2143` は CLOSED（Issue 本文は OPEN と記載）。`code-generation.md:87` → `:92`、`:116` にも当該語がある。

---

### #2112 — unchecked-cast guard が多段 `as` 連鎖を過剰カウント

**患部**: `tests/unchecked-cast-guard.ts:92-108`、`detectUncheckedCasts`（逐語確認済み）。`visitNodes` が各 `AsExpression` ノードを独立に訪れ、`tests/lib/typescript-source.ts:19-30` の `unwrapExpression` が `isAsExpression` を含めて再帰的に剥がすため、**連鎖の内側と外側の両方が同じ `JSON.parse` へ到達してそれぞれ1件を push する**。連鎖ノードは開始位置を共有するので両方が同じ行に落ちる。

`:99-100` のコメントが示すとおり**剥がすこと自体は意図的**であり、過剰カウントは「剥がし」と「per-node visiting」の組合せの意図せぬ帰結である。

**影響は起票より狭く、かつ双方向（両レビュアー収斂）**
- **台帳は同じ検出器で生成される**（`renderAllowlist`、`:255-258`）ため、過剰カウントは書き手と読み手に対称に乗る。**定常状態でゲートは赤にならない。** Issue の「1実サイトに台帳が2を要求して CI を塞ぐ」は**遷移**であって常態ではない。
- **verdict が反転する唯一の遷移**: 台帳収載済みファイルの単一 `as` を台帳更新なしに `as A as B` へ多段化する → `measured 2 > allowlist 1` → NEW_CAST の偽赤（r1 が `diffAgainstAllowlist` で実証）。
- **fail-open 側（r1 の S2、Issue の「安全方向のみ」を否定）**: 連鎖が存在する状態で `--update` を実行すると 1実サイトに対し 2 の予算を積む。後で連鎖を畳んで真に新しいキャストを足しても無音で通過する。
- **スコープ訂正**: `unknown` は無関係。条件は「1連鎖中に非 `unknown` の assertion が2個以上」。N段 → N サイト。`as A as unknown as B` も2を数える。
- **現行コーパスは清潔**: `SCAN_ROOTS` の AST 全数走査で連鎖 41件、うち両端が非 `unknown` のものは **0**。台帳は `total=35 / 19 files` で `tests/.unchecked-cast-allowlist.json:4 "total": 35` と一致（再実測）。**したがって潜在債務である。**

**壊してはならないもの**
- `tests/unit/t420-unchecked-cast-guard.test.ts:66` が `JSON.parse(text) as unknown as Receipts` → 1サイトをピン（期待は `:68-73`）。この1サイトは **`:98` の `UnknownKeyword` 早期 return**、すなわち **BR-CG-2** の帰結であり、Issue が言う BR-CG-1 / BR-CG-4 ではない。
- `business-rules.md` の BR-CG-1..6 は**連鎖を一切規定していない**。実装は BR-CG-1（per-node 判断）に字義的に適合している — **つまりこれは仕様の空白**であり、両レビュアーが `bug` / `enhancement` の境界を挙げる理由でもある。
- 台帳は **shrink-only** ratchet で、`.github/workflows/ci.yml:172` にブロッキング CI ステップとして結線されている（`continue-on-error` なし）。カウント規則を変えると census が変わり、**台帳全体が再ベース化される** — これは `cid:code-generation:c5-ratchet-census-at-final-base` と直接衝突する。

**波及**: `tests/unchecked-cast-guard.ts`（検出器 + `renderAllowlist` + `buildResidualReport`）、必要なら `tests/lib/typescript-source.ts`、`tests/.unchecked-cast-allowlist.json`（全再生成）、`tests/unit/t420-unchecked-cast-guard.test.ts`、`tests/integration/t420-unchecked-cast-guard-cli.test.ts`、`.github/workflows/ci.yml:168` の陳腐なコメント（「the existing 33 stay visible」対 実測 35）。

兄弟 ratchet は清潔: `tests/callsite-guard.ts` は行 regex で数え、`tests/lib/cli-mechanism.ts:368-373` は `visitNodes` を使うが boolean OR で畳む。トップレベルの `isAsExpression` 使用はこの guard 固有。

**裁定ポイント（要件段）**
1. **BR-CG-2 との相互作用**: 最外ノードのみを数える修正にした場合、`JSON.parse(s) as A as unknown as B` は 1サイトか 0サイトか。BR-CG-2 は `as unknown` を債務としないが、最外のみなら外側の `as B` が対象ノードになる。**設計段で決めるべきで実装段ではない。**
2. **台帳の再ベース**: いかなるカウント変更も 35/19 台帳の再生成を要し、shrink-only の方向（再ベースを通して新規エントリを admit しない）を保存しなければならない。
3. **逆向きの穴は実在し、同一述語の中にある**: `<A>JSON.parse(s)`（角括弧 assertion）→ **0サイト**、`JSON.parse(s) satisfies A` → **0サイト**。同関数の fail-open 側である。同一変更で塞ぐかはスコープ裁定（両者とも観測として報告し、本 Issue の主張とはしていない）。
4. Issue の数値訂正: 「33サイト / 18ファイル」→ 着地時 36/19、現在 **35/19**。

---

### #1953 — approve 側 SWARM 実績突合が stale 実績を受理

**患部**（すべて逐語確認済み）
- `amadeus-orchestrate.ts:4379-4384` `batchNumberOf` — join key は `auditBlockField(block, "Batch number")` **のみ**。
- `:4387-4396` `collectBatchNumbers` — `findAllEvents` は `{timestamp, block}` を返すのに、**ファイル内唯一の呼び出し元であるここが `timestamp` を捨てている**。
- `:4407-4413` `collectSwarmEvidence` — `readAllAuditShards(projectDir)` を**時刻・世代のフィルタなし**で読む。
- `amadeus-lib.ts:7991-8000` `swarmEvidenceVerdict` — batch **番号**の集合所属のみ。batch 番号は DAG のトポロジカル階層 index+1（`:3082`）なので、**replan すると同じ番号が別の unit 集合を指すのに、append-only の audit は古い行を永久に保持する。**

**方向は厳密に一方向（両レビュアー独立）**: stale 行は evidence 集合を**拡大**するのみで、`missing` はその集合に**含まれない**宣言 batch を残す形で計算される。よって stale は偽の reject を起こせず、**偽の pass のみ**を起こす。主目的（#1892: 実績ゼロ）は依然機能する（両者の negative control が `missing` を返した）。

**precondition は「過去の並列 batch」より広い（r2 の C8）**: `wideBatchesOf`（`amadeus-lib.ts:7982-7988`）は幅 ≥2 の batch にしか実績を要求しないが、**幅1の batch も `SWARM_STARTED` / `SWARM_COMPLETED` を出す**。その行が evidence 集合へ入り、同じ番号を持つ後続の幅 ≥2 batch を満たしうる。

**不在は制約ではない — repo 内に positive control が3つある**
1. `amadeus-runtime.ts:219-223` — コメント逐語 `// sinceTimestamp filters out rows from prior workflows on the same audit log` + `(e) => e.timestamp >= sinceTimestamp && !isSingleStageRow(e.block)`
2. `amadeus-goal.ts:100-107` — `latestHumanTurnAfter` が `observed >= timestamp` で audit 行を絞る
3. `findAllEvents`（`amadeus-lib.ts:6392-6416`）は timestamp を強く要求し、無い行を落とす

したがって時刻境界の修正は**既存イディオムの水平展開であり発明ではない**。

**壊してはならないもの**
- `amadeus-swarm.ts:362-437` の emitter フィールド集合が書き手側の半分: `SWARM_STARTED` = {Batch number, Unit names, Concurrency cap}、`SWARM_DEGRADED` = {Batch number, Requested driver, Fallback driver}、`SWARM_COMPLETED` = {Batch number, Converged count, Failed count}。**`SWARM_COMPLETED` は unit 名を持たない** — completed 側の unit 集合相関はスキーマ変更か `SWARM_UNIT_CONVERGED`（`:393-397`）の利用なしには不可能。
- `amadeus-lib.ts:7955-7958` が**番号のみを選んだ理由を記録している**: unit 名で照合すると degraded batch がすべて落ちる。この根拠は尊重すべきで覆すべきではない。
- **DAG は世代識別子を持たない**: `computeBoltDagOutcome`（`amadeus-runtime.ts:360-403`）は `{units, batches}` のみを返し、generation / digest / compiled_at がない。よって「世代キー」案は DAG と3 emitter の**新規スキーマ**であり、既存シャード（当該フィールドを持たない）の扱いの決定を伴う。
- **ピンされたテストなし**: `tests/unit/t402-approve-reconciliation.test.ts` は evidence を素の番号集合として組み、staleness / freshness / replan を一切ピンしていない。したがって pinned-behaviour 裁定は不要だが、freshness の導入は `SwarmEvidence` の形を変えるため t402 の3ファイル（unit / integration / corpus）はテスト契約の改訂対象になる。
- **ガードの発火は狭い**: `for_each: unit-of-work` **かつ** `mode: subagent` のステージのみ（`:4884-4890`）。stock ステージでは `code-generation` だけが該当する。ステージ跨ぎの汚染は不可能で、汚染源は同一 intent・同一ステージの過去世代である。

**波及**: `amadeus-orchestrate.ts`（`collectSwarmEvidence` / `collectBatchNumbers`、`swarmEvidenceRejection` の trail 文言 `:4440`）、`amadeus-lib.ts`（`swarmEvidenceVerdict` / `SwarmEvidence` 型 / `wideBatchesOf`）、世代キー案では `amadeus-swarm.ts`（3 emitter）と `amadeus-runtime.ts`（DAG 形状）、加えて t402 の3テストファイル。

**裁定ポイント（要件段）**
1. **修正方向**: 世代キー（書き手スキーマ変更。当該フィールドを持たない legacy 行に対する fail-open / fail-closed の決定が要る）対 時刻境界（スキーマ変更不要だが、境界タイムスタンプ — 例えば units-generation 承認時刻 — が**現在 approve 経路で読まれていない**）。
2. **type 裁定（両者が指摘）**: `260801-cg-plan-guard` の `business-logic-model.md:116-118` が freshness 相関を設計スコープ外と明記し**この Issue 番号へ繰り延べている**。`issue-type-decision` step (4) では `enhancement`、guard 自身のコード内不変条件「plan は主張、SWARM 行は receipt」（`:4865-4872`）に照らせば step (3) の `bug`。一行の裁定が要る。
3. **Issue 本文の引用誤り**: 引かれている要件は FR-4（三部構成のメッセージ契約）だが、対応する要件は **FR-2**（`requirements.md:31-37`）であり、こちらも freshness を規定していない。結論は不変、引用が誤り。
4. **症状の枠組みの訂正**: 主症状は**無音の pass** であり、誤解を招く reject メッセージではない。reject 文言が乖離するのは部分カバレッジ時のみ。
5. **スコープ外だが隣接（r2 の SR-1）**: `handleReport` は authority ≠ `normal` のとき `handleAuthorizedApprovalReport` へ早期委譲し（`:4708-4730`）、その carrier 経路の本体（`:4445-4528`）には `collectSwarmEvidence` / `readBoltDagBatches` / `swarmEvidenceVerdict` / `nextUncoveredUnit` の呼び出しが**ゼロ**。元の Bugbot 指摘のタイトルは「Carrier approve skips swarm guard」であり、Issue は stale-evidence 側だけを転記した。r2 は**別 Issue**を推奨。**本 Issue のスコープを黙って広げてはならない。**

---

### #1946 — election ballot の `submittedAt` が無検証

**患部**: `packages/framework/core/tools/amadeus-election.ts`、`handleVote`（`:528-552`）。`:547` で `receivedAt` を採取しながら `ballot.submittedAt` と**一度も比較しない**。`amadeus-election-model.ts:190-198`（逐語確認済み）の `isValidSubmittedAt` は mint 形の regex と実在インスタントの2段だけで、**関係検査はどこにもない**。`:186-189` のコメントがこの2段設計（E-BFARA1）を明記している。

**影響は起票より広い — 集約軸そのものが汚染される**: `amadeus-election-model.ts:307-313` `resolveBallots`（逐語確認済み）は投票者ごとの勝者を **`submittedAt` の最大値**、すなわち自己申告フィールドで選ぶ。**未来日時の原票は真正な後続 amend を構造的に破棄する。** r2 が決定的な A/B を実演した — 手順は同一で原票の `submittedAt` を `2099-…` から実時刻へ変えるだけで、結果が `established` ↔ `hold(block)` に反転し、GoA-8 のブロック票が裁定からも GoA 分布からも消える。

`verify` はこれを検出できない: `amadeus-election-record.ts:243-254` は `receivedAt ?? at`（**受理軸**）の単調性を明示的な設計として検査する（コメント逐語: agmsg 中継の ballot は relay 遅延で `submittedAt` 順が正当に非単調になりうる）。

**コーパス規模（両レビュアーの独立 sweep が一致）**: `submittedAt > receivedAt` が **58行 / 41選挙**、`receivedAt` を持つ 626行の 9.3%。超過幅は最小 6秒、中央値 約1,396秒、最大 約33,173秒。**「±数分の時計ずれ」許容案では 58 行のうち 17 行が素通りする** — これが許容設計に対する定量的な反証であり、受理側スタンプ案の根拠である。

**THE ピン留め契約 — 裁定を要するもの（逐語確認済み）**: `tests/unit/t234-election-model.test.ts:310-315`。コメント「Conversely, a FUTURE submittedAt received before the tally is on-time.」付きで `classifyLate(tallyTime, "2026-07-19T00:45:00Z", futureClaimEarlyReceipt)` が `null`（= on-time）であることを**明示的にピン**している。これは E-BRARA2 の軸シフト（#1262）に属し、周辺コメント `:300-302` は「受理時刻が、主張時刻ではなく、遅刻を決める」と述べる。**受理段で `submittedAt > receivedAt` を拒否すると、このシナリオは構築不能になる。** `cid:reverse-engineering:c1-pinned-behavior-ruling` が適用され、`cid:code-generation:c1-pinned-behavior-ruling` の追補（E-OBB3-CGS13）が警告するとおり、「既存テストはグリーン維持」型の包括的受入基準はこのピンと構造的に両立しない。

なお**ピンの設計意図と修正は実は両立しうる** — ピンは「受理軸が遅刻を支配する」ことを主張するために存在し、受理側スタンプはまさにそれを強化する。だがテストが書かれているシナリオ自体は受理段拒否を生き延びられない。**この折り合いは要件段の裁定であり実装判断ではない。**

**その他の壊してはならない挙動**: `t234:322-341` は `Ballot.parse` の `invalid-timestamp` が5つの不正形（`__NOW__` sentinel、日付のみ、ミリ秒形、TZ オフセット形、実在しないインスタント）を正確に拒否することをピンする。**未来タイムスタンプの受理を意図された契約としてピンするテストは存在しない** — 上記 `classifyLate` シナリオだけが触れている。

**波及**: `amadeus-election.ts:528-552`（受理境界）、`amadeus-election-model.ts` の `isValidSubmittedAt` `:195-198` / `Ballot.parse` `:280`（唯一の `invalid-timestamp` 経路）/ `parseBallotRef` `:262`（amend の `ref.submittedAt`、形のみ）/ `resolveBallots` `:307-313`、`amadeus-election-store.ts` の **2つの** timeline 書込点 `:633`（late lane）/ `:645`（ballot lane）と `appendBallot` の ref 照合（identity key は `[voter, kind, submittedAt]`、`:206`）、`amadeus-election-record.ts:243-254`（`verifySelf` の軸）、`tests/unit/t234-election-model.test.ts`。

**受理側スタンプへ移すと amend の参照キーが変わる**ため、書き手と読み手を同時に動かす必要がある（`cid:requirements-analysis:symmetric-pair-review`）。

**裁定ポイント（要件段）**
1. **`t234:310-315` のピン** — 上記。**実装前に決着させなければならない。**
2. **設計選択**: (a) 受理側スタンプ（`submittedAt := receivedAt`、`claimedSubmittedAt` を残すか否か）— 台帳の矛盾と `resolveBallots` の乗っ取りの**両方**を閉じるが、amend の ref identity key を変え、`:243-245` のコメントが守る relay 遅延の性質と相互作用する。対 (b) 受理段で `submittedAt > receivedAt` を拒否 — 症状は閉じるが `resolveBallots` は自己申告軸のまま残り、コーパスデータが反対する許容幅の決定を要する。
3. **遡及性**: 145 の timeline 行が `receivedAt` より前で検査不能。受入基準は**既存行がスコープ外であり書き換えないこと**を明記すべき。
4. **第2の不変条件、未決**: 31行が `submittedAt` が CLI 採取の `distributedAt` より**早い**。`bookReportedDeliveries`（`:326-345`）は未 book の投票者のみを book するため、`vote` → `notify` の順序でこれは正当に発生する（E-TCRRA1 は4日の隔たりを示す）。`submittedAt ≥ distributedAt` を第2の不変条件にするかは**明示的な未決事項であり、確認された欠陥ではない**。
5. **原因所在**: r2 は最近接の所有者を `260719-ballot-failclosed-amend`（裁定 E-BFARA1=A が受理形を「mint 形 regex + 実在インスタント」と固定した）とし、タイムスタンプに一切言及しない `260718-election-ts-foundation` の FR-3a/3b ではないと論じる。
6. **重大度**: `resolveBallots` の乗っ取りを Issue のスコープへ入れるなら両者が S3 → **S2-CRITICAL** を提案（ブロック票の無音喪失と裁定種別の反転 = 回避策のない偽グリーン）。r2 は複合前提（未来主張 ∧ 同一投票者の後続 amend）を限定条件と扱うなら S3 も擁護可能と注記。
7. **清潔な対称性 — 隠れた作業なし**: 他のすべての election タイムスタンプは CLI 採取（`talliedAt`、`receivedAt`、`distributed.at`、`HoldResolution.at`、registry `createdAt`）。58 の逆転はすべて `kind: "ballot"`、`distributed` / `tallied` / `late` にはゼロ。自己申告は `ballot.submittedAt` と `ref.submittedAt` のみ。

---

## 横断所見（Architect 合成）

1. **抑止側の罠が2件**: #2251（`ERROR_LOGGED` を抑止すると #839/#878 を退行させる）と #2147（`:443` の移動だけでは `scope` 側永続化なしに契約を回復できない）。**いずれも素朴な修正が誤りで、2名のレビュアーが独立にそこへ収斂した。**
2. **コード着手前に要件段の裁定を要するもの3件**: #2145（実行不能な受入基準 + ラベル分裂）、#1946（`t234:310-315` のピン）、#2112（BR-CG-2 との相互作用と台帳再ベース）。
3. **ピンされたテストが皆無なもの2件**: #2251、#1953。テスト契約の衝突はないが既存の網もない。**両者とも落ちる実証テストをゼロから組む必要がある。**
4. **shrink-only 台帳に触れるもの**: #2112（cast allowlist）。本バッチ全体としても区間内で coverage / no-silent-drop 台帳が動いているため、**census は最終マージ base で採る**（`cid:code-generation:c5-ratchet-census-at-final-base`）。
5. **本6件に属さない隣接所見が3つ浮上した。黙って吸収せず別途トリアージすべき**: (a) `pi` ハーネスが §12a reviewer 契約を丸ごと欠く、(b) carrier approve が swarm guard を迂回する（r2-1953 SR-1、元の Bugbot タイトルと一致）、(c) cast guard の角括弧 / `satisfies` 過少カウント（同一述語の fail-open 側）。

## 区間内の構成デルタ（本 intent の患部外）

`git diff --name-only b938898f3 1043b7e67 -- ':!amadeus/'` の 85 files から:

- core tools **116 → 119**。新設は `amadeus-advisory-choice.ts`、`amadeus-intent-completion.ts`、`amadeus-loop-monitor-replay.ts` / `amadeus-loop-monitor-runtime.ts`、`amadeus-autonomy-review.ts` / `amadeus-autonomy-review-production.ts`、`amadeus-intent-autonomy-runtime.ts` 系。
- テストファイル **927 → 945**。live-e2e ハーネス（`tests/harness/live-e2e/` 9ファイル）と kiro TUI 系が新設。
- plugin `formal-model-check` に `tools/tla-authoring.ts` / `tools/tla-evidence.ts` が追加。
- `scripts/import-closure-guard.ts` が新設され、`tests/unit/t440` `t441` / `tests/integration/t442` `t443` が対応。
- ハーネス **8** で増減なし。6つの `SKILL.md`（claude / codex / kimi / kiro / kiro-ide / pi）が区間内で変更されている（#2143 系の annex 横展開に対応する着地の可能性が高いが、**本 intent の対象外であり本 RE では検証していない**）。
- **患部9ファイルはいずれも区間内で無変更**（上記「行番号再解決の扱い」を参照）。

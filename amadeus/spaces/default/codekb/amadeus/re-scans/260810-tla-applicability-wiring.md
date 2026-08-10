# re-scan: 260810-tla-applicability-wiring（Issue #2766、裁定 案A）

**Date**: `2026-08-10`
**測定 ref**: observed = 本 worktree HEAD = `origin/main` 系譜 = `91f37ec8589cdf468599b4787e27e5125d4d16e8`（`cid:reverse-engineering:measurement-ref-in-artifacts` / `c2-observed-mainline-commit`）
**Base**: `778567dd03b00f22cb887eec06f025557eeaaaf4`（直前 intent の observed。`git merge-base --is-ancestor 778567dd0 HEAD` = **exit 0**、`git rev-list --count 778567dd0..HEAD` = **17**。`cid:reverse-engineering:rescan-base-ancestry`）
**Scope**: `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal
**Focus**: [Issue #2766](https://github.com/amadeus-dlc/amadeus/issues/2766) — TLA+ applicability 判定が常に no-hold になる（`authoring-subjects.json` に**書き手が存在しない**ため供給が空のまま）。ユーザー裁定 **案A**（接続完成 + FR-005 receipt 閉包。BR-U2-05 / ADR-6 の契約衝突は設計段で明示裁定する）
**Scan mode**: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー2名 ESTABLISHED_WITH_REFINEMENTS 済みの単発 Issue。レビュー verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化
**行番号引用の currency（二重根拠）**: (1) クロスレビュー target SHA ≡ observed（**完全一致**）→ `review..observed` の実 diff は空で再解決は構造的 no-op（`cid:reverse-engineering:E-XBB-RE-S13-c2`。測定区間は `review..observed` に固定、`..HEAD` ではない）。(2) 加えて `base..observed` の **68 ファイル**に患部 7 パスが**1件も含まれない**（下記 P0）
**副作用**: git 状態変更・GitHub 書込・engine 操作・coverage 実行は**すべてゼロ**（`cid:code-generation:c1-coverage-single-owner`）。exit code はパイプ非経由で個別取得（`cid:code-generation:no-exit-capture-through-pipe`）
**tNNN 予約**: 使用済み最大 **`t523`**（Architect 独立実測、下記 P6）、本 intent は **`t524`** 以降を予約。⚠ 直近区間に **`t521` の二重採番**が実在（`t521-census-exitcode-drain.integration.test.ts` / `t521-sensor-flag-value-arms.integration.test.ts`）— `cid:code-generation:swarm-test-number-reservation` の実例が本区間内にあるため、事前予約を明示し PR 発行前・マージ直前に固定 base SHA の `tests/` で再確認すること（`cid:code-generation:c1-tnnn-collision-on-regrounding`）

---

## 検索述語（再実行可能・結果と同所に記録）

`cid:requirements-analysis:enumeration-completeness-review`（E-ASD-RES13 追補 — 述語をそのまま再実行できる形で結果と同所に置く）に従う。すべて worktree ルートで実行、除外条件なし。

| ID | 述語 | 結果 |
|---|---|---|
| P0 | `git diff --name-only 778567dd0..HEAD` → 患部語彙で絞る `grep -cE 'formal-model-check\|advisory-choice\|advisory-declaration\|t445-'` | 区間 **68 ファイル**、患部ヒット **0**（exit 1 = 0件） |
| P1 | `git grep -n "authoring-subjects"`（全 tracked） | **7 hit**、うち**書き手 0 件**（内訳は下記 §2） |
| P2 | `ls amadeus/spaces/default/intents/*/inception/requirements-analysis/requirements.md \| wc -l` | **134** |
| P3 | `grep -lE '^###[[:space:]]+(FR\|NFR\|AC)-[0-9]{3}([^0-9]\|$)' <P2 の集合> \| wc -l` | **3** ← 🔴 3/134 |
| P4 | `ls .../inception/application-design/decisions.md \| wc -l` / 同集合へ `grep -lE '^##[[:space:]]+ADR-[0-9]+'` | **56 中 54** ← 対照として健全 |
| P5 | `git grep -n "advisories" -- tests/ \| grep -i formal-model-check` | **0 hit**（実 manifest の `advisories` を assert するテストは存在しない） |
| P6 | `find tests -name 't[0-9]*' -type f \| grep -oE '/t[0-9]+' \| grep -oE '[0-9]+' \| sort -n \| tail -1` | **523** |

P3 と P4 は**同一述語形（見出し行の正規表現一致ファイル数）を requirements 側と decisions 側へ対称に適用**した対照測定である。片側だけでは「文法が厳しすぎる」のか「コーパスが荒れている」のか判別できない。

---

## 1. 差分リフレッシュ 778567dd0..HEAD（17 commits / 68 files）

| サブシステム | 内容 |
|---|---|
| センサー CLI | `amadeus-sensor-flags.ts` 新規 + 既存6センサーのフラグ厳格 parse 化（#2756） |
| state / jump / autonomy | `amadeus-state.ts`（blocking センサーゲート配線 #2747）、`amadeus-jump.ts`（RMW audit lock 直列化 #2749）、`amadeus-intent-autonomy-production.ts`（#2746） |
| pi harness | `packages/framework/harness/pi/extensions/subagent.ts`（#2745） |
| scripts | `depth-artifact-census.ts`（stdout drain #2744） |
| docs | `docs/reference/07-sensor-system{,.ja}.md` |
| record / metrics | intent `260809-sensor-parseflags-failop` の record 一式、metrics スナップショット、codekb 3面 |
| tests | 新規6ファイル（t520×2, t521×2, t522, t523）+ 既存6ファイル修正、`.coverage-*` / `.complexity-baseline` 台帳 |

### 患部非交差の証明（P0）

#2766 の患部 7 パスは区間の変更集合に**1件も現れない**（実測）:

- `plugins/formal-model-check/tools/tla-authoring.ts`
- `plugins/formal-model-check/tools/tla-applicability.ts`
- `plugins/formal-model-check/plugin.json`
- `plugins/formal-model-check/stages/tla-authoring.md`
- `packages/framework/core/tools/amadeus-advisory-choice.ts`
- `packages/framework/core/tools/amadeus-advisory-declaration.ts`
- `tests/integration/t445-*`

**含意**: 既存 codekb の該当節とクロスレビュー2件の file:line は observed で有効。行番号再解決は不要（target SHA 一致 + 区間実 diff の非交差という二重根拠。**免除の主張ではなく実測の記録**である — `cid:reverse-engineering:E-XBB-RE-S13-c2`）。

---

## 2. advisory 供給チェーンの現況（案A の設計面）

### 2a. 宣言 parse → checkpoint 発火 → run-now ルート

**宣言 parse**（`packages/framework/core/tools/amadeus-advisory-declaration.ts`）

- `parseAdvisoryDeclarations` :110-128 — `advisories` 未宣言は `{declarations:[],invalid:[]}`（無害）、壊れた宣言は `invalid` へ
- `parseOne` :90-99 逐語 `const formalCheck = entry.formalCheck ?? null;`
- `declaredAdvisoriesForPlugin` :253-277 — manifest 読取 → checkpoint 一致宣言ごとに `runEvaluator(declaration.evaluatorArgv)` → `advisoryFromEvaluatorRun`
- **痕跡が残らない点**（#2766 の症状面）: :171 逐語 `if (isRecord(verdict) && verdict.kind === "no-hold") return null;` — no-hold は null を返して消えるため、「評価器が走ったが no-hold だった」と「そもそも走っていない」が観測上区別できない
- `pluginManifestPath` :243-245 = `<projectRoot>/plugins/<plugin>/plugin.json`（`projectRootForHost` = `dirname(hostRoot)`、`amadeus-plugin-activation.ts:110-112`）。本 repo は `plugins/formal-model-check/plugin.json` 実在 → **宣言経路自体は生きている**
- `advisoriesForHost` :314-331 / `declaredFormalCheckArgv` :334-348（ADR-6 の一般化点2 = run-now argv の供給点）

**checkpoint 発火点**（`packages/framework/core/tools/amadeus-orchestrate.ts`）

- `ACTIVATION_ADVISORY_STAGES` :1785-1789 = `requirements-analysis` / `functional-design` / `build-and-test`
- 2 call site: `emitActivationAdvisory` :1808-1820（latch 付き stderr）/ `raiseActivationAdvisoriesFor` :1844-1858（guard 用の非 latch 判定）。コメント :1796-1803 が両者の乖離を明示的に戒めている → **供給側に触る変更は必ず両方を棚卸しすること**
- guard: `applyPendingAdvisoryGuard` :814-866 → `guardAdvisoryChoices`（:819）→ hold なら autonomy ladder → `await-advisory-choice` directive（`run_required` / `formal_checks` は :861-863）

**run-now ルート構成**（`packages/framework/core/tools/amadeus-advisory-choice.ts`）

- 設計コメント :922-924 逐語「A declaration with no executable side (formalCheck: null) contributes no route — its release is the plugin's own evaluator saying no-hold on the next `next`, never a verification this engine invents on its behalf.」（:925 は `function declaredFormalCheckRoute(` の宣言行 — レビュアー双方の off-by-one 訂正が正しい）
- `declaredFormalCheckRoute` :925-955 — 予約トークンは **`{out}` / `{advisory-instance}` / `{target}` / `{spec-identity}` の4種**（:939-944）。未知トークンは `resolveArgvTokens` が null → ルート不成立（fail-loud）
- `resolveRunRequiredHold` :978-1019 — ルート null なら `DECLARED_RELEASE_RULE`（:962-963 逐語「declared advisory: release requires the plugin's own evaluator to return no-hold」）を result に載せて hold 継続

> **案A に効く事実（測定）**: run-now ルートの供給機構は**すでに完成しテストで両側固定済み**（`t445-advisory-declaration-supply.integration.test.ts:297-322` の `RUNNABLE_DECLARATION` がトークン解決込みで PASS を固定）。実 manifest の `formalCheck` を非 null にすれば **engine 変更なしでルートが立つ**。
>
> **ただし** ルートの `stage` は `declaredFormalCheckRoute` 内でハードコードされている。Architect 独立実測（observed 断面、`sed -n '946,950p'`）による逐語:
>
> ```
>   return {
>     stage: "formal-model-check",
> ```
>
> 該当行は **`amadeus-advisory-choice.ts:948`**。**`tla-authoring` を遷移先に指す手段が現行の一般化点に存在しない** — ADR-6 が一般化したのは argv（`declaredFormalCheckArgv`）だけで、**遷移先 stage は一般化されていない**。案A 項目2 の設計裁定の核心。

### 2b. subjects 供給ギャップ（本 Issue の根本）

- `defaultSubjectsPath`（`plugins/formal-model-check/tools/tla-authoring.ts:453-455`）Architect 独立実読の逐語:
  ```
  export function defaultSubjectsPath(workspaceRoot: string = process.cwd()): string {
    return join(resolveSpecRoots(workspaceRoot).tlaDir, "authoring-subjects.json");
  }
  ```
  → 本 repo 解決先 `amadeus/spaces/default/specs/tla/authoring-subjects.json`。**実在しない**（`ls -d` → `No such file or directory`、実測）
- スキーマ `GovernedSubjects` :457-476 — `{ documents: [{path, kind: "requirements"|"decisions"}], subjects: string[] }`。documents / subjects とも空配列は不可（:465-466 → :521-523 `governed-subjects-unreadable` fail-closed）
- `governedIdentity` :479-496 — 各 document を `IdentityDigest.extractStableSections(text, kind)` にかけ宣言 id を回収。未解決 id が残れば :494 `unresolvable-id` fail-closed
- `advisoryHold` :498-532 — **ENOENT のみ no-hold**（:507-508）。それ以外は fail-closed

**書き手の不在（P1 の全数内訳、7 hit）**:

```
amadeus/.../260804-tla-authoring/construction/applicability-hold/code-generation/code-generation-plan.md:10
amadeus/.../260804-tla-authoring/construction/applicability-hold/code-generation/code-summary.md:28
amadeus/.../260807-tla-specs-relocation/inception/reverse-engineering/developer-scan.md:157
docs/reference/22-formal-model-supply.ja.md:112
docs/reference/22-formal-model-supply.md:223
plugins/formal-model-check/tools/tla-authoring.ts:454   ← 読み手（パス解決）
tests/integration/t481-spec-root-resolver.integration.test.ts:227   ← パス等価のテスト
```

内訳: record 3 / docs 2 / 読み手 1 / テスト 1 = **書き手 0 件**。`tla-registration.ts` が atomic replace で書くのは **model-map のみ**（:265-270 の staging + `renameSync`）で、subjects 宣言の書き手はそこにも無い。

**独立再現（read-only、repo ルート）**:

```
$ bun plugins/formal-model-check/tools/tla-authoring.ts advisory hold
{"ok":true,"verdict":{"kind":"no-hold"},"reason":"no governed subjects are declared"}
exit=0     stderr 空     git status 不変
```

> ### 🔴 R1: 要件見出しの文法が実コーパスとほぼ一致しない（3/134）
>
> `plugins/formal-model-check/tools/tla-evidence.ts:45` の Architect 独立実読による逐語:
> ```
> const REQUIREMENTS_HEADING_RE = /^###\s+((?:FR|NFR|AC)-\d{3})\b/;
> ```
> 3桁ゼロ埋めを要求する。P2/P3 の実測は **134 ファイル中 3 ファイルのみ一致**（`260709-framework-repair-batch` / `260708-installer-distribution` / `260804-tla-authoring`）。
>
> 実分布（述語: 同集合へ `grep -hoE '^###\s+[A-Z]+-[0-9A-Za-z-]+'` → 数字を N へ正規化 → 頻度集計）: `### FR-N` 503 / `### NFR-N` 112 / `### FR-N-N` 27 / `### AC-N` 21 / `### USR-N` 10 / `### SC-N` 7 / `### FR-CROSS-N` 4 / `### FR-NA` 3 ほか。**通常の intent は `### FR-1` 形で3桁ゼロ埋めではない。**
>
> 対照（P4）: decisions 側は `^##\s+ADR-[0-9]+` が **56 中 54** で健全（:46 逐語 `const DECISIONS_HEADING_RE = /^##\s+(ADR-\d+)\b/;`）。
>
> **含意**: 供給経路を「intent 成果物（requirements.md）から直接評価」で組むと、現行文法では大半の intent で `unresolvable-id` fail-closed（= 全 checkpoint が赤）。選択肢は (i) `REQUIREMENTS_HEADING_RE` を実文法へ広げる (ii) 供給側で id を正規化する (iii) 供給対象を decisions（ADR）に寄せる — **いずれも設計段の明示裁定が要る**。requirements-analysis へ持ち上げるべき第一級の論点。

> ### 🔴 R2: subjects の置き場が advisory 監視 glob の内側（演繹、未実測）
>
> `packages/framework/core/tools/amadeus-plugin-activation.ts:49-51` の Architect 独立実読による逐語:
> ```
> // cg-watch-root-separation), so the watch is declared as `tla/**`; the evidence
> // store (`<specsRoot>/tla-evidence`) sits outside the glob by construction.
> export const ACTIVATION_WATCH_GLOBS: readonly string[] = ["tla/**"];
> ```
> glob 基底は `specRootForHost`（= `amadeus/spaces/<space>/specs`）。`defaultSubjectsPath` は `specs/tla/authoring-subjects.json` を指すため **subjects 宣言は glob の内側**にある。**このコメント自身が「evidence store は構造上 glob の外」と設計意図を明言しており**、subjects だけが内側という非対称が verbatim で裏付けられる。
>
> → subjects を書く/更新するたび spec-hash が変わり、兄弟の activation advisory（`changed`）が発火する見込み。**これは glob 定義と解決先パスの照合による演繹であり、ハッシュ再計算の実測は行っていない**（設計段で1手の実測を推奨）。書き手を作る前に置き場の裁定が要る。

### 2c. applicability judge 経路と CLI verb 全数

`plugins/formal-model-check/tools/tla-applicability.ts`:

- `judge` :121-138 — J1（空 subject → `undecidable`）、J1（model map 不読 → `missing-evidence`）、J2 矛盾4形（:91-96 `J2a`〜`J2d`）、consistent 4経路（:99-104）。ルート↔行対応 :83-88（`non-target`=J3 / `impl-only`=J4 / `revise-model`=J5 / `author-new`=J6）
- `ApplicabilityReceipt` :147-157 — `route / subjectIdentity / subjectSeries / subjects / reason / judgedBy / humanApproval / generatedAt / predecessor`
- `buildReceipt` :176-198 — 終端2経路（`impl-only` / `non-target`、:169）は検証済み human approval 必須、欠ければ :183-185 `approval-missing`
- `HoldReason` :211-214 = `no-applicability-receipt` / `authoring-incomplete` / `stale-evidence`
- `evaluate` :319-352 — 系列一致 entry 0 件なら :340-342 で `no-applicability-receipt`、tip ごとに `tipReason` :297-311。store 一部でも読めなければ :338 `evidence-unreadable` fail-closed

**CLI argv dispatch（`tla-authoring.ts` :746-792）— 全 verb 完全列挙**:

| 形 | verb | ハンドラ |
|---|---|---|
| group+verb | `identity extract` / `identity compare` | :150 / :173 |
| group+verb | `bundle build` / `verify` / `read` / `list` / `head` | :201 / :237 / :258 / :267 |
| group+verb | `applicability judge` / `receipt` / `series` | :351 / :373 / :399 |
| group+verb | `advisory hold` | :498 |
| flat | `hold` | :407 |
| flat | `trace` | :592 |
| flat | `proof`（async） | :625 |
| flat | `commit` | :669 |

フラグ形式は `--name value` の対のみ（`parseFlags` :101-112、奇数長・非 `--` 先頭は null → usage exit 2）。`import.meta.main` エントリ :805-807、in-process seam `runTlaAuthoring` :795-803。

### 2d. FR-005 receipt surface — owner の不在

- 永続 kind は2つ（`tla-evidence.ts:229-231` `EvidenceParts`）= `authoring-bundle` / `terminal-route-receipt`。必須 part は :274-275（`AUTHORING_RECEIPTS = ["applicability","trace","proof","review","approval"]` / `TERMINAL_RECEIPTS = ["applicability","approval"]`）
- **書き手は `bundle build` のみ**（`tla-authoring.ts:201-228` → `EvidenceBundle.build`）。`applicability receipt`（:373-397）は receipt JSON を **stdout に返すだけで永続化しない**（store 書込コードが関数内に不在）
- `tla-authoring` stage は終端経路を明示拒否。Architect 独立実読（`stages/tla-authoring.md:40-44`）逐語:
  ```
  Refuse to start on a terminal route as well. `impl-only` and `non-target`
  carry no authoring work, so a receipt naming either one ends the stage
  instead of opening it.
  ```
- → **FR-005 の非対象 receipt を発行する owner がワークフロー上どこにも存在しない**（reviewer-2 の「FR-005 空文化」指摘の機構レベル裏付け）。残すには「`applicability receipt` の出力 + approval を手で parts へ組んで `bundle build`」の2手が要り、自動発行点はゼロ
- evidence store 実体 `amadeus/spaces/default/specs/tla-evidence` は**未作成**（`ls -d` → `No such file or directory`、Architect 実測）

### 2e. BR-U2-05 / ADR-6 の契約面

**BR-U2-05 の逐語ピン2箇所**:

1. `tests/integration/t445-advisory-declaration-supply.integration.test.ts:180-182`:
   ```
   // BR-U2-05: a declared advisory with no runnable check (formalCheck: null) is
   // released only by its own evaluator returning no-hold. `next` and `report`
   // must agree on that — a run-now choice releases neither side.
   ```
2. `amadeus/.../260804-tla-authoring/construction/applicability-hold/functional-design/business-rules.md:15`:
   `| BR-U2-05 | hold 解除の唯一の経路は C9 の no-hold verdict。C7(authoring 作業)も conductor も checkpoint を迂回できない | ... |`

> **精密化（測定に基づく）**: BR-U2-05 が縛るのは「**評価器の no-hold が唯一の解除経路**」であって「`formalCheck` は永久に null」ではない。t445 のテストはすべて架空の `demo` plugin fixture（:213-231 が temp に `plugins/demo/plugin.json` を生成）で駆動され、**実 `plugins/formal-model-check/plugin.json` の `advisories` を assert するテストは 0 件**（P5 = 0 hit）。
> → **実 manifest の `formalCheck` を埋めても既存テストは1件も壊れない。** 衝突は「テスト破壊」ではなく「BR-U2-05 の意味論（解除権は評価器のみ）を run-now ルート追加が侵さないか」という**設計裁定に純化される**。

**ADR-6 の現状**（`amadeus/.../260804-tla-authoring/inception/application-design/decisions.md`）:

- Decision :64 逐語「hold 強制の owner を C9 AuthoringHoldEvaluator とし、既存 advisory checkpoint 機構へ plugin readiness 評価経由で advisory + formal_checks を供給する。… engine 側のコード・契約は変更しない。」
- 改訂1 :65（2026-08-04T18:29:01Z 人間裁定）— 末尾を「checkpoint 機構（発火点・解除規則）は無変更のまま、**advisory 供給面の宣言読取一般化に限る小さな engine 変更（宣言 parse と formal-check route の2一般化点）**を行う」へ改訂
- 改訂2 :69 は同裁定の詳細転記
- 一般化点の現行 call site: `declaredFormalCheckArgv` = `amadeus-advisory-choice.ts:20`（import）/ `:932`（唯一の呼び出し）。`advisoriesForHost` = `amadeus-advisory-choice.ts:974` / `amadeus-orchestrate.ts:1816` / `:1817` / `:1847`
- ADR-7 :76-83 が terminal-route-receipt の2 kind 収容と「書き手は C4 に単一化」を規定

---

## 3. テスト / ピン棚卸し（案A が変える挙動を固定しているもの）

述語: `ls tests/integration | grep -iE 't445|advisory|tla'` + `git grep -ln 'authoring-hold' -- tests/`

| ファイル:行 | 何をピンしているか | 案A での扱い |
|---|---|---|
| `t445-tla-applicability-cli.integration.test.ts:354-359` | 「a workspace governing no subjects is a real no-hold, evaluated not suppressed」— 不在 → exit 0 / `no-hold` | 案A が subjects を供給しても本テスト自体は不変（明示 `--subjects-file <不在パス>` 駆動、:355）。「不在=正常系」契約の再解釈が要るなら**明示改訂対象** |
| 同 :346-352 | 壊れた宣言 → exit 1 `governed-subjects-unreadable` | 維持 |
| 同 :361-370 | 有効宣言 → exit 1 `hold`（`### FR-001` + `subjects:["FR-001"]`） | 維持。**案A の供給フォーマットの正準参照** |
| 同 :372-381 / :383-388 | `unresolvable-id` / 空 documents+subjects の fail-closed | 維持 |
| `t445-advisory-declaration-supply.integration.test.ts:180-182` | BR-U2-05 コメント逐語 | 意味論の明示改訂が要るなら本コメント + `business-rules.md:15` の**対で**改訂 |
| 同 :257-274 | `formalCheck: null` の run-now が両側 hold（:266 / :267） | demo fixture 駆動のため実 manifest 変更では壊れない（P5） |
| 同 :297-322 | `RUNNABLE_DECLARATION` のトークン解決ルート成立 | `formalCheck` を埋める場合の**既存 green 経路** |
| 同 :324-337 / :276-291 | 未知トークン → ルート無し / report 側の release-hold 対称性 | 維持 |
| `tests/unit/t444-advisory-declaration.test.ts:17,28,48-53,61-66` | 宣言 parse の `formalCheckArgv` 両側 | 維持 |
| `t445-stage-frontmatter-compose.integration.test.ts:135` | 逐語 `"scopes: []"` | 案C（stage 自動選択化）は本行と衝突。**案A は触らない** |
| `t450-tla-authoring-stage-e2e.integration.test.ts:130 / :163 / :255` | frontmatter の opt-in shape / 終端経路拒否が FD 固有の追加である宣言 / composed runtime の e2e | **:163 は FR-005 の owner を stage 外に固定しているピン。案A 項目3 で衝突しうる** |
| `t481-spec-root-resolver.integration.test.ts:227` | `defaultSubjectsPath(root)` の path 等価 | パス変更（R2 の置き場裁定）時は要改訂 |
| `t381-advisory-checkpoints-latch` / `t458-advisory-auto-resolution` / `t470-advisory-store-recovery` | latch / autonomy 解決 / store 復旧 | 供給が実際に hold を出して**初めて実効的に通る**経路。回帰確認対象 |

---

## 4. Same-root（3兄弟クラスタ）

| Issue | 状態（実測） | 案A サーフェスとの交差 |
|---|---|---|
| #2018 | CLOSED | Codex worktree の opt-in 状態欠落。交差なし |
| #2267 | **OPEN**、`enhancement` / `P2`、updatedAt `2026-08-05T07:15:38Z` — 「plugin projection が plugin.json を投影せず、宣言駆動 advisory がユーザーワークスペースで供給されない」 | **交差あり**。`pluginManifestPath` は `<projectRoot>/plugins/<plugin>/plugin.json` を読む（:243-245）ため、案A が `plugin.json` の `formalCheck` を埋める設計を採ると効果は `plugins/` を持つ本 repo 限定で、ユーザーワークスペースには #2267 解消まで届かない。**受け入れ基準を「本 repo で効く」で書くか「配布面でも効く」で書くかが分岐点** |
| #2766 | 本件 | — |

---

## 5. 技術的負債・リスクメモ（案A 実装を危うくする現行コードの性質）

1. **🔴 R1 見出し文法とコーパスの不一致**（§2b）— intent 要件を直接読む設計なら 134 中 131 で `unresolvable-id` fail-closed。設計段の最優先論点
2. **🔴 R2 subjects の置き場が監視 glob の内側**（§2b、演繹）— 書き手を作る前に置き場の裁定が要る
3. **`resolveSpecRoots` は active space cursor 依存**（`amadeus-formal-verif-model-map.ts:126-140`、`activeSpaceFromCursor(workspaceRoot)`）— cursor 未設定・複数 space 構成で供給先が動く。cursor は per-user・gitignored のため、テスト帰属判定では **ambient 入力として第一容疑**にすること（`cid:build-and-test:c1-tsr-ambient-repro-on-base`）
4. **`LegacySpecError` fail-closed**（:122-129）— `specs/tla/` に `.tla` か `model-map.json` があると throw。本 worktree は legacy 不在で現状問題なし。ローカル実験で legacy を作ると全経路が落ちる
5. **evidence store が実在しない**（実測）— 案A で hold を実発火させると、まず `no-applicability-receipt` hold が全 intent の RA/FD/B&T で立ち、解除には receipt + bundle build の運用が必須。**段階導入（governed subjects を最小集合から開始）を設計に織り込まないと着地直後に全 intent が止まる**
6. **`declaredFormalCheckRoute` の `stage` はハードコード**（`amadeus-advisory-choice.ts:948`、§2a に逐語）— ADR-6 の一般化点は argv だけで**遷移先 stage は一般化されていない**
7. **evaluator は同期 spawn、60 秒 timeout / 8MiB バッファ**（`amadeus-advisory-declaration.ts:292-306`）— 供給経路が intent 成果物を全走査する重い実装になると 3 checkpoint × 毎 `next` でコストが乗る。timeout 超過は「読めない verdict」= hold（fail-closed）のため、**遅い供給実装はそのままワークフロー停止に化ける**
8. **`emitActivationAdvisory` は 2 call site**（:1808 / :1844）— 片方だけ変えると latch と guard の判定が乖離する（コメント :1796-1803 が明示）
9. **影響規模の再実測**: 述語 `git log --diff-filter=A --name-only --format="" 97ef0f745..91f37ec85 -- 'amadeus/spaces/default/intents/*/amadeus-state.md' | grep -c 'amadeus-state.md'` → **14**（reviewer-2 の値を observed で独立再現）。`model-map.json` の登録モデルは `grep -c '"name":'` → **2** のまま

---

## クロスレビュー引用のスポット再検証（3件、いずれも observed で完全一致）

1. `tla-authoring.ts:507-508` — 行番号・逐語とも一致
2. `amadeus-advisory-choice.ts:922-924` が逐語本文、`:925` が `function declaredFormalCheckRoute(` の宣言行 — レビュアー双方の off-by-one 訂正が正しい
3. `stages/tla-authoring.md:5` の `with or without --single` と `:14` の `scopes: []` — 一致。「`--single` 必須」は誤りという訂正が正しい

---

## 未検証項目（明示）

- **engine の完全な `next` 経路** — state 変更を伴うため read-only 契約下で未実行。checkpoint での評価器起動は reviewer-2 の in-process probe を一次入力として採用し、本 RE では再実行していない
- **`ACTIVATION_WATCH_GLOBS` への subjects 追加が実際に spec-hash を変える点（R2）** — glob 定義（`["tla/**"]`）と `defaultSubjectsPath` の解決先（`specs/tla/...`）の照合による**演繹**であり、ハッシュ再計算の実測は未実施。設計段で1手の実測を推奨
- **#2267 解消後にユーザーワークスペースで案A がどう振る舞うか** — 未評価。§4 の交差指摘までが本スキャンの射程
- **`### FR-N` 形の実分布集計（503 / 112 / …）** — Developer scan の集計値であり、Architect が独立再実行したのは P2/P3/P4 の**ファイル数**のみ。分布の内訳は再現していない

---

## codekb 整合上の申し送り（Architect 実測、本 Issue の患部外）

- **マージ衝突予告**: 本 worktree HEAD（`91f37ec85`）の codekb は clean で、`reverse-engineering-timestamp.md` / `component-inventory.md` とも現在断面は **`260809-sensor-parseflags-failop`** だった。本 RE はこれを c3-relabel で履歴へ降格し、`260810-tla-applicability-wiring` を現在として前置した。一方**本線チェックアウト側では intent `260809-report-done-kind-split` の RE が未コミットで並行進行中**（本セッション開始時点の `git status`: `M component-inventory.md` / `M reverse-engineering-timestamp.md` / `?? re-scans/260809-report-done-kind-split.md`。re-scans 総数は本 worktree 側で 122、当該ファイルは未存在）。**同 RE も現在マーカーを主張するため同一アンカー行で衝突する**見込み。`cid:code-generation:shared-ledger-insert-collision` に従い和集合で、現在マーカーは実施時刻の新しい側を採る形で解消すること（`cid:reverse-engineering:re-timestamp-merge-resolution`）
- ⚠ **本 RE 進行中に codekb ファイルの実体が入れ替わった**（作業メモ）: 起票直後の `reverse-engineering-timestamp.md` 読取は `260809-report-done-kind-split` を現在とする内容を返したが、同時刻の `git diff --stat HEAD -- codekb/` は空・`git status` も clean で、後続の `od -c` 実読では `260809-sensor-parseflags-failop` が現在だった。**worktree ディスクの実測を正**とし、初回読取は本線チェックアウト側コピーの混入とみなして破棄した。以後の codekb 照合は `git status` / `od` / `grep` の実測に一本化している
- `business-overview.md` / `technology-stack.md` / `dependencies.md` は**現在マーカーを2つ持つ**（それぞれ :3 と :11〜:13）— 260807 期の相対的に古いドリフトで本 Issue の患部外。同根棚卸し候補として記録するに留める

# Reverse Engineering スキャンノート — intent 260723-marker-heading-exemption (Issue #1296)

## 実行メタデータ

- Date (UTC, `date -u` 実測): `Thu Jul 23 01:30:42 UTC 2026`
- HEAD SHA (`git rev-parse HEAD`): `ffc79aad9a53c600ea9b464f1f04c6fa627ae59e`
- Base SHA (`git rev-parse a81c11dde`): `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`
- Branch: `team/20260722-233519-0637/engineer-5`
- 直近 codekb scan: `260722-teamup-prompt-race.md`(observed a81c11dde)
- 測定 ref: 特記なき件数・grep は全て **worktree HEAD (ffc79aad9)** の作業ツリーで測定
- 方式: 既存 codekb からの差分リフレッシュ + バグ面焦点スキャン

### 差分リフレッシュ(base a81c11dde..HEAD の非 record 差分)

`git diff --stat a81c11dde..HEAD` の非 record 差分は本バグ面と無交差(タスク供与の検証済み事実を実測で追認):

- `scripts/team-up.sh` (+163)、`tests/integration/t-team-up-*.test.ts` 3本、`metrics/2026-07-23T00-39-38-403Z-*.json` 1件
- ほか elections/E-TPRRAS13/* と memory 層 2ファイル(project.md/team.md +3行)、knowledge/domain-language.md — いずれも required-sections センサー実装(`packages/framework/core/tools/amadeus-sensor-required-sections.ts`)・graph・stage marker 宣言に無関係
- 結論: バグ面の実装は base..HEAD で不変。以下の焦点スキャンは HEAD の実ファイル直読による。

---

## 1. センサー実装の全経路(`packages/framework/core/tools/amadeus-sensor-required-sections.ts`, 232 行)

### 1.1 pass predicate = 汎用 ≥2-H2 floor(免除なし)— **バグの所在**

```
140:	const h2_count = headings.length;
141:	let pass = h2_count >= 2;
...
147:	let findings_count = Math.max(0, 2 - h2_count);
148:	const result: Result = { pass, h2_count, headings, findings_count };
```

- floor は **全成果物に無条件適用**される。marker(単一行 timestamp / [Answer] 様式 questions)を floor から免除する分岐は**存在しない**。
- H2 見出しの数え方(:83-94 `parseH2Headings`): `^## `(ハッシュ2個+空白)開始行を trim・exact dedup。`### ` は char[2] が `#` で除外(:136-137 コメント)。単一行 marker は H2=0 → `pass=false`, `findings_count=2`。

### 1.2 template-override 分岐(:150-204)と ELIGIBILITY GATE

- template が解決したときのみ、`##` heading set が floor を **置換**する(`pass = expected ⊆ output`)。
- ELIGIBILITY GATE(:167-186):stem が `--template-eligible` 集合に含まれるときのみ template を適用。含まれない(=marker)場合は template を**無視**し `template="ineligible"` + `config_warning` を出す — **ただし floor はそのまま維持**される(:184-185 verbatim: `template ignored, keeping the generic >=2-H2 floor`)。
- 重要: このゲートは「marker に template を当てない」だけで、「marker を floor から免除する」ものではない。GA では template は普通 miss する(:163-165)ため、marker は常に floor で FAIL する。

### 1.3 stem 導出(:173)

```
173:	const stem = basename(flags.outputPath).replace(/\.md$/, "");
```

- センサースクリプトは graph 非依存。判別は **出力ファイル名の stem** で行う。`practices-discovery-timestamp.md` → stem `practices-discovery-timestamp`(`-timestamp` 終端)。この stem がそのまま免除判定の素材に使える。

### 1.4 dispatcher による `--template-eligible` スレッド(`amadeus-sensor.ts`, :414-438)

```
428:	if (id === "required-sections") {
429:		const eligible = stageTemplateEligibleArtifacts(stageNode);
...
433:		scriptArgs.push("--template-eligible", eligible.join(","));
```

- dispatcher(GraphStage 保持)が `stageTemplateEligibleArtifacts(stageNode)`(:299-307 = `produces + optional_produces` を `templateEligibleArtifacts` に通す)を組み立て、`--template-eligible` としてスクリプトへ渡す。
- スクリプト側は graph を持たないため、この集合を唯一の marker/prose 弁別の外部入力として受ける(:414-421 コメント verbatim: 「Eligibility = the required + optional output names that are NOT questions/timestamp markers」)。

### 1.5 exit code の注意(再現節と関連)

- pass:false でもスクリプトは `process.exit(0)`(:226)。verdict は JSON の `pass` フィールドで読む(cid:manual-sensor-fire-before-gate-report の追補 E-1059-RA と整合)。dispatcher 経由では audit の SENSOR_PASSED/FAILED 行で確定。

---

## 2. template-eligible 集合の生成元(`amadeus-graph.ts`, :787-809)— **再利用可能な弁別ロジック**

```
801:	export function templateEligibleArtifacts(produces: string[]): string[] {
802:		return (produces ?? []).filter(
803:			(a) =>
804:				typeof a === "string" &&
805:				a.length > 0 &&
806:				!a.endsWith("-questions") &&
807:				!a.endsWith("-timestamp")
808:		);
809:	}
```

- marker 弁別の基準は **artifact 名の suffix**(`-questions` / `-timestamp`)。filename パターンでも artifact kind でもなく **suffix 文字列**。
- コメント(:787-800 verbatim 抜粋):「a `*-questions.md` Q&A file or a `*-timestamp.md` marker is intentionally not a ≥2-H2 doc, so applying a heading-set template to it would yield spurious missing-section findings」。
- **この suffix 述語が floor 免除へそのまま再利用可能**。artifact 名 X ↔ 出力 stem X(X→X.md 規約、resolveArtifactPath、amadeus-orchestrate.ts:649 参照)なので、センサー側の `stem.endsWith("-timestamp"||"-questions")` は graph 側 `templateEligibleArtifacts` の否定と一致する。
- 設計上の含意: 免除述語を1つの canonical 定義(例 `isMarkerArtifact(name)`)へ抽出し、graph の filter とセンサー floor 免除の両方をそこから導出すれば、2定義ドリフト(cid:code-generation:c1 系の集合分裂)を回避できる。現状は suffix チェックが graph 側にインライン1箇所。

---

## 3. marker artifact の全数目録(全 stage ファイル、occurrence 単位・除外フィルタなし)

`grep -rnE "^\s*-\s+.*(-timestamp|-questions)\s*$" .claude/amadeus-common/stages/` の全出力(件数 = コマンド出力転記):

- **合計 20 件**(内訳: `-questions` **18 件** / `-timestamp` **2 件**)。全て `produces:`(optional_produces ではない)配下。

| stage ファイル:行 | artifact |
|---|---|
| construction/ci-pipeline.md:12 | ci-pipeline-questions |
| ideation/approval-handoff.md:13 | approval-handoff-questions |
| ideation/feasibility.md:15 | feasibility-questions |
| ideation/intent-capture.md:13 | intent-capture-questions |
| ideation/market-research.md:13 | market-research-questions |
| ideation/rough-mockups.md:15 | rough-mockups-questions |
| ideation/scope-definition.md:13 | scope-definition-questions |
| ideation/team-formation.md:13 | team-formation-questions |
| inception/delivery-planning.md:15 | delivery-planning-questions |
| inception/practices-discovery.md:16 | practices-discovery-timestamp |
| inception/refined-mockups.md:17 | refined-mockups-questions |
| inception/requirements-analysis.md:13 | requirements-analysis-questions |
| inception/reverse-engineering.md:19 | reverse-engineering-timestamp |
| operation/deployment-execution.md:14 | deployment-execution-questions |
| operation/deployment-pipeline.md:13 | deployment-pipeline-questions |
| operation/environment-provisioning.md:14 | environment-provisioning-questions |
| operation/feedback-optimization.md:15 | feedback-optimization-questions |
| operation/incident-response.md:13 | incident-response-questions |
| operation/observability-setup.md:16 | observability-setup-questions |
| operation/performance-validation.md:13 | performance-validation-questions |

### canonical shape(stage 本文で確認)

- **timestamp = 単一行**。`inception/practices-discovery.md:106` verbatim:
  `4. **practices-discovery-timestamp.md** — single line: `Discovered: <ISO-8601 timestamp> at commit <hash>`. Used by future doctor checks for staleness.`
  実ファイル例(260720-formal-verif-experiment)も単一行(§6 参照)。H2=0。
- **questions = [Answer] 様式**(cid:requirements-analysis:answer-evidence-predicate-scope の対象)。`ideation/intent-capture.md:48` verbatim: `Create `<record>/ideation/intent-capture/intent-capture-questions.md` with questions:`。実測でも H2=0(§6)。
- どちらも「意図的に H2 を欠く」構造 = E-FVEPD の免除対象そのもの。

---

## 4. 配布面の全数

### 4.1 センサースクリプト正本 + 生成物(`find -name amadeus-sensor-required-sections.ts`)

- **正本 (1)**: `packages/framework/core/tools/amadeus-sensor-required-sections.ts`
- **dist (6)**: `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/.<harness>/tools/amadeus-sensor-required-sections.ts`
  - claude→`.claude`, codex→`.codex`, cursor→`.cursor`, kiro→`.kiro`, kiro-ide→`.kiro`, opencode→`.opencode`
- **self-install (4)**: `./.claude/tools/`, `./.codex/tools/`, `./.cursor/tools/`, `./.opencode/tools/`
  - 注: トップレベル self-install は `.claude .codex .cursor .opencode` の**4ツリーのみ**(`.kiro`/`.kiro-ide` はトップレベルに存在せず、kiro 系は dist 配下のみ)。
- 合計 **11 コピー**。正本を触ったら `bun scripts/package.ts`(dist 再生成)+ `bun run promote:self`(self-install 反映)で同期必須(project.md Mandated)。`dist:check` / `promote:self:check` がドリフトガード。

### 4.2 sensors manifest(`find -name amadeus-required-sections.md -path "*sensors*"`)

- **正本 (1)**: `packages/framework/core/sensors/amadeus-required-sections.md`(全 69 行を直読)
- dist (6) + self-install (4) = 同構成の 11 コピー。
- manifest 直読の要点:
  - `:8` verbatim: `matches: "**/{amadeus-docs,intents}/**"` — **フィルタ**。marker が `intents/`(record dir)配下なら match するが、`codekb/` 配下(reverse-engineering-timestamp.md)は match せず(§6 の filter-mismatch と整合)。
  - `:27-28`: `Default mode: checks the output contains at least 2 H2 headings`。
  - `:52-53` verbatim: `a template resolving for a questions/timestamp marker is ignored with a config warning, and the marker keeps the generic floor.` — 現行仕様が「marker は floor を保持する」と明記しており、**修正はこの manifest 記述も更新対象**(免除を明文化)。
  - `output_schema`(:12-21): pass/h2_count/headings/findings_count/edge_block/template/template_expected/template_missing/config_warning。免除を観測可能にする新フィールド(例 `marker_exempt`)を足すなら schema 追記が要る(設計判断)。

---

## 5. 既存テスト(落ちる実証 / corpus sweep 面)

`grep -rln "required-sections|amadeus-sensor-required-sections"` の該当から、floor/eligibility を直接駆動するもの:

- **`tests/unit/t155-template-override.test.ts`(最有力の in-process seam)**
  - `:1` covers: `function:templateEligibleArtifacts, function:memoryTemplatesDir, function:frameworkTemplatesDir`。実スクリプトを spawnSync で駆動(PROCESS 境界)+ `templateEligibleArtifacts` を in-process 呼び。
  - `:130` test 「filters out -questions and -timestamp markers, keeps prose artifacts」— marker 弁別の既存カバレッジ。fixture: `requirements-analysis-questions`(:133), `reverse-engineering-timestamp`(:135)。
  - `:251` test 「no template resolves → generic >=2-H2 floor (template field absent)」、`:267` test 「third branch holds even with no --templates-dir flag at all (bare call)」`:274` `expect(r.pass).toBe(false)` — **floor の pass:false を固定している既存テスト**。marker 免除を入れると、この floor テストの入力が marker 名でないことを保つ必要がある(prose 名 `requirements` を使用: :259)。ここが免除の新テスト(marker stem → pass:true)を足す自然な箇所。
  - この seam は実 FS を触る integration 相当だが unit ディレクトリに存在。新規テストは cid:code-generation:fs-tests-integration-first / seam の既習様式に従う。
- `tests/integration/t92.test.ts`: `amadeus-sensor fire` の PROCESS 境界(SENSOR_FIRED/FAILED, detail files)を spawn 46 ケース。dispatcher 経由の end-to-end 挙動(`--template-eligible` スレッド込み)を検証するなら corpus/dispatcher 面はここ。
- `tests/unit/t86-sensor-manifest-schema.test.ts`: manifest schema 検証。output_schema を変える場合の影響先。
- `tests/integration/t212-optional-produces.test.ts`, `t133`(edge-block 分岐): 隣接ブランチのテスト。

### corpus sweep(cid:code-generation:corpus-sweep-for-new-guards)対象規模

- `intents/` 配下 marker(センサー filter に match する実 corpus):
  - `*-questions.md`: **391 件**
  - `*-timestamp.md`: **22 件**
- `codekb/` 配下 `*-timestamp.md`: **1 件**(filter `**/{amadeus-docs,intents}/**` に match せず、免除前でもセンサー非発火 = matches-rejection)。
- 免除実装後は、これら 391+22 件が floor から免除され pass:true になる想定。落ちる実証(注入)は marker 免除経路を実際に踏む面へ(cid:injection-surface-verify)。

---

## 6. 再現確認(読み取り専用の診断実行、書込なし)

コマンド:
```
bun .claude/tools/amadeus-sensor-required-sections.ts --stage practices-discovery \
  --output-path amadeus/spaces/default/intents/260720-formal-verif-experiment/inception/practices-discovery/practices-discovery-timestamp.md
```

対象ファイル内容(単一行):
```
Discovered: 2026-07-20T06:43:20Z at commit d588c117a1e83ac6bac74bf586294d4db1a26add; Sources: code-structure.md, technology-stack.md, dependencies.md, code-quality-assessment.md, architecture.md, business-overview.md
```

出力(全文、破棄なし):
```
{"pass":false,"h2_count":0,"headings":[],"findings_count":2}
```
- exit code: **0**(pass:false は JSON フィールドで表出、スクリプトは常に exit 0)。
- **バグ現存を確認**: 単一行 timestamp が floor で `pass:false`。

追加確認(questions 面):
```
bun .claude/tools/amadeus-sensor-required-sections.ts --stage intent-capture \
  --output-path amadeus/spaces/default/intents/260716-teamup-resume-size-drift/inception/requirements-analysis/requirements-analysis-questions.md
→ {"pass":false,"h2_count":0,"headings":[],"findings_count":2}
```
- `-questions` marker も同様に floor FAIL を確認。timestamp / questions の両クラスで再現。

---

## Architect への引き継ぎ疑問(未決の設計判断)

1. **免除述語の canonical 化**: marker 判定は現在 `templateEligibleArtifacts`(graph.ts:806-807)に suffix チェックがインライン。センサー floor 免除を足すとき、(a) センサー内に stem suffix チェックを独立に書く / (b) 共有 `isMarkerArtifact(name)` を graph に抽出し両者から導出、のどちらにするか。cid:code-generation:c1(canonical 1定義)・cid:requirements-analysis:enumeration-* の観点では (b) が2定義ドリフト回避に有利だが、センサースクリプトは graph import を避ける設計(`amadeus-lib.ts` の parseBoltDag のみ import)。抽出先を lib にするか graph にするかは設計判断。

2. **免除の表現**: 免除時に `pass=true` へ倒すだけか、観測用に `marker_exempt: true` フィールドを Result / manifest output_schema へ足すか(検証劇場回避のため「消費されないフィールド」は禁止 — 足すなら dispatcher/detail が読む配線まで)。

3. **弁別入力**: センサーは既に `--template-eligible`(marker を除いた集合)を受けている。免除判定を (a) stem suffix 直接 / (b) `stem ∉ template-eligible` のどちらで行うか。(b) は bare call(`--template-eligible` 空)で全成果物が「非 eligible」に見えるため不健全 → (a) suffix 直接が堅牢(§1.3/§2 参照)。

4. **manifest 記述の同期**: `packages/framework/core/sensors/amadeus-required-sections.md:52-53` の「marker keeps the generic floor」記述は免除実装後に矛盾する。同一 PR で更新必須(docs-language: 英語 manifest)。

5. **filter との関係**: `codekb/` 配下の reverse-engineering-timestamp.md は matches glob 非適合で元々センサー非発火(re-sensors-codekb-filter-mismatch)。免除は `intents/` 配下 marker(practices-discovery-timestamp + 全 questions)に効く。免除実装は filter を変えないこと(codekb marker は依然 filter 外で問題なし)を確認。

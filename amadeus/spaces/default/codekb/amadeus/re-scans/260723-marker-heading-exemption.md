# Re-scan 記録 — intent 260723-marker-heading-exemption(Issue #1296)

## 実行メタデータ

- Date(UTC, `date -u` 実測): `Thu Jul 23 01:37:10 UTC 2026`
- Base SHA(`git rev-parse a81c11dde`): `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`
- Observed / HEAD SHA(`git rev-parse HEAD`): `ffc79aad9a53c600ea9b464f1f04c6fa627ae59e`
- Branch: `team/20260722-233519-0637/engineer-5`
- 直近 codekb scan: `re-scans/260722-teamup-prompt-race.md`(observed `a81c11dde`)
- 祖先性・距離(実測): `git merge-base --is-ancestor a81c11dde HEAD` → **exit 0**(base は HEAD の祖先)、`git rev-list --count a81c11dde..HEAD` → **13**(distance)。base は直近 freshness pointer の observed そのもので祖先かつ距離最小(cid:reverse-engineering:rescan-base-ancestry)。
- Scope: `bugfix`(Depth Minimal、cid:scope-definition:bugfix-scope-for-bug-intents)
- Project type: Brownfield / Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)。Developer スキャン → Architect 合成の直列(cid:reverse-engineering:c3)
- 測定 ref: 全 file:line は Observed=HEAD `ffc79aad9` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。件数はすべてコマンド出力からの転記(cid:numbers-from-command-output-only)
- 手法: 既存 codekb からの差分リフレッシュ(cid:reverse-engineering:c1)+ バグ面焦点スキャン

### diff 規模(base a81c11dde..HEAD)

- `git diff --shortstat a81c11dde..HEAD` 転記: **96 files changed, 7226 insertions(+), 17 deletions(-)**
- 非 record 差分(`git diff --stat ... -- . ':(exclude).../intents/*'` の末尾転記): **51 files, 1660 insertions(+), 16 deletions(-)** — 内訳は `scripts/team-up.sh`(+163)、`tests/integration/t-team-up-*`(watcher-arming +197 ほか3本)、`metrics/*.json` 1件、`elections/E-TPRCGS13`・`E-TPRRAS13` 一式、`knowledge/amadeus-shared/domain-language.md`(+129)、`memory/project.md`・`memory/team.md`(各 +3 相当)。
- **交差判定**: 上記非 record 差分は required-sections センサー正本(`packages/framework/core/tools/amadeus-sensor-required-sections.ts`)・`amadeus-graph.ts` の `templateEligibleArtifacts`・stage marker 宣言・sensors manifest のいずれとも無交差。よって #1296 バグ面の実装は base..HEAD で**不変**であり、以下の焦点スキャンは Observed=HEAD の実ファイル直読による(conductor 検証済みの前提を実測で追認)。

## 現行結論(#1296 根本原因)

### 1. バグの所在 = required-sections floor の無条件適用

`amadeus-sensor-required-sections.ts` の pass 述語は**全成果物に汎用 ≥2-H2 floor を無条件適用**する。marker(単一行 timestamp / [Answer] 様式 questions)を floor から免除する分岐が**存在しない**。

```
141: let pass = h2_count >= 2;
147: let findings_count = Math.max(0, 2 - h2_count);
```

単一行 marker は H2=0 → `pass=false`, `findings_count=2`。再現(読み取り専用診断、書込なし):
- `practices-discovery-timestamp.md`(単一行 `Discovered: ... at commit ...`)を対象に fire → `{"pass":false,"h2_count":0,"headings":[],"findings_count":2}`、exit 0(スクリプトは常に `process.exit(0)`、verdict は JSON フィールド)。
- `requirements-analysis-questions.md`([Answer] 様式)でも同一の floor FAIL を確認。timestamp / questions の両クラスで再現。

### 2. ELIGIBILITY GATE は template 面のみを免除(floor は免除しない)

eligibility gate(`:167-186`)は「marker に heading-set template を当てない」だけで、「marker を floor から免除する」ものではない。

- `:173` `const stem = basename(flags.outputPath).replace(/\.md$/, "")` — 判別は出力ファイル名の stem(graph 非依存)。
- stem が `--template-eligible` 集合に含まれない(=marker)場合、template を無視し `result.template = "ineligible"` + config_warning を出す。ただし floor はそのまま維持(`:184-185` verbatim `keeping the generic >=2-H2 floor.`)。
- GA では template は普通 miss する(:163-165)ため、marker は常に floor で FAIL する。

### 3. 再利用候補 = `amadeus-graph.ts` の suffix 弁別(`:801-808`)

marker 弁別ロジックは既に graph 側に存在し、floor 免除へそのまま再利用できる:

```
801: export function templateEligibleArtifacts(produces: string[]): string[] {
802:   return (produces ?? []).filter(
...
806:       !a.endsWith("-questions") &&
807:       !a.endsWith("-timestamp")
808:   );
```

- 弁別基準は **artifact 名 suffix**(`-questions` / `-timestamp`)。filename パターンでも artifact kind でもなく suffix 文字列。
- artifact 名 X ↔ 出力 stem X(X→X.md 規約)なので、センサー側 `stem.endsWith("-timestamp"||"-questions")` は graph 側 `templateEligibleArtifacts` の否定と一致する。
- **設計含意**: 免除述語を1つの canonical 定義(例 `isMarkerArtifact(name)`)へ抽出し graph filter とセンサー floor 免除の両方をそこから導出すれば、2定義ドリフト(cid:code-generation:c1 系の集合分裂)を回避できる。現状は suffix チェックが graph 側にインライン1箇所。

### 4. 既決ノルムとの関係(E-FVEPD)

本欠陥は既に team 規範 `cid:practices-discovery:e-fvepd-marker-heading-floor`(learned 2026-07-20)が「approval 前に H2 を意図的に欠く `*-timestamp.md` / `*-questions.md` を prose-heading floor から明示的に免除する」と規定している挙動そのものである。**規範はこの挙動を要求しているが、センサー実装が未実装**という乖離が #1296。修正は「文書化済み仕様への回復」(バグ修正)であり仕様変更ではない。

## 修正候補が触る seam 目録

センサー floor 免除を実装する場合の全影響面(実測件数):

| seam | 所在 | 件数/注記 |
|---|---|---|
| センサー正本 | `packages/framework/core/tools/amadeus-sensor-required-sections.ts` | 1(pass 述語 `:141` に免除分岐を追加) |
| センサー配布物 | `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/…/tools/` + self-install `./.{claude,codex,cursor,opencode}/tools/` | **11 コピー**(`find -name` 実測)。正本編集後 `bun scripts/package.ts` + `bun run promote:self` で同期必須、`dist:check`/`promote:self:check` がドリフトガード(project.md Mandated) |
| sensors manifest 正本 | `packages/framework/core/sensors/amadeus-required-sections.md` | 1。`:52-53` の「marker keeps the generic floor」記述は免除実装後に矛盾 → **同一 PR で更新必須**(英語 manifest、docs-language)。`output_schema`(:12-21)に観測用フィールドを足すなら消費配線まで(検証劇場回避) |
| manifest 配布物 | dist(6)+ self-install(4) | **11 コピー**(`find` 実測)。同上の同期対象 |
| dispatcher スレッド | `amadeus-sensor.ts:414-438`(`stageTemplateEligibleArtifacts` + `--template-eligible` 送出) | 免除入力を dispatcher 経由にする場合の配線先。ただし bare call(空 `--template-eligible`)で全成果物が非 eligible に見える不健全があるため、免除は stem suffix 直接判定が堅牢 |
| 再利用元弁別関数 | `amadeus-graph.ts:801-808` `templateEligibleArtifacts` | canonical 抽出する場合の抽出元 |
| in-process seam テスト | `tests/unit/t155-template-override.test.ts`(`:130` marker 弁別 / `:251`,`:267` floor pass:false 固定) | 免除の新テスト(marker stem → pass:true)を足す自然な箇所。既存 floor テストの入力が prose 名(`requirements`)であることを保つ |
| dispatcher e2e | `tests/integration/t92.test.ts`(`amadeus-sensor fire` PROCESS 境界 46 ケース) | `--template-eligible` スレッド込み end-to-end を検証する面 |
| manifest schema | `tests/unit/t86-sensor-manifest-schema.test.ts` | output_schema を変える場合の影響先 |
| corpus sweep 対象 | `intents/` 配下 marker | `*-questions.md` **391 件** / `*-timestamp.md` **22 件**(`find` 実測)。免除実装後はこれらが floor から免除され pass:true になる想定(cid:corpus-sweep-for-new-guards / injection-surface-verify) |

## stage marker 宣言の全数目録

`grep -rcE "^\s*-\s+.*(-timestamp|-questions)\s*$" .claude/amadeus-common/stages/` 集計 = **合計 20 件**(`-questions` **18 件** / `-timestamp` **2 件**、全て `produces:` 配下)。timestamp 2件は `practices-discovery-timestamp`(inception/practices-discovery.md)と `reverse-engineering-timestamp`(inception/reverse-engineering.md)。questions 18件は各 ideation/inception/operation ステージの `*-questions`。canonical shape はいずれも「意図的に H2 を欠く」構造 = E-FVEPD の免除対象そのもの。

## filter との関係(codekb marker への非影響)

- sensors manifest の `matches: "**/{amadeus-docs,intents}/**"`(`:8`)により、`codekb/` 配下の `reverse-engineering-timestamp.md`(**1 件**、`find` 実測)は元々センサー非発火(matches-rejection、cid:reverse-engineering:re-sensors-codekb-filter-mismatch)。
- 免除は `intents/` 配下 marker(practices-discovery-timestamp + 全 questions)に効く。免除実装は filter を変えないこと(codekb marker は依然 filter 外で問題なし)を要件で確認する。

## Requirements への未決の設計判断(Architect からの引き継ぎ)

1. **免除述語の canonical 化**: (a) センサー内に stem suffix チェックを独立記述 / (b) 共有 `isMarkerArtifact(name)` を抽出し graph filter とセンサー floor 免除の両方から導出。cid:code-generation:c1 の2定義ドリフト回避観点では (b) 有利だが、センサースクリプトは graph import を避ける設計(現状 `amadeus-lib.ts` の parseBoltDag のみ import)。抽出先を lib にするか graph にするかは設計判断。
2. **弁別入力**: (a) stem suffix 直接 / (b) `stem ∉ template-eligible`。(b) は bare call(`--template-eligible` 空)で全成果物が非 eligible に見え不健全 → **(a) suffix 直接が堅牢**(§2/§3)。
3. **免除の表現**: `pass=true` へ倒すだけか、観測用に `marker_exempt: true` を Result / manifest output_schema へ足すか。足す場合は消費配線(dispatcher/detail が読む)まで実装する(消費されないフィールドは検証劇場 Forbidden)。
4. **manifest 記述の同期**: `amadeus-required-sections.md:52-53` の「marker keeps the generic floor」は免除実装後に矛盾 → 同一 PR で更新(英語 manifest)。
5. **落ちる実証の面**: 免除経路を実際に踏む面へ注入(cid:injection-surface-verify)。既存 t155 の floor pass:false テスト(prose 入力)と、新規 marker stem → pass:true の両側を固定(comparative の両側実測)。in-process seam は実 FS を触るため integration 層配置(cid:fs-tests-integration-first)。

## Delivery boundary

実装・修正コード、`bun scripts/package.ts` / `bun run promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で未実施。区間フォーカス正本の変更0件のため dist 11コピーは base と同一。

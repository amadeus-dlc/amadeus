# RE 差分リフレッシュ記録: 260802-registry-drift-guard

上流成果物(consumes): なし。入力は intent state と Developer Code Scan の完全要点。Project Type は Brownfield、Scope は `self-fix`、Depth は Minimal。

## 実行メタデータ

- Date: `2026-08-02T18:00:19Z`
- Base commit: `47574fbabf274e11cb8e0b37bf35a0309a7b3d42`
- Observed commit: `64b44a9f8c8c79aff876d3275b194f39ead62a49`
- Focus: [Issue #2037](https://github.com/amadeus-dlc/amadeus/issues/2037) の文書バックフィルとは分離した、CLI verb registry と stage field registry の drift guard。CLI dispatch ↔ `Valid:`、stage schema accepted fields ↔ authoritative spec / 英日Field referenceを対象とする。
- Scan mode: focused differential refresh。dirty worktreeに既存ユーザー変更とplugin関連未追跡ファイルがあるためpreflightのtrunk統合は行わず、ユーザー指定のobserved HEADを採用。scanによるsource変更はない。
- Base選定根拠: 本intent固有の過去re-scanは存在しない。`re-scans/` の記録を新しい順に見ると、共有freshness pointerが現在採用する `260802-scope-grid-face-sync` は Date `2026-08-02T10:27:57Z`、observed `47574fbab…` であり、直前の `260802-vocab-canonical-consolid` / `260802-plugin-optin-parity`（ともにobserved `689c3874…`、Date `10:14:34Z`以下）より新しい。この最新記録済みmainline断面をbaseとした。今回の「git操作を行わない」制約に従い、追加の祖先性コマンドは実行せず、既存re-scanの系譜記録と共有pointerを根拠にした。
- Preflight deviation: stage定義のtrunk refreshはdirty worktree保全のため実施しなかった。観測対象は指定commitに固定し、既存CodeKB履歴を削除しない差分更新に限定した。

## Developer Code Scan の実測要約

### 構成と配布

- core正本は `packages/framework`、setupは `packages/setup`。
- `scripts/package.ts` が7 distを生成し、promote-selfが5 root harness treeへ投影する。
- coreの `amadeus-state.ts` / `amadeus-stage-schema.ts` は全生成コピーとSHA一致。正本だけを編集し、生成面は既存 `package.ts --check` / `promote:self:check` に委ねる。
- RuntimeはBun `1.3.13`、TypeScript `6`、Biome `2.5.5`。テスト総数は847本。
- 標準gateはtypecheck、lint、test:ci、dist:check、promote:self:check。

### CLI dispatch registry

`packages/framework/core/tools/amadeus-state.ts:883-1008` のswitchは33 verbをdispatchする。defaultの `Valid:` は手書き30 verbである。

| 分類 | verb |
| --- | --- |
| dispatch-only | `set-construction-iteration`, `archive`, `unarchive` |
| `Valid:`-only phantom | なし |

`t250` は `set-construction-iteration`、`t258` は `archive` / `unarchive` の挙動を検証するが、dispatch集合と`Valid:`集合の一致を検証しない。`tests/unit/t209-stop-hook-state-verb-carveout.test.ts:89-106` には実switchのcaseをsource-derivedで列挙し、件数下限と既知read-only verbで空抽出を拒否する既存パターンがある。

### stage schema registry

`packages/framework/core/tools/amadeus-stage-schema.ts` は `REQUIRED_FIELDS` 12件と `OPTIONAL_FIELDS` 13件、合計25 top-level fieldを受理する。

```text
slug, phase, execution, condition, lead_agent, support_agents, mode,
produces, consumes, requires_stage, inputs, outputs,
number, name, for_each, workspace_requires, optional_produces,
produces_kinds, sensors, scopes, reviewer, reviewer_max_iterations,
bundle, when, required_sections
```

`packages/framework/core/tools/amadeus-lib.ts:7319-7345` の emitter `FIELD_ORDER` も25件で、schema accepted集合との差分は0。ただしrequired/optional配列は非exportであり、文書guardがproduction由来集合を直接再利用できない。

### 文書 registry と矛盾

- `docs/reference/15-stage-definition.md:82-290` と `.ja.md` のField referenceは「complete tableはauthoritative spec、ここはjudgement-heavy narrative」と責務を明示する。top-level H3は9件相当であり、schema全25件のH3化を要求すると、意図的に省いた16件が一度に欠落扱いになる。
- Issueが名指す未記載fieldは `produces_kinds`、`required_sections`、`bundle`。
- `packages/framework/core/amadeus-common/protocols/stage-definition.md:43-67` は表をschemaへ逐語コピーしたと主張するが、`number`、`name`、`produces_kinds`、`sensors`、`reviewer`、`reviewer_max_iterations`、`bundle`、`when`、`required_sections` の9件を欠く。
- 同spec `:195-206` と英日referenceのreserved節は `when` をfuture reservedとするが、schema/parser/emitterは `when` をactive fieldとして型・述語検証する。`t248` はparse/emit/validationをgreenで固定する。
- `t62:512-515` 付近にも `when` reservedという古い前提が残るが、実stage未使用しか検証しないためgreenである。

### CI到達性

`scripts/detect-ci-changes.sh` はTypeScript、tests、scripts、framework等を `full=true` にするが、`docs/**` 単独変更をfull testへ送らない。したがってregistry guardを通常unit testへ追加するだけでは、対象docsだけを壊すPRでguardが実行されない。英日H3は現状同形だが、専用parity guardはない。

### 既存検証結果

- 対象suite: `t209`, `t248`, `t62`, `t250`, `t258`
- Result: 164 pass / 0 fail / 316 assertions
- 解釈: 個別挙動はgreenだが、registry間の双方向一致をoracleにしていないため、本intentのdriftは残存する。

## Architect Synthesis

### 欠陥クラス

2つのfindingは同じ「実行正本と利用者可視投影のregistry drift」クラスである。

1. CLIはswitchが実行正本、`Valid:`が診断投影であり、投影を手書き更新する契約にguardがない。
2. stage fieldはschemaが実行正本、emitter・authoritative spec・英日referenceが投影であり、schema↔emitterは偶然一致しているが、spec/docsの完全性を機械で閉じていない。

個別に3 verbや3 fieldを追記するだけでは次の追加時に再発する。抽出・比較をpure seamとして共有し、production由来集合を正にして投影を検査する必要がある。

### 推奨境界

1. `REQUIRED_FIELDS` / `OPTIONAL_FIELDS` からreadonly accepted集合をexportする。新しい手書き25件定数をproduction側へ作らない。
2. CLI switch、`Valid:`、docs machine registryをtextから抽出するpure helperと、双方向差分・cardinality・duplicate・emptyを判定するpure comparatorを用意する。
3. live source一致に加え、dispatch-only追加、phantom `Valid:`、docs omission、empty extraction、duplicateのnegative tamperを置く。
4. 英日Field reference冒頭に全25件のmachine registry table/markerを置き、既存の判断重視H3は維持する。
5. 対象英日docs pathを`detect-ci-changes.sh`のtest-running changeへ配線し、docs-only PRでもguardを実行する。
6. core正本だけをguardし、7 dist / 5 root faceの整合は既存packaging/promotion drift checksへ委ねる。

### 代替案

| 案 | 利点 | 欠点 | 判定 |
| --- | --- | --- | --- |
| 全25件をH3化 | 見出し集合で検査しやすい | narrative責務を壊し、16件の薄い重複を作る | 非推奨 |
| schema source正規表現をtest内へ直書き | 初期行数が少ない | 再利用不能、空抽出green、testが第2正本化 | 非推奨 |
| docs lintのみ | 文書欠落を捕捉 | CLI driftとproduction投影を閉じない | 不十分 |
| machine registry + pure guard | 完全性と解説を分離し、同型registryへ再利用 | marker契約とCI配線が必要 | 推奨 |

### 変更・テスト境界

想定する変更面はschema export、pure helper、state `Valid:`、authoritative spec、英日reference、CI change detector、対象testsである。生成面は自動同期する。新規外部依存・service・database・network I/Oは不要。テストはpure unitを中心に、live file contractとchange detector routeだけintegration境界で確認する。

## Requirements Analysis へ送る裁定事項

1. **machine registryの意味**: schema accepted top-level field全25件を完全性の正規集合とし、詳細H3はその部分集合でよい、と要件化するか。
2. **CLI順序契約**: dispatchと`Valid:`は集合・重複・cardinality一致だけを要求するか、switch順との同順序まで公開契約として固定するか。推奨は発見可能性に必要な集合一致を必須、順序は明示的に必要と判断した場合だけ固定。
3. **authoritative specの同時是正**: 欠落9件、active `when`、stale `t62`前提を本intentへ含めるか。guard導入時点で既知の矛盾をwaiveしないため、同時是正を推奨する。
4. **英日parity**: field名集合を同一にし、説明翻訳の逐語一致は要求しない契約でよいか。
5. **CI route**: `docs/reference/15-stage-definition.md` と `.ja.md`、必要ならauthoritative specの変更をregistry guard実行へ送る最小path集合を固定する。
6. **negative proof**: 4必須tamper（dispatch-only、phantom help、docs omission、empty extraction）にduplicate caseを追加し、各々が実際にredになることを受け入れ基準にするか。

## 更新成果物

- `business-overview.md`: 利用者影響、成功境界、scope、次段裁定
- `architecture.md`: component境界、推奨設計、代替、Interaction Diagrams + text fallback
- `code-structure.md`: 正本／投影／test seamの配置
- `api-documentation.md`: CLIとstage frontmatterの現契約
- `component-inventory.md`: 対象componentとhealth
- `technology-stack.md`: runtime、test、docs、distribution
- `dependencies.md`: source→guard→CI→distributionの依存方向
- `code-quality-assessment.md`: 現存gap、既存強み、推奨test設計
- `reverse-engineering-timestamp.md`: shared freshness pointer
- `re-scans/260802-registry-drift-guard.md`: 本intent固有のbase/observed/focus/date、実測、次段裁定

直前の共有「現在」断面 `260802-scope-grid-face-sync` は9共有成果物で本文を削除せず「履歴」へ降格した。

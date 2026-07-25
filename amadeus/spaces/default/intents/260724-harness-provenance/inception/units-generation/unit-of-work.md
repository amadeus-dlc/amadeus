# Unit of Work — 260724-harness-provenance

上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md, stories.md

## U1: harness-provenance (Harness Provenance)

- **スコープ**: ハーネス種別の検出から `amadeus-state.md` への記録、利用者向け契約の文書化、配布物への反映までを一つの deployable slice として扱う
- **コンポーネント境界**: components.md の Harness Detector / Harness Recorder / Field Reuse をすべて同一Unitに含め、検出だけ・記録だけの非deployableな分割を作らない
- **Canonical unit name**: `harness-provenance`（YAML edge block・Construction worktree・Bolt で共通利用）
- **Deployment model**: `embedded` — `packages/framework/core/tools/` の既存ツールへ組み込み、全ハーネスの dist/self-install ツリーへ同梱する。独立プロセス・独立デプロイは持たない
- **Relative complexity**: `M` — 正本約130〜160行の見込みで、core 2ファイル・provenance付きresolver・unit/integration regression・docs・全 dist/self-install 面を一つの受入境界で扱うため
- **成果物**:
  - `packages/framework/core/tools/amadeus-lib.ts`
  - `HarnessType` 型(7値判別ユニオン、component-methods.md 準拠)
  - 内部`HarnessDirSource` / `HarnessDirResolution` と`resolveHarnessDir()`。既存`harnessDir(): string`の公開契約・env優先・cache意味論を保ちつつ、実検出`.claude`とfallback `.claude`を区別する
  - `HARNESS_DIR_TO_TYPE` 定数(Issue #1452の5種を定めるcanonical mapping)。`SupportedHarnessDir`はmappingのkeyから導出し、`KNOWN_HARNESS_DIRS`はCWD probe候補順としてのみ再利用する
  - `detectHarnessType(): HarnessType` 関数(FR-1 AC-1d override → FR-2 CLAUDECODE → provenance付きresolver → fallback/未知dot-dirはunknown)
  - 単体テスト(in-process seam、`tests/unit/` — env/script-path/CWD probe/fallbackの各source、invalid overrideのfail-closed、mapping全件、既存`harnessDir()`互換性)
  - `packages/framework/core/tools/amadeus-utility.ts`
  - `stateContent` テンプレート(`:4092-4144`)の Project Information ブロック(`:4094-4103`)へ `- **Harness**: ${detectHarnessType()}` 行を追加
  - `docs/reference/` の環境変数一覧へ `AMADEUS_HARNESS_TYPE` を追記(ADR-2、ユーザー可視契約)
  - 統合テスト(`tests/integration/` — 実 FS で intent birth し state.md の Harness フィールドを検証。全6配布形態で、明示envなしならscript-path、明示envありならenvでCWD probeより先に確定することを検証しAC-3dを固定。cid:fs-tests-integration-first)
  - FR-4 の運用受入証跡: conductor が stage 実行中、生成済み `amadeus-state.md` の `Harness` 値を読み、対象 stage の既存4見出し配下にある通常の diary エントリ本文へ `Harness=<type>` を含める。新規コード・見出し・frontmatter は追加せず、Construction の Unit 完了時に実在する memory.md エントリを確認する
  - `bun scripts/package.ts` + `bun run promote:self` で全 dist/self-install ツリーへ再生成(Mandated)
- **推定規模**: resolver・mapping・検出約55〜70行、記録・docs・単体/統合テスト約75〜90行、合計 **約130〜160行**(正本分、dist 生成物除く)。固定上限ではなく、変更の凝集性と実測差分で再評価する
- **対応 FR**: FR-1〜FR-4。FR-5 は Out of Scope
- **再利用インベントリ**: 既存 `harnessDir()`(`:187-193`)の公開契約・`KNOWN_HARNESS_DIRS`(`:158`)のCWD probe候補順・`isHarnessDirName()`(`:164-166`)・`handleIntentBirthStateBuild()`・`stateContent` テンプレート・`getField`(`:4808`)を再利用する。既存`deriveHarnessDir()`のladderはprovenance付き`resolveHarnessDir()`へ内部再編し、文字列互換APIから検出元を失わない
- **外部ユニット依存**: なし。`detectHarnessType()` と `handleIntentBirthStateBuild()` の関係は同一ユニット内の内部契約
- **Definition of Done の境界**: 単体テストだけで完了とせず、intent birth の実 FS 統合テスト、memory template 不変テスト、`Harness=<type>` を含む通常 diary エントリの実在確認、docs、dist/self-install ドリフト検査までを同時に green にして初めて deployable とする

## サービス層について(services.md 参照)

application-design の services.md は「N/A(独立サービス)— 同一プロセス内の同期呼出のみ」と結論し、component-dependency.md も同じ `handleIntentBirthStateBuild → detectHarnessType` の同期依存を示す。この関係はデプロイ境界ではなく同一 deployable Unit 内の内部契約として扱う。マイクロサービス境界・非同期通信を理由にユニットを分割しない。

## 規模合計

U1 `harness-provenance` ≈ **130〜160行**(正本分、dist 生成物除く)。単一機能へ凝集したM規模であり、decisions.md ADR-4 の既存モジュールへの最小追加方針と整合する。

## Walking Skeleton 注記

`feature` スコープに対する org.md の規定に従い、Delivery Planning では U1 全体を単一の walking-skeleton Bolt として計画できる。検出だけを先行着地させず、stories.md の利用シナリオである「intent birth 時の自動記録」を end-to-end で実証する。実装順序・critical path 自体は stage 2.8 の責務であり、本ステージは単一 deployable Unit というトポロジーだけを定義する。

## Historical Review — Iteration 1 (統合前)

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T12:57:44Z
- **Iteration:** 1
- **Scope decision:** none

ユニット分割・依存DAG・規模見積り・reuse inventory・2.7/2.8境界遵守は良好だが、consumes の services.md が4成果物すべてで本文未参照の装飾トークンになっており(artifact-upstream-inputs-header 禁止パターン)、story-map の AC-1d 転記漏れもあるため差し戻す。

### Findings

- [Major] 4成果物の上流入力行が services.md を列挙するが本文で0参照(装飾トークン)。本設計にはサービス層が存在しないため、各成果物に「services.md=サービス層N/A」の実参照文を明記する(services.md 自体が既にN/A宣言している内容を引用)。
- [Minor] unit-of-work-story-map.md:11 の U1 検証AC列がAC-1dを欠く(FR列には記載あり)。AC-1dを検証AC列へ追記。
- [参考] ユニット境界・依存DAG・ファイル交差判定・規模見積り・reuse inventory・先行着地禁止遵守は妥当。

## Historical Review — Iteration 2 (統合前)

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T13:00:08Z
- **Iteration:** 2
- **Scope decision:** none

是正版4成果物すべてでservices.mdへの実参照が本文に追加され装飾トークン解消。参照内容はservices.mdの実内容と整合。story-map:11のU1検証AC列にAC-1dも追記済み。新たな矛盾なし。

### Findings

- [解消確認] 4成果物すべてでservices.md実参照(サービス層N/A・唯一の内部呼出関係のU1→U2依存への写像)を追加、装飾トークン解消。
- [解消確認] story-map:11のU1検証AC列にAC-1d追記、requirements.md AC-1dと整合。

## Historical Review — Iteration 1 (provenance resolver反映前)

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T17:13:39Z
- **Iteration:** 1
- **Scope decision:** none

単一ユニットDAGは整形式・非循環で上流参照も揃うが、FR-4の実現経路と必須ユニット属性が欠落している。

### Findings

- [Major] requirements.md:40-45 は conductor が memory.md のエントリ本文へハーネス種別を記録することを要求するが、unit-of-work.md:8-23 の成果物・DoDはテンプレート不変テストしか含まず、記録を発生させるコード、ステージ指示、運用成果物のいずれも定義していない。story-map:11 の「FR-4 = テンプレート不変」は要件を縮退させており、FR-4を満たすdeployable sliceになっていない。
- [Major] units-generation.md が各ユニットに必須とする deployment model（standalone/shared/embedded）と相対複雑度（S/M/L/XL）が unit-of-work.md:5-23 にない。約115行という絶対見積りと「deployable slice」だけでは下流のDelivery Planningが必須属性を確定できない。
- [Minor] canonical unit名が成果物間で統一されていない。unit-of-work/story-mapは「U1: Harness Provenance」、YAMLは「harness-provenance」、依存図は「U1: harness-provenance」であり、下流の機械名と人間向けIDの対応規則を明記する必要がある。

## Historical Review — Iteration 2 (provenance resolver反映前)

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T17:15:50Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の全指摘が解消され、必須属性・FR-4受入経路・canonical名が整合し、YAML DAGも整形式かつ非循環である。

### Findings

- None

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T21:53:35Z
- **Iteration:** 1
- **Scope decision:** none

単一deployable Unit、必須属性、YAML DAG、要件・resolver・canonical mapping・AC-3d検証境界の伝播、2.7/2.8分離は妥当だが、内部依存方向が上流設計と逆転している。

### Findings

- [Major] unit-of-work-dependency.md の依存トポロジーが内部契約を `resolveHarnessDir() → detectHarnessType() → handleIntentBirthStateBuild()` と記述しているが、services.md と component-dependency.md の権威ある呼出方向は `handleIntentBirthStateBuild() → detectHarnessType() → resolveHarnessDir()` である。前者を実装すると amadeus-lib.ts から amadeus-utility.ts への逆依存を示唆し、既存の utility→lib と循環し得るため、本文の矢印を上流設計と一致させる必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T21:54:51Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1 Majorは解消され、内部呼出方向がhandleIntentBirthStateBuild() → detectHarnessType() → resolveHarnessDir()で上流設計と一致し、単一Unit境界・必須属性・非循環YAML DAG・全要件トレース・AC-3d検証境界・2.7/2.8責務分離も整合している。

### Findings

- None

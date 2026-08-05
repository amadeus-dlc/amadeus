# Application Design: コンポーネント公開メソッド

`components.md` の C1〜C8 について、公開インターフェースのメソッドシグネチャ、入出力型、エラー方針を定義する。詳細な業務規則・schema 本文は Functional Design（Construction）で確定する。上流は `inception/requirements-analysis/requirements.md`、`codekb/amadeus/architecture.md`、`codekb/amadeus/component-inventory.md`、`application-design-questions.md` の Q1〜Q4 回答である。

## 共通規約

team-practices（`memory/project.md` § Code Style、`memory/team.md`）に従う。

- **スタイル**: class-free の functional domain modeling。type + コンパニオンオブジェクト、ブランド型 + スマートコンストラクタ、判別ユニオン `Result`。
- **エラー方針**: 判定・検証系はすべて `Result<T, E>`（判別ユニオン）を返し、throw を制御フローに使わない。欠落・不一致・stale は成功や非対象へ暗黙変換せず typed failure として全数列挙する（NFR-003 fail-closed）。
- **決定性**: 同一入力（canonical inputs + identity + toolchain 条件）に対する判定結果は再現可能とする（NFR-001）。timestamp・乱数は判定に混入させない。
- **CLI 面**: 各 CLI は JSON を stdout へ 1 行で出力し、exit 0 = 成功、exit 1 = typed failure、exit 2 = usage error とする（既存 `amadeus-*` tool 群の慣例に一致）。

## C1: ApplicabilityJudge

```typescript
type ApplicabilityRoute = "author-new" | "revise-model" | "impl-only" | "non-target";

type ApplicabilityInput = {
  readonly subjectIdentity: AggregateDigest;        // C2 が計算した現在 identity
  readonly changeDeclaration: ChangeDeclaration;     // 変更対象の宣言（stable ID 集合と変更種別）
  readonly registeredModels: ReadonlyArray<ModelMapEntry>; // 既存 model-map の読取結果
};

type ApplicabilityReceipt = {
  readonly route: ApplicabilityRoute;
  readonly subjectIdentity: AggregateDigest;
  readonly reason: string;                           // 判定理由（監査可能な自然文 + 判定表の行 ID）
  readonly judgedBy: string;                         // 判定主体
  readonly humanApproval: HumanApprovalRef | null;   // non-target / impl-only は必須（FR-004, FR-005）
  readonly generatedAt: IsoTimestamp;                // 生成時刻（NFR-002）
  readonly predecessor: PredecessorRef;              // 直前 evidence への参照。系列先頭は root marker（NFR-002）
};

const ApplicabilityJudge = {
  judge(input: ApplicabilityInput): Result<ApplicabilityRoute, ApplicabilityFailure>;
  buildReceipt(route: ApplicabilityRoute, input: ApplicabilityInput, approval: HumanApprovalRef | null):
    Result<ApplicabilityReceipt, ApplicabilityFailure>;
};
```

- `judge` は判定不能・証拠不足を `ApplicabilityFailure`（`kind: "undecidable" | "missing-evidence"`）で返す（FR-001 fail-closed）。
- `buildReceipt` は `non-target` / `impl-only` で `approval` が `null` の場合に `kind: "approval-missing"` で拒否する（FR-004、FR-005、AC-004）。
- receipt の永続化は C1 が行わず、C4 の `build`（terminal route receipt 種別、または full bundle の構成要素）へ渡す — evidence store の書き手は C4 に単一化する。
- `generatedAt` は監査記録であり判定入力ではない — `judge` の決定性（NFR-001）は receipt メタデータに依存しない。

## C2: IdentityDigest

```typescript
const IdentityDigest = {
  normalizeStableId(raw: string): Result<StableId, IdentityFailure>;          // ブランド型化
  contentDigest(id: StableId, canonicalBody: string): ContentDigest;          // ID 単位 digest
  aggregateDigest(entries: ReadonlyArray<[StableId, ContentDigest]>): AggregateDigest; // sorted 集約
  extractStableSections(markdown: string): Result<ReadonlyArray<StableSection>, IdentityFailure>; // 正規化抽出
  compareIdentity(recorded: AggregateDigest, current: AggregateDigest): IdentityComparison;
};

type IdentityComparison =
  | { readonly kind: "current" }
  | { readonly kind: "stale"; readonly recorded: AggregateDigest; readonly current: AggregateDigest };
```

- `aggregateDigest` は入力順に依存しない（stable ID の辞書順 sort 後に集約。Q2）。
- `compareIdentity` の `stale` は FR-007 の staleness 判定の唯一の根拠であり、旧 verdict の存在は判定に使わない（AC-006）。
- 重複 stable ID・解決不能 ID は `extractStableSections` が `IdentityFailure`（`kind: "duplicate-id" | "unresolvable-id"`）で拒否する（FR-006）。
- CLI 面: `tla-authoring.ts identity` サブコマンド（現在成果物から digest 群を計算して JSON 出力。C9 の formal_checks と C7 から呼ばれる）。

## C3: TraceCoverage

```typescript
type TraceRow = {
  readonly subject: StableId;             // requirement / FR / cid / design identity
  readonly invariant: InvariantName;      // named invariant
  readonly rationale: string;
};

const TraceCoverage = {
  evaluate(subjects: ReadonlyArray<StableId>, rows: ReadonlyArray<TraceRow>,
           declaredInvariants: ReadonlyArray<InvariantName>):
    Result<CoverageProof, CoverageFailure>;
};

type CoverageFailure = {
  readonly kind: "coverage-failure";
  readonly uncoveredSubjects: ReadonlyArray<StableId>;      // 未対応の対象
  readonly orphanInvariants: ReadonlyArray<InvariantName>;  // どの対象にも結ばれない invariant
  readonly duplicateSubjects: ReadonlyArray<StableId>;
};
```

- 3 種の欠陥を同時に全数列挙して返す（部分報告しない）。1 件でもあれば `CoverageProof` は生成されない（FR-006、AC-005）。
- CLI 面: `tla-authoring.ts trace` サブコマンド（trace rows ファイルと対象 ID 集合を入力に coverage verdict を JSON 出力。C7 から referee として呼ばれる）。

## C4: EvidenceBundle

```typescript
type EvidenceBundleRef = { readonly digest: BundleDigest };   // content-addressed 参照

type PredecessorRef =
  | { readonly kind: "root" }                                  // 系列先頭の明示 marker
  | { readonly kind: "bundle"; readonly digest: BundleDigest };

type EvidenceKind = "authoring-bundle" | "terminal-route-receipt";

type EvidenceParts =
  | { readonly kind: "authoring-bundle"; readonly parts: AuthoringBundleParts }      // 5 receipt（author / revise 経路）
  | { readonly kind: "terminal-route-receipt"; readonly parts: TerminalReceiptParts }; // applicability + human approval（impl-only / non-target 経路）

const EvidenceBundle = {
  build(evidence: EvidenceParts, predecessor: PredecessorRef):
    Result<EvidenceBundleRef, BundleFailure>;                  // 一時領域で確定→最終配置
  verify(ref: EvidenceBundleRef, expectedIdentity: AggregateDigest):
    Result<VerifiedBundle, BundleFailure>;                     // 欠落・digest/identity 不一致を全数列挙
  read(ref: EvidenceBundleRef): Result<EvidenceParts, BundleFailure>;
};
```

- `build` は kind ごとの必須構成 receipt（authoring-bundle は applicability / trace / proof / review / approval の 5 点、terminal-route-receipt は applicability / human approval の 2 点）が揃わない限り evidence を配置しない。部分 evidence は最終位置に決して現れない（Q3、FR-010 の前段。FR-004 / FR-005 / AC-003 / AC-004 の「永続 receipt」は terminal-route-receipt kind が保存先）。
- **digest の範囲**: bundle digest は canonical 直列化の全 bytes（`generatedAt`・生成主体を含む）を対象とする — 完全性（改竄検出）を冪等再実行より優先する。したがってクラッシュ後の再実行は新しい digest の evidence を生成し得るが、旧 evidence は未参照のまま無害に残る（可視化点は model-map 参照のみ）。digest 外の可変 metadata は持たない。
- `verify` の `BundleFailure` は `kind: "missing-part" | "digest-mismatch" | "identity-mismatch" | "predecessor-broken"` の判別ユニオン。改竄（byte 変更）は digest-mismatch として検出される（NFR-002、NFR-006 の改竄 fixture 要求に対応 — requirements-analysis レビュー FOLLOW-UP の受け皿）。
- CLI 面: `tla-authoring.ts bundle` サブコマンド（build / verify / read を flag で選択）。

## C5: ProofObligations

```typescript
type ProofEvidence = {
  readonly tlcExploration: TlcRunReceipt;                       // 完全探索成功
  readonly fallingProofs: ReadonlyArray<FallingProofReceipt>;   // named invariant ごと
  readonly vacuityProof: VacuityProofReceipt;
  readonly reductionEvidence: ReductionEvidenceReceipt;
  readonly boundIdentity: AggregateDigest;                      // requirements/design/model identity への結束
};

const ProofObligations = {
  evaluate(model: ModelArtifacts, invariants: ReadonlyArray<InvariantName>,
           identity: AggregateDigest, toolchain: TlcToolchain):
    Promise<Result<ProofEvidence, ProofFailure>>;
};
```

- `toolchain` は既存 TLC toolchain の注入 seam（`tlc-toolchain.ts` 契約）であり、TLC の再実装を持たない（NFR-004）。
- 5 条件のうち 1 つでも欠ければ `ProofFailure`（欠けた obligation を全数列挙）。falling proof は invariant ごとに評価し、部分成功を成功へ丸めない（FR-008）。
- CLI 面: `tla-authoring.ts proof` サブコマンド（モデル成果物と invariant 一覧を入力に proof verdict を JSON 出力。C7 から referee として呼ばれる）。

## C6: RegistrationCommitter

```typescript
type RegistrationPreconditions = {
  readonly applicability: ApplicabilityReceipt;
  readonly coverage: CoverageProof;
  readonly freshness: IdentityComparison;        // "current" 以外は拒否
  readonly proof: ProofEvidence;
  readonly review: ReviewReceipt;                // 独立 reviewer（FR-009）
  readonly humanApproval: HumanApprovalRef;
};

const RegistrationCommitter = {
  commit(entry: ModelMapEntryDraft, bundle: VerifiedBundle, pre: RegistrationPreconditions):
    Result<RegistrationReceipt, RegistrationFailure>;
};
```

- `commit` は前提の全数検査 → `model-map.json` の temp-file + atomic rename replace の順で実行し、rename 成功だけを登録成立とする。失敗時は旧 model-map が無傷で残る（部分更新の観測不能性。FR-010、AC-001）。
- `freshness` が `stale` の場合は `kind: "stale-evidence"` で拒否（FR-007、AC-006）。
- **競合検知**: rename 直前に model-map を再読込し、draft 構築時に読んだ内容と異なる場合は `kind: "concurrent-modification"` で中止する（retryable な typed failure）。content-addressed で衝突が無害なのは evidence store 側だけであり、model-map は read-modify-write のため後勝ち lost update をこの検査で拒否する（component-inventory.md の no-silent-drop 節の欠陥クラス回避）。PR ベースの直列マージは第二の防衛線であり代替ではない。
- CLI 面: `tla-authoring.ts commit` サブコマンド。

## C7: AuthoringStage（stage protocol 面）

C7 はコード API ではなく stage 文書 + conductor protocol の組であるため、「メソッド」は stage の手順契約として定義する。

| 手順 | 入力 | 出力 | 失敗時 |
|---|---|---|---|
| route 受領 | C1 の ApplicabilityReceipt | authoring 作業計画 | receipt 欠落で開始拒否 |
| author / revise | requirements + design 成果物 | `.tla` / `.cfg` / reduction manifest / trace rows | — |
| referee 実行 | C2/C3/C5 | CoverageProof / ProofEvidence | typed failure を人間へ提示し halt |
| 独立レビュー | 全 authoring 成果物 | ReviewReceipt | NOT-READY は builder へ差し戻し |
| 人間ゲート | レビュー済み成果物 | HumanApprovalRef | 承認なしで先へ進まない（FR-009） |
| 登録 | C4 build → C6 commit | RegistrationReceipt | 未登録のまま halt（FR-010） |

- reviewer はモデル作成主体と別の独立主体とし、read-only 許可で実行する（FR-009。`memory/project.md` の read-only サブエージェント規律に従い、engine 操作禁止を構造で担保）。
- stage の起動と下流の停止は C7 自身が強制しない — C9 + engine advisory checkpoint が hold を強制し、C7 は hold を解消する作業の実行体である。

## C9: AuthoringHoldEvaluator

```typescript
type HoldVerdict =
  | { readonly kind: "no-hold"; readonly basis: EvidenceBundleRef }        // current な evidence が根拠
  | { readonly kind: "hold"; readonly reasons: ReadonlyArray<HoldReason> }; // 全数列挙

type HoldReason =
  | { readonly kind: "no-applicability-receipt"; readonly subject: AggregateDigest }
  | { readonly kind: "authoring-incomplete"; readonly route: "author-new" | "revise-model" }
  | { readonly kind: "stale-evidence"; readonly recorded: AggregateDigest; readonly current: AggregateDigest };

const AuthoringHoldEvaluator = {
  evaluate(currentIdentity: AggregateDigest, modelMap: ModelMapSnapshot,
           evidenceIndex: ReadonlyArray<EvidenceBundleRef>,
           readEvidence: (ref: EvidenceBundleRef) => Result<EvidenceParts, BundleFailure>):
    Result<HoldVerdict, HoldFailure>;
};
```

- `evaluate` は components.md の closed な hold 判定表を実装する pure 関数。読取不能・検証失敗の evidence は無視せず `HoldFailure` とする（fail-closed。壊れた evidence は「hold なし」の根拠にならない — NFR-003）。
- CLI 面: `tla-authoring.ts hold` サブコマンド。engine advisory checkpoint の formal_checks として実行され、`no-hold` = 解除可、`hold` = checkpoint 維持の typed verdict を JSON 出力する。既存 checkpoint 契約（§11a: 完全・非部分・provenance 検証済みの結果のみが解除）にそのまま載る。

## C8: ImportClosureGuard

```typescript
const ImportClosureGuard = {
  resolveImportClosure(entrypoints: ReadonlyArray<RepoPath>, readFile: (p: RepoPath) => string | null):
    Result<ReadonlyArray<RepoPath>, ClosureFailure>;           // 相対 import の再帰閉包
  checkManifestClosure(manifest: PluginManifest, closure: ReadonlyArray<RepoPath>,
                       ownedPaths: ReadonlyArray<RepoPath>):
    Result<ClosureProof, ClosureFailure>;
};

type ClosureFailure = {
  readonly kind: "closure-failure";
  readonly unreadable: ReadonlyArray<RepoPath>;                 // 解決不能 import
  readonly missingFromManifest: ReadonlyArray<RepoPath>;
  readonly missingFromOwnedPaths: ReadonlyArray<RepoPath>;
};
```

- pure 関数として `readFile` を注入し、unit test 可能にする（NFR-006）。projection（`scripts/plugin-projection.ts`）は `checkManifestClosure` の failure で exit 非 0 とし、欠落 module を全数列挙して停止する（FR-011、AC-007 の「missing import が発生しない」の一次担保）。

## 上流トレーサビリティ

- `inception/requirements-analysis/requirements.md`（各メソッドの FR/AC 対応は本文中に記載）
- `inception/application-design/application-design-questions.md`（Q1〜Q4）
- `codekb/amadeus/architecture.md`、`codekb/amadeus/component-inventory.md`（既存 seam の契約）
- team-practices: `memory/project.md` § Code Style（functional domain modeling）、`memory/phases/inception.md` § Software Design Principles

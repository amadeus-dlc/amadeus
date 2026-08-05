# Functional Design: ドメインエンティティ — U3 authoring-referees

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は `unit-of-work.md` の U3 定義(C3 TraceCoverage + C5 ProofObligations — 評価のみを行う referee。モデル作成 C7・登録 C6 は含まない)のエンティティを確定する。要求根拠は `requirements.md` FR-006/FR-008/AC-005、設計根拠は `components.md` §C3/§C5、`component-methods.md` §C3/§C5、`services.md` §S4(TLC は child process の既存契約)。functional domain modeling スタイル(ブランド型 + Result)を適用する。

## エンティティ一覧

| エンティティ | 種別 | 所有 | 責務 |
|---|---|---|---|
| `InvariantName` | ブランド型 | C3 | named invariant の識別子(TLA+ の invariant 名文法で検証) |
| `TraceRow` | 値型 | C3 | subject(StableId)× invariant × 根拠の対応行 |
| `CoverageProof` | ブランド型 | C3 | 全数 coverage 成立の証明を型で運ぶ(parse-don't-validate) |
| `CoverageFailure` | 値型 | C3 | 3 種欠陥(未対応・孤立・重複)の同時全数列挙 |
| `ModelArtifacts` | 値型 | C5 | 評価対象(`.tla` / `.cfg` / reduction manifest のパス束) |
| `TlcToolchain` | port(注入 seam) | C5 | 既存 TLC toolchain 契約への一方向依存(ADR-5) |
| `TlcRunReceipt` | 値型 | C5 | 完全探索の実行証跡(completion marker + state 統計) |
| `FallingProofReceipt` | 値型 | C5 | invariant ごとの falling proof 証跡 |
| `VacuityProofReceipt` | 値型 | C5 | vacuity proof 証跡 |
| `ReductionEvidenceReceipt` | 値型 | C5 | reduction が元要求の意味を失わないことの evidence |
| `ProofEvidence` | 値型 | C5 | 5 条件の束 + identity 結束(U1 の AggregateDigest) |
| `ProofFailure` | 値型 | C5 | 欠けた obligation の全数列挙 |

## C3 所有エンティティ

### InvariantName / TraceRow / CoverageProof / CoverageFailure

`component-methods.md` §C3 の承認済み型を採用する。追加の確定事項:

- `InvariantName.parse` は TLA+ の識別子文法(`^[A-Za-z_][A-Za-z0-9_]*$`)で検証するブランド型スマートコンストラクタ。`.cfg` の INVARIANT 宣言に現れる名前と同一文法。
- `TraceRow.subject` は U1(C2)の `StableId` を型で再利用する(`unit-of-work.md` U3 補助行「tla-evidence-foundation(stable ID 語彙)」)。`rationale` は空文字を拒否する(根拠なしの対応行は trace にならない — FR-006 の監査可能性)。
- `CoverageProof` は `evaluate` 通過時のみ生成されるブランド型で、評価時点の subjects / rows / declaredInvariants の 3 集合のダイジェスト要約を内包する — 後段(C6 登録前提)が「どの入力に対する coverage 成立か」を照合できる(`requirements.md` NFR-002)。
- `CoverageFailure` は 3 リスト(`uncoveredSubjects` / `orphanInvariants` / `duplicateSubjects`)を**同時に**保持する(`component-methods.md` §C3「部分報告しない」)。3 リストすべてが空なら failure は構成されない(無効状態の表現不能化)。

## C5 所有エンティティ

### TlcRunReceipt(完全探索の証跡)

```typescript
type TlcRunReceipt = {
  readonly outcome: "not-detected";              // 完全探索が成功し違反非検出 — これ以外で receipt は構成されない
  readonly completionMarker: string;             // toolchain が出力する探索完走 marker(生の出力断片)
  readonly stateStatistics: {                    // 完走を裏付ける state 統計(欠損は receipt 構成不可)
    readonly statesGenerated: number;
    readonly distinctStates: number;
  };
  readonly toolchainVersionLine: string;         // 実行 toolchain の版表示(NFR-001 の toolchain 条件)
};
```

- **部分探索・timeout・統計欠損は receipt にならない**: `memory/project.md` cid:application-design:finite-exploration-not-detected-proof(NOT_DETECTED を主張できるのは宣言済み有限 domain の固定点まで完走した completion marker と state 統計が揃う場合だけ。それ以外は HARNESS_ERROR として fail-closed)を型で強制する — receipt の構成要件が completion marker + 統計の実在であり、欠けた場合は `ProofFailure` 側へ落ちる。

### FallingProofReceipt / VacuityProofReceipt

```typescript
type FallingProofReceipt = {
  readonly invariant: InvariantName;             // 対象 invariant(named invariant ごとに 1 receipt — FR-008)
  readonly mutationRef: string;                  // 違反を注入した変異 .cfg/.tla の識別(何を壊したか)
  readonly detectedOutcome: "detected";          // 変異系で TLC が違反を実検出した事実
  readonly counterexampleIdentity: string;       // 検出された counterexample の識別子
};

type VacuityProofReceipt = {
  readonly obligations: ReadonlyArray<{          // invariant ごとの非空虚性
    readonly invariant: InvariantName;
    readonly evidence: string;                   // 空虚に真でないことの根拠(到達可能状態での実評価等)
  }>;
};
```

- falling proof は「invariant を壊した系で赤が実際に出る」ことの実証であり、`memory/team.md` の落ちる実証規範(新設ゲートは失敗ケースを注入して赤を実証)を形式検証面へ適用した受け皿。**注入 → 赤の実測 → 変異の破棄**は 1 セットであり、変異成果物を正本 `.tla`/`.cfg` に残さない(cid:code-generation:falling-proof-injection-one-set の同型)。
- 変異 `.cfg` の生成は既存 `tla-module-deps.ts` の閉包内で行う(`components.md` §C5 境界 — U6 の manifest 修復が本 unit の実行前提。`unit-of-work-dependency.md` の依存)。

### ReductionEvidenceReceipt / ProofEvidence / ProofFailure

`component-methods.md` §C5 の承認済み型を採用する。追加の確定事項:

- `ReductionEvidenceReceipt` は reduction manifest の各縮約項目(状態空間の有限化・抽象化)に「元要求のどの意味を保存するか」の対応を持つ(`requirements.md` FR-008「reduction が元要求の意味を失わないことを示す evidence」)。対応が書けない縮約項目が 1 つでもあれば receipt は構成されない。
- `ProofEvidence.boundIdentity` は U1 の `AggregateDigest` を型で再利用し、proof 実行時点の requirements/design identity を束ねる(FR-008 第 5 条件)。
- `ProofFailure` は 5 obligation のうち欠けたものの全数列挙(`missing: ReadonlyArray<"tlc-exploration" | "falling-proof" | "vacuity-proof" | "reduction-evidence" | "identity-binding">` + falling は欠けた invariant 一覧を併記)。

### TlcToolchain(注入 seam)

- 既存 `tlc-toolchain.ts` 契約をそのまま port 型として受け取る(`services.md` §S4「無変更で再利用(FR-013、NFR-004)」)。U3 は toolchain の実装・schema・verdict 経路に手を入れない(ADR-5 の一方向依存)。テストでは fake toolchain を注入して 5 条件の判定表を純関数的に検証できる(NFR-006)。

## ライフサイクル

referee は状態を持たない(すべて呼出しごとの短命評価 — `services.md` §S4)。evidence の永続化は行わず、`CoverageProof` / `ProofEvidence` は値として呼び手(C7 / C4 経由の bundle part)へ返す(`unit-of-work.md` U3 境界 — 評価のみ)。

## 上流トレーサビリティ

- `unit-of-work.md`(U3 責務・境界・実装注意)、`unit-of-work-story-map.md`(FR-006/FR-008 主担当、AC-005)
- `requirements.md`(FR-006、FR-008、AC-005、NFR-001〜NFR-003、NFR-006)
- `components.md` §C3/§C5、`component-methods.md` §C3/§C5、`services.md` §S4
- `functional-design-questions.md`(0 件判定、人間承認 2026-08-04T18:48:19Z)

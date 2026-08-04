# Functional Design: 業務ロジックモデル — U3 authoring-referees

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は U3(C3 trace coverage 評価 + C5 proof 完了条件評価)のアルゴリズムを定義する。型は `domain-entities.md`、制約は `business-rules.md` を正本とする。`unit-of-work.md` U3 の境界(評価のみの referee — モデル作成 C7・登録 C6 を含まない)と `services.md` §S4 の既存 TLC child-process 契約に従う。

## 1. coverage 評価(C3.evaluate)

`requirements.md` FR-006 の全数トレーサビリティ判定。入力: subjects(対象 stable ID 全数)、rows(TraceRow 集合)、declaredInvariants(登録モデルの named invariant 宣言)— `component-methods.md` §C3。

```
evaluate(subjects, rows, declaredInvariants):
  1. subjects の重複検査: 同一 StableId の 2 回以上出現 → duplicateSubjects へ収集
  2. rows の参照整合: row.subject が subjects に不在、または row.invariant が
     declaredInvariants に不在の row → 当該 row 全体を unresolvedRows へ収集
     (解決不能 = FR-006 の「解決不能な identity」。duplicateSubjects は真の重複専用 —
      2 つの欠陥クラスを同一リストへ混ぜない)
  3. 未対応検査: subjects のうち、いずれの row の subject にも現れない ID → uncoveredSubjects
  4. 孤立検査: declaredInvariants のうち、いずれの row の invariant にも現れない名前 → orphanInvariants
  5. 4 リスト(uncoveredSubjects / orphanInvariants / duplicateSubjects / unresolvedRows)の
     いずれかが非空 → CoverageFailure(4 リスト同時返却 — 部分報告しない)
  6. すべて空 → CoverageProof(評価入力 3 集合のダイジェスト要約を内包)
```

- **申告付き詳細化**: `component-methods.md` §C3 の承認済み CoverageFailure は 3 リストだが、「解決不能な identity」(FR-006)が subject 側と invariant 側の両方で起きるため、解決不能 row を row ごと保持する `unresolvedRows: ReadonlyArray<TraceRow>` を第 4 リストとして追加する — StableId 型の duplicateSubjects へ invariant 解決不能を押し込むと欠陥クラスの意味論が潰れる(§12a iteration 1 FOLLOW-UP の確定回答)。
- 全検査は単一パスの集合演算で決定論的(NFR-001)。1 件でも欠陥があれば `CoverageProof` は生成されない(AC-005「coverage failure として登録を拒否する」の判定根拠)。
- 検査 1〜4 は独立に全数を収集してから返す — 最初の欠陥で打ち切らない(`memory/phases/construction.md` § Error Handling、NFR-003)。

## 2. proof 評価(C5.evaluate)

`requirements.md` FR-008 の 5 条件。入力: ModelArtifacts、invariants、identity、toolchain(注入)— `component-methods.md` §C5。

```
evaluate(model, invariants, identity, toolchain):
  1. TLC 完全探索: toolchain で model を実行。completion marker + state 統計が揃い
     違反非検出の場合のみ TlcRunReceipt を構成。部分探索・timeout・統計欠損・
     harness error は missing: "tlc-exploration" として ProofFailure へ(丸めない)
  2. falling proof(invariant ごと): 各 invariant に対し違反を注入した変異系を
     tla-module-deps 閉包内で生成し toolchain で実行。DETECTED の実測 →
     FallingProofReceipt。NOT_DETECTED / エラー → 当該 invariant を missing に列挙
     (変異成果物は実測後に破棄 — 正本を汚さない)
  3. vacuity proof(invariant ごと): reduction manifest 宣言の witness 述語を読み、正本(無変異)
     モデルへ ¬witness を一時 invariant として注入して toolchain で実行。DETECTED
     (= witness 状態への実到達)の実測 → 当該 invariant の obligation 成立。
     witness 未宣言 / ¬witness が NOT_DETECTED(witness 到達不能 = 空虚)/ エラー →
     当該 invariant を missing: "vacuity-proof" に列挙(注入は falling と同じ
     「注入 → 実測 → 破棄」1 セット — domain-entities.md § VacuityProofReceipt が判定機構の正本)
  4. reduction evidence: reduction manifest の全縮約項目に意味保存の対応
     (preservedMeaning + sourceSubjects 1 件以上)があることを検査 →
     ReductionEvidenceReceipt(対応欠落は missing: "reduction-evidence")
  5. identity 結束(照合であり格納ではない): manifest の declaredIdentity と引数の現在 identity
     (U1 C2)を compareIdentity で照合。宣言欠落・不一致 → missing: "identity-binding"。
     一致時のみ boundIdentity へ現在 identity を格納
  6. 5 条件すべて成立 → ProofEvidence。1 つでも欠ければ ProofFailure(欠けた obligation +
     falling / vacuity の欠け invariant を全数列挙)
```

- TLC 実行はすべて注入 toolchain の child process 契約経由(`services.md` §S4、ADR-5)。U3 に TLC の再実装・ラッパ新設はない(`requirements.md` §8 対象外)。
- 5 条件の判定順は固定だが、条件間に依存はなく(1 が落ちても 2〜4 は評価して欠落を全数列挙する)、部分成功を成功へ丸めない(`unit-of-work.md` U3 実装注意)。

## 3. CLI 面(`tla-authoring.ts trace` / `proof`)

`unit-of-work.md` U3 の CLI 契約と `component-methods.md` § 共通規約(JSON 1 行 stdout、exit 0/1/2)に従う。

| サブコマンド | 入力(argv) | 出力 |
|---|---|---|
| `trace --subjects <json-path> --rows <json-path> --invariants <json-path>` | 対象 ID 集合 + trace rows + 宣言 invariant | CoverageProof 要約 または CoverageFailure |
| `proof --model <tla> --cfg <cfg> --reduction <manifest> --invariants <json-path> --identity <digest>` | モデル成果物 + invariant 一覧 + 現在 identity | ProofEvidence 要約 または ProofFailure |

- trace rows の入出力様式は JSON(bundle part = `ReceiptJson` と同一直列化 — U1 の canonical 直列化規約に載せて digest 可能にする)。
- 純関数層(coverage 集合演算・5 条件判定表・receipt 構成検査)と I/O 層(ファイル読取・toolchain 起動)を分離し、純関数層は fake toolchain 注入で in-process unit test する(`memory/project.md` cid:code-generation:c2-doctor-seam 系規律)。

## データフロー(U3 視点)

```
subjects(U1 C2 由来)+ trace rows(C7/U5 が作成)+ declaredInvariants(モデル宣言)
      │ C3.evaluate
      ▼
CoverageProof ──→ bundle part(U1 C4 経由)/ C6 登録前提(U4)
CoverageFailure ──→ C7 へ全数列挙で返却(halt — 成功へ暗黙変換しない)

ModelArtifacts + invariants + identity(U1 C2)
      │ C5.evaluate(toolchain = 既存 TLC child process)
      ▼
ProofEvidence ──→ bundle part / C6 登録前提
ProofFailure ──→ C7 へ全数列挙で返却
```

## 上流トレーサビリティ

- `unit-of-work.md`(U3 責務・CLI 契約・実装注意)、`unit-of-work-story-map.md`(FR-006/FR-008 主担当、AC-005 実装 unit)
- `requirements.md`(FR-006、FR-008、AC-005、§8 対象外、NFR-001〜NFR-003、NFR-006)
- `components.md` §C3/§C5、`component-methods.md` §C3/§C5/§共通規約、`services.md` §S4/§通信契約
- `functional-design-questions.md`(0 件判定、人間承認 2026-08-04T18:48:19Z)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T19:00:11Z
- **Iteration:** 1
- **Scope decision:** none

C3 coverage の3欠陥全数列挙とTLC無変更再利用境界は妥当だが、C5のvacuity proofとidentity結束の失敗条件が未定義かつテスト全分岐要求と矛盾しており実装者が確認なしに進められない

### Findings

- BLOCKER | amadeus/spaces/default/intents/260804-tla-authoring/construction/authoring-referees/functional-design/business-logic-model.md:26-45 — C5.evaluateのproof5条件のうちvacuity proof(条件3)の判定アルゴリズムが未定義(「評価」としか書かれず既存toolchainの呼出し方法・成立/不成立の判定基準が皆無)、かつidentity結束(条件5)はidentity引数が既に検証済みブランド型のためC5内で失敗し得ないのにProofFailure.missingは"vacuity-proof"/"identity-binding"を許容し、business-rules.md BR-U3-19の「5条件の判定表を全分岐unit test」もtlc-exploration/falling/reductionの4項目しか列挙せずvacuity・identityの失敗分岐を挙げていない。実装者が両条件の失敗条件をアーキテクトへ確認せずに実装・テストできない
- FOLLOW-UP | amadeus/spaces/default/intents/260804-tla-authoring/construction/authoring-referees/functional-design/business-rules.md:44 — 「unit-of-work.md Bolt 3 DoD「ローカルTLCで実測」」という引用が実在しない(unit-of-work.md全文にBoltの記載なし)。引用元を実測確認できる形へ是正するか、このtest境界を本unitの裁定として明記すること
- FOLLOW-UP | amadeus/spaces/default/intents/260804-tla-authoring/construction/authoring-referees/functional-design/business-logic-model.md:14 — row.invariantがdeclaredInvariantsに不在(invariant解決不能)の場合にduplicateSubjects(型StableId[])へ何を積むかが未確定。row.subjectを積む前提と読めるが明記がなく、CoverageFailureの3リストの意味論(重複 vs 解決不能)が実装依存で揺れうる
- FOLLOW-UP | amadeus/spaces/default/intents/260804-tla-authoring/construction/authoring-referees/functional-design/domain-entities.md:74-80 — ReductionEvidenceReceiptのみTypeScript型定義がなく(TlcRunReceipt/FallingProofReceipt/VacuityProofReceiptは具体的に定義済み)、reduction対応の保持形が未確定。BR-U3-19が要求するreduction対応欠落分岐のunit testをこの形のままでは書けない
- NIT | amadeus/spaces/default/intents/260804-tla-authoring/construction/authoring-referees/functional-design/domain-entities.md:72 — 本ステージのconsumes(frontmatter)に含まれないunit-of-work-dependency.mdを引用しているが、レビュー許可集合にも存在しない。consumesへ追加するか引用を除去すること

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T19:06:39Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の5件は実測可能な機序定義・4リスト分離・型定義・引用是正で整合的に閉じており、残る2件はNIT/軽微FOLLOW-UPのみでゲートを妨げない

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260804-tla-authoring/construction/authoring-referees/functional-design/domain-entities.md:22,94 — ProofFailureのみ他のC5 receipt型(TlcRunReceipt/FallingProofReceipt/VacuityProofReceipt/ReductionEvidenceReceipt)と異なりTypeScript型ブロックが無く、「欠けたinvariant一覧」の併記(BR-U3-16)がフィールド名・型未確定のまま prose のみで実装者が構造を推測する必要がある
- NIT | amadeus/spaces/default/intents/260804-tla-authoring/construction/authoring-referees/functional-design/domain-entities.md:63-74 — FallingProofReceiptはinvariantごとに1件をProofEvidence.fallingProofs配列で保持するのに対し、VacuityProofReceiptはinvariantごとの結果をobligations配列としてreceipt内部に集約する非対称な形状になっており、同種の「invariantごとのper-obligation証跡」に異なる格納パターンを採用している理由が明記されていない

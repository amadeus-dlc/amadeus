# Functional Design: 業務ロジックモデル — U3 authoring-referees

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は U3(C3 trace coverage 評価 + C5 proof 完了条件評価)のアルゴリズムを定義する。型は `domain-entities.md`、制約は `business-rules.md` を正本とする。`unit-of-work.md` U3 の境界(評価のみの referee — モデル作成 C7・登録 C6 を含まない)と `services.md` §S4 の既存 TLC child-process 契約に従う。

## 1. coverage 評価(C3.evaluate)

`requirements.md` FR-006 の全数トレーサビリティ判定。入力: subjects(対象 stable ID 全数)、rows(TraceRow 集合)、declaredInvariants(登録モデルの named invariant 宣言)— `component-methods.md` §C3。

```
evaluate(subjects, rows, declaredInvariants):
  1. subjects の重複検査: 同一 StableId の 2 回以上出現 → duplicateSubjects へ収集
  2. rows の参照整合: row.subject が subjects に不在、または row.invariant が
     declaredInvariants に不在の row → 解決不能として duplicateSubjects と同じ failure に載せる
     (解決不能 ID = FR-006 の「重複または解決不能な identity」)
  3. 未対応検査: subjects のうち、いずれの row の subject にも現れない ID → uncoveredSubjects
  4. 孤立検査: declaredInvariants のうち、いずれの row の invariant にも現れない名前 → orphanInvariants
  5. 3 リストのいずれかが非空 → CoverageFailure(3 リスト同時返却 — 部分報告しない)
  6. すべて空 → CoverageProof(評価入力 3 集合のダイジェスト要約を内包)
```

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
  3. vacuity proof: 各 invariant が到達可能状態で空虚に真でないことを評価 → VacuityProofReceipt
  4. reduction evidence: reduction manifest の全縮約項目に意味保存の対応があることを検査 →
     ReductionEvidenceReceipt(対応欠落は missing: "reduction-evidence")
  5. identity 結束: 引数 identity(U1 C2 の現在 AggregateDigest)を boundIdentity へ格納
  6. 5 条件すべて成立 → ProofEvidence。1 つでも欠ければ ProofFailure(欠けた obligation +
     falling の欠け invariant を全数列挙)
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

# Applicability Assessment — tla-authoring(260809-report-done-kind-split)

上流入力: `inception/requirements-analysis/requirements.md`(directive の consumes、required: false)。本 intent の scope グリッドには当初 `tla-authoring` が無く、`plugin.scope-bindings` が `self-fix` に必須と定めるため recompose で追加して実行した(経緯は `requirements-analysis-questions.md` の autonomy 往復の節と Issue #3249)。

## 判定: 終端 `non-target`

## 1. 検査した識別子

`identity extract --doc requirements.md --doc-kind requirements` の出力(aggregateDigest = `sha256:b7a9074a1ee6987b4f7d6a92300022a692291546d6d4adaad968bb701096c5b3`):

| ID | contentDigest(先頭16桁) |
|---|---|
| FR-1 | `sha256:5ca75fecab27dc7e` |
| FR-2 | `sha256:5c1c0c3ae48401fb` |
| FR-3 | `sha256:227f3c702a3d688b` |
| FR-4 | `sha256:b7d182f3e208b0f6` |
| FR-5 | `sha256:4202255ff81b3a71` |
| FR-6 | `sha256:087f46bc7fed2d56` |
| FR-7 | `sha256:e9c39a4aed1bba3d` |

## 2. 選定と非選定

選定基準はステージ本文 Step 1-2「並行または再開可能なアクターが状態を共有し、無音で残存しうる安全性違反を持つ subject のみ」。

- **選定: FR-1 / FR-2 / FR-3 / FR-4 / FR-6** — report ループと Stop hook という再開可能アクターが `amadeus-state.md` を共有し、#2762 の失敗様式(非終端 ack を完了と誤読してループが停止する)は無音の安全性違反にあたる
- **非選定: FR-5**(conductor 契約の文書同期)/ **FR-7**(スコープ外の不変)— 実行時の振る舞いを持たず、状態も共有しない

## 3. 分類の根拠(2点セット)

### (a) 語彙 probe(対照リテラルつき)

登録済み4モデルの `.tla` に対する `grep -c -i -F`:

| モデル | committed | directive | kind | ack | done | 対照 VARIABLES / Init / Next |
|---|---|---|---|---|---|---|
| BoltPrAttestationGate | 0 | 0 | 0 | 0 | 25 | 1 / 2 / 2 |
| PrConvergenceGate | 0 | 0 | 0 | 0 | 23 | 1 / 2 / 2 |
| FormalElection | 0 | 0 | 0 | 0 | 0 | 1 / 2 / 2 |
| MirrorLifecycle | 0 | 0 | 0 | 0 | 0 | 1 / 2 / 2 |

対照リテラルが4モデルすべてで非ゼロなので probe 自体は健全(全件 0-hit の偽陰性ではない)。`done` の hit は語形を全数抽出(`grep -o -i -E "[A-Za-z]*[Dd]one[A-Za-z]*" | sort -u`)すると `codeGenerationDone` と `workflowDone` の2語のみで、いずれもワークフロー段階の真偽値であり directive kind の `done` ではない。

### (b) namedInvariants の列挙

- BoltPrAttestationGate: TypeOK, EvidenceCurrentHead, SensorRequiresAttestation, AttestationRequiresCompleteBolt, SensorRequiresCompleteBolt, OwnerEvidenceIsolated, AutonomyDecisionSafe, ReceiptIdempotent, ReceiptBoundCurrentReport, CodeGenerationGuarded, WorkflowGuarded
- PrConvergenceGate: TypeOK, EvidenceCurrentHead, SensorRequiresAttestation, CodeGenerationGuarded, WorkflowGuarded
- FormalElection: TypeOK, QuestionIdsUnique, AcceptedDomain, ResultCompleteness, PerQuestionIsolation, HeldOnlyTargets, MixedLifecycle
- MirrorLifecycle: TypeOK, NoCloseWithoutLandedSync, NoDuplicateCreate

directive の発行語彙・`report` の ack を不変量のレベルで扱うものは1つも無い。

### (c) 本 intent の変更量

`git diff --name-only origin/main...HEAD -- . ':(exclude)amadeus/'` → **0 行**。pinned implPath の digest drift も 0(`amadeus-sensor-model-completeness.ts` → `{"pass":true,"findings_count":0,"findings":[]}`)。したがって `semantic-change` でも `impl-only` でもない。方式 B の実体は既存の判別子 `isFinal` で既存の emit 集合を型により分割したものであり、新しい状態・遷移・相互排除規則を導入していない(`cid:tla-authoring:tla-spec-change-discriminator`)。

## 4. receipt を mint できなかった理由(判定器の欠陥)

`applicability judge` / `applicability receipt` はいずれも `{"ok":false,"failure":{"kind":"undecidable","row":"J2","conflicts":["J2d"]}}` を返す。J2d は「`non-target` を宣言したが subject が登録モデルと交差する」形。

交差の実体は**別文書の同名 ID との衝突**である。`BoltPrAttestationGate` の登録 evidence bundle(`sha256:cebe2897…`、subjectIdentity `sha256:5946d92b…`、2026-08-14 登録)が bare な `FR-2` / `FR-3` / `FR-4` / `FR-5` を trace subject として持つ一方、本 intent の subjectIdentity は `sha256:b7a9074a…` で別文書である。`intersectsRegisteredModel`(`plugins/formal-model-check/tools/tla-applicability.ts:114-118`)は bare 文字列の集合包含だけを見て subjectIdentity を参照しない。

対照実験(宣言の `kind` と `rationale` を固定し subjects だけを変更):

| subjects | judge の結果 |
|---|---|
| FR-1, FR-2, FR-3, FR-4, FR-6 | undecidable J2/J2d |
| FR-1, FR-6(登録側に無い ID のみ) | **`{"ok":true,"route":"non-target"}`** |

判定器の交差テストが正しければ本宣言は `non-target` に解決する。衝突する ID を宣言から落とせば receipt は mint できるが、それは判定対象を判定器の欠陥に合わせて削る行為(証拠の整形)なので**採らなかった**。欠陥は Issue **#3250** として起票済み。

したがって本ステージは、terminal route `non-target` の判定と全測定を本ファイルに記録し、receipt が mint できなかった理由を明示したうえで終了する。TLC は起動しない(ステージ本文 Step 1 の terminal route の扱い)。

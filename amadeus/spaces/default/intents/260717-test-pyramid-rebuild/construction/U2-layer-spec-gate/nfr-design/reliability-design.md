上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# 信頼性設計 — U2 層責務仕様と tier-aware 判定

本設計は `performance-requirements.md` の決定的評価、`security-requirements.md` の fail-closed、`scalability-requirements.md` の tier 増、`reliability-requirements.md` の故障時挙動、`tech-stack-decisions.md` の既存 union 再利用、および `business-logic-model.md` の violation reportを具体化する。

## REL-D1: 公開 report を包む論理 result

既決の `TierDriftReport { violations, summary: { total, violationCount } }` と `TierSizeViolation` は変更しない。Evaluation Boundary の論理 I/O は `LedgerBuildOutcome → TierEvaluationResult` とし、admission拒否も次の閉じた result に含める。

```text
AdmissionRejectReason =
  | "upstream-incomplete"
  | "upstream-fatal"
  | "observed-ref-missing"

IndeterminateDiagnostic =
  | { kind: "invalid-file"; rowIndex: number }
  | { kind: "invalid-tier"; rowIndex: number; file: LogicalRepoPath }
  | { kind: "invalid-measured"; rowIndex: number; file: LogicalRepoPath }

EvaluationObservation = {
  observedRef: string,
  total: number,
  governed: number,
  auxiliary: number,
  indeterminate: number,
  violationCount: number,
  sizeCounts: { small: number, medium: number, large: number, unclassified: number }
}

TierEvaluationResult =
  | { kind: "admission-rejected"; reason: AdmissionRejectReason }
  | { kind: "complete"; report: TierDriftReport; observation where indeterminate = 0 }
  | { kind: "indeterminate"; observation; diagnostics: IndeterminateDiagnostic[]; report absent }
```

mapping は `incomplete → upstream-incomplete`、`fatal` の `observed-ref-missing → observed-ref-missing`、その他の `fatal → upstream-fatal`、`complete` でも observed ref が欠落または空なら `observed-ref-missing` とする。`admission-rejected` は reason だけを持ち、ledger rowsを走査せず、observation、diagnostics、reportを持たない。complete かつ non-empty observed ref の場合だけ後続2 variantを構成する。具体的な exported 型名、serialization、stderr、exit codeは後続実装に残すが、この3 variantと3 reasonの意味は変更しない。

`TierDriftReport.summary.total` は補助 tier を含む ledger 全行数、`summary.violationCount` は `violations.length` と定義する。governed/auxiliary/indeterminate と ratio 用 size counts は外側の observation が運び、公開 report を拡張しない。indeterminate result の counts は診断用であり、ratio を authoritative として提示しない。

## REL-D2: applicability・行診断・none の意味

- NamedTier の valid rowだけを `detectTierSizeViolation` へ渡し、規約内なら `none`、超過なら `over-limit` とする。
- 承認済み補助 tierは detector の入力外であり、`none` ではなく auxiliary として数える。
- `rowIndex` は U1 の file 昇順 rows における非負整数の zero-based index とする。`LogicalRepoPath` は検証済みの非空・repository相対・`/`区切り・`.`/`..` segmentなしのpathである。各行の `file`、`tier`、`measured` を独立検証し、どれかが不正なら行全体を indeterminate に1回だけ数える。
- 1行に複数の不正 field があっても `file → tier → measured` の固定優先順位で最初の `IndeterminateDiagnostic` だけを生成する。診断は自然な入力順、すなわち `rowIndex` 昇順に保持し、`indeterminate = diagnostics.length` とする。
- `invalid-file` は raw fileを保持せず `rowIndex` だけを持つ。`invalid-tier` / `invalid-measured` は file validation通過後だけ生成でき、検証済み`LogicalRepoPath`を持つ。どのvariantもraw tier/measured、absolute/canonical path、source、runtime messageを持たない。
- size count は診断の優先順位と独立して measuredを1回分類し、exact `small|medium|large` なら対応count、不正なら `unclassified` に入れる。たとえば fileとmeasuredがともに不正なら診断は `invalid-file` 1件、size countは `unclassified` 1件である。
- unknown tier、欠落/未知 measured、不正 file は `none` や auxiliary に縮退させない。observed ref 不在、上流 incomplete/fatal は評価前の admission rejection とする。
- indeterminate が1件でもあれば、valid 行の中間診断と partial counts は保持できるが authoritative な `TierDriftReport`、ratio、zero-violation success を返さない。

stderr、exit code、CI赤化、故障注入テストは上流どおり別 intent に残す。

## REL-D3: 完全性と決定性の不変条件

- admission-rejected は3理由のいずれかだけを持ち、行由来fieldを持たない。
- admission通過後は `total = ledger.rows.length` かつ `total = governed + auxiliary + indeterminate`。governed は全fieldがvalidなNamedTier行、auxiliaryは全fieldがvalidな承認済み補助tier行、indeterminateはそれ以外の行であり、互いに排他的で全行を覆う。
- `indeterminate = diagnostics.length`。diagnostics は1行1件以下で、`rowIndex` が厳密昇順である。
- `sizeCounts.small + sizeCounts.medium + sizeCounts.large + sizeCounts.unclassified = total`。未知/欠落 measured だけを unclassified に数え、`sizeCounts.unclassified <= indeterminate` である。
- complete では `indeterminate = 0`、`sizeCounts.unclassified = 0`、`violationCount = report.violations.length`、`report.summary.total = total`、`report.summary.violationCount = violationCount`。
- indeterminate の `violationCount` はvalid NamedTier行から得た内部over-limit candidate数であり、診断用に限る。candidate配列やreportをresultへ露出せず、authoritative violation listとは扱わない。
- governed 行ごとに LOG-D1 の単一 `allowedMaxSize` と `SIZE_ORDER[measured] > SIZE_ORDER[allowed]` を使い、比較結果と over-limit が双方向一致する。
- ledger rows の file code-unit 順を維持し、同じ observed ref・rows・policy・registry は byte-equivalent な logical outcome を返す。
- 時刻、乱数、environment、FS列挙順、network、LLM、現行 allowlist を target verdict の入力にしない。

measurement ref の complete ledgerでは `total=442`、`governed=440`、`auxiliary=2`、`indeterminate=0`、`violationCount=163` と機械導出される。これらは regression oracleであり固定値ではない。

## REL-D4: 現行 gate の failure と移行境界

現行 purity ratchet は FS/JSON例外、空母集団、新規 offender、stale allowlist を Bun test failureとして可視化する一方、structured result、measurement ref、auxiliary/indeterminate countを持たない。smokeは `null`、unknownは `other` として skipされるため LOG-D1 の target policy を達成済みとは扱わない。

将来実装は既存 ratchet assertion、allowlist縮小性、CI到達性を失わず、policy と入力を単一ownerへ収束させる。既存 declared-vs-measured gate は別観点として温存し、本 intent ではどの test/runner/CIも変更しない。

## REL-D5: 回復・適用外

invalid tier/row は registryまたは台帳生成元を修正し、同じ full evaluation を再実行して回復する。決定的な local input defectへ retry、backoff、fallback、circuit breakerを追加しない。

availability SLA/SLO、RTO/RPO、backup、replication、multi-AZ、health endpoint、failoverは、常駐service・request・永続source-of-recordがないため N/A とする。tier時間予算の PENDING をservice SLOへ昇格させない。

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# 論理コンポーネント設計 — U2 層責務仕様と tier-aware 判定

本設計は `performance-requirements.md` の単一走査、`security-requirements.md` の台帳境界、`scalability-requirements.md` の tier 分離、`reliability-requirements.md` の logical outcome、`tech-stack-decisions.md` の既存型再利用、および `business-logic-model.md` の `allowedMaxSize` / detector / report境界を実装可能な責務へ割り当てる。

## LOG-D1: コンポーネント台帳

| 論理コンポーネント | 責務 | I/O | 配置 |
| --- | --- | --- | --- |
| Evaluation Boundary | U1 complete/ref admission、reject と行評価の分離、3 variantのlogical result構成 | `LedgerBuildOutcome` → `TierEvaluationResult` | 将来 consumer側の orchestration |
| Tier Applicability Registry | tierを Named / approved auxiliary / invalid に exact分類 | `Tier` → applicability | 小さな純関数。初期 auxiliary=`harness|lib` |
| Tier Limit Policy | 4 NamedTier の上限を exhaustive lookup | `NamedTier` → `TestSize` | planned `allowedMaxSize`、単一定義点 |
| Tier Violation Detector | strict序数比較と union構成 | NamedTier + measured → `TierSizeViolation` | planned純関数、既存 `SIZE_ORDER` 再利用 |
| Tier Drift Report Builder | admission済みの元 `SizeLedger` 全体を1回走査し、applicability、violations、既決summaryを構成 | `SizeLedger` → report候補 + 行評価 | planned First-Class Collection |
| Observation Projector | 同じ行評価から governed/auxiliary/indeterminate、size counts、閉じた行診断、不変条件を構成 | ordered行評価 → observation + diagnostics | Evaluation Boundaryの戻り値 |
| Time Budget Evidence Contract | 4既存commandの測定metadataと人間承認待ちを記録 | runner実測 → PENDING/承認済みbudget | 文書契約のみ、実装/値は後続 |
| Existing Purity Ratchet | 現行FS scan、private policy、allowlist assertion、CI赤化 | repository FS + allowlist → Bun test verdict | 現存consumer。target達成済みではない |

Tier Limit Policy の値定義は次表を本NFR設計内の唯一の定義点とし、`allowedMaxSize` は closed `NamedTier` に対する exhaustive lookup として実装する。新しい NamedTier を追加してcaseが欠ければ網羅検査で失敗させる。

| NamedTier | allowedMaxSize |
| --- | --- |
| `unit` | `small` |
| `integration` | `medium` |
| `e2e` | `large` |
| `smoke` | `medium` |

これらは8つの package/service を新設する指示ではない。planned code面は policy、applicability、detector、reportの小さな純関数群に留め、orchestrationと現行testの収束は実装 intentが同時に行う。

## LOG-D2: 依存方向

依存は次の一方向とする。

`Evaluation Boundary → Tier Drift Report Builder → Tier Applicability Registry`

`Tier Drift Report Builder → Tier Violation Detector → Tier Limit Policy`

`Tier Drift Report Builder → Observation Projector`

- Evaluation Boundary は `incomplete`、`fatal`、observed ref欠落を Report Builderへ渡さず、REL-D1 の閉じた `admission-rejected` を返す。admission通過時だけ Report Builderへ complete ledgerを渡し、projected結果から `complete` または `indeterminate` を返す。
- Report Builder は元 ledger 全体を受け、1回の行評価から report候補、observation、diagnostics を同時に組み立てる。公開 `TierDriftReport` の shape は変えず、exact exported型名・serializationは後続に残す。
- policy/detector/report は FS、runner、CI、allowlist、environmentを importしない。
- detectorは既存 `TestSize` / `SIZE_ORDER` を再利用し、`classifyTestSize` や signal patternを再実装しない。
- auxiliary/invalidを detectorの `none` variantへ押し込まず、applicabilityとoutcomeで分離する。
- ratio投影とtime budget evidenceは tier violation verdictへ混ぜず、強制gateへ暗黙昇格させない。

## LOG-D3: report・failure domain

| Domain | Blast radius | Logical result |
| --- | --- | --- |
| NamedTier 規約内 | 当該行 | `none`、governedへ加算 |
| NamedTier 上限超過 | 当該行 | `over-limit`、violationsへ加算 |
| approved auxiliary | 当該行 | detector対象外、auxiliaryへ加算 |
| unknown/malformed row | report全体 | `indeterminate`、1行1件の閉じた診断、authoritative reportなし |
| upstream incomplete | report全体 | `admission-rejected(upstream-incomplete)`、行評価なし |
| upstream fatal(ref欠落) / complete ref欠落 | report全体 | `admission-rejected(observed-ref-missing)`、行評価なし |
| その他の upstream fatal | report全体 | `admission-rejected(upstream-fatal)`、行評価なし |
| ratio/budget evidence不足 | guideline面 | tier verdictを変更せず、該当値をPENDING |

公開 `TierDriftReport` は変更せず、追加観測値と completeness はlogical resultが所有する。row診断は REL-D2 の3 variant、1行1件、`file → tier → measured` の優先順位、`rowIndex` 昇順に閉じる。具体的exported型名、exit code、serializationは後続実装の責務である。

## LOG-D4: 現行 gate の収束方針

現行 `tests/unit/t-test-size-drift.test.ts` の purity ratchet は実装済みで、planned moduleとは意味・入力が異なる。将来は現行testを単一policy/U1 ledgerのconsumerへ移し、ratchet allowlistとCI assertionを維持する。新しいtestを並行追加して二重policy・二重scanを残さない。

target policyは LOG-D1 の4行表、現行 private policyの `smoke:null` は `smoke→medium` に対する実装gapである。既存公開docsも現行値を記すため、修正は実装と同じchange setで行う。本 intentでは変更しない。declared-vs-measured gateは直交する既存契約として非破壊温存する。

## LOG-D5: Infrastructure Designへの引き渡しとスコープ

U2はlocal Bun process内のpure evaluationであり、AWS account、VPC、IAM、compute/storage service、DB、cache、queue、load balancer、autoscaling、monitoring serviceを必要としない。Infrastructure Designへ渡すcloud componentはない。

本成果物は設計のみで、`tests/`、allowlist、runner、CI、docs、package、dist/self-install、#1157を変更しない。実装、exported型名・serialization・exit code、CI配線、落ちる実証、ratio/time budget強制化、budget数値確定は後続の明示範囲に残す。

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# 論理コンポーネント設計 — U1 サイズ分類台帳

本設計は `performance-requirements.md` の単一スイープ、`security-requirements.md` の FS 境界、`scalability-requirements.md` の開いた tier、`reliability-requirements.md` の部分失敗、`tech-stack-decisions.md` の既存型再利用、および `business-logic-model.md` の `buildLedgerRow` / `buildSizeLedger` 境界を、実装可能な責務へ割り当てる。

## LOG-D1: コンポーネント台帳

| 論理コンポーネント | 責務 | I/O | 実装配置 |
| --- | --- | --- | --- |
| Sweep Driver | tests root 解決、logicalRepoPath/testsRelativePath/canonicalTarget の分離、raw candidate 抽出、containment、logical/target 重複検査、1回読取、observed ref、outcome 組立 | repository root → `LedgerBuildOutcome` | 将来の consumer/adapter。pure module へ入れない |
| Tier Resolver | logical tests-root-relative path の第1階層から開いた `Tier` を導出 | testsRelativePath → `Tier` | Sweep Driver 内の小さな純関数 |
| Test Size Classifier | size と signals の唯一真実源 | source → `SizeClassification` | 既存 `tests/lib/test-size.ts` を変更せず再利用 |
| Annotation Parser | declared size を既存規約で解釈 | source → `SizeAnnotation` | 既存 `tests/lib/test-size.ts` を変更せず再利用 |
| Ledger Row Builder | classifier を1回、成功後に parser を1回呼び、分類結果を1つの `LedgerRow` へ転記 | `{ file: logicalRepoPath, tier, source }` → `LedgerRow` | 将来の独立 `tests/lib` 台帳 module の純関数 |
| Size Ledger Builder | sort、matrix 集計、observed ref を持つ First-Class Collection | rows/ref → `SizeLedger` | 同じ台帳 module の純関数 |
| Outcome/Diagnostic Boundary | complete/incomplete/fatal、閉じた failure kind、logical path を保持し固定 template で表示 | enumerate/read/build 結果 → outcome | Sweep Driver の戻り値。永続化は後続 |

これらは論理責務であり、7つの package/service を新設する指示ではない。新規 module は上流で確定した最小の `buildLedgerRow` / `buildSizeLedger` 面に留め、FS orchestration は consumer 側が所有する。

## LOG-D2: 依存方向

依存は次の一方向だけを許す。

`Sweep Driver → Tier Resolver / Ledger Row Builder → Test Size Classifier / Annotation Parser`

`Sweep Driver → Size Ledger Builder → Outcome Boundary`

- pure builders は FS、environment、runner、metrics collector を import しない。
- `buildLedgerRow({ file, tier, source })` だけが classifier を1回、成功後に parser を1回呼び、既存 `test-size.ts` へ依存する。Sweep Driver は同じ source を分類器へ直接渡さない。
- Sweep Driver は canonicalTarget を containment/read にだけ使い、builder へは logicalRepoPath、logical path 由来の tier、source だけを渡す。
- metrics collector、runner、移設計画、coverage 計画は将来の consumer であり、台帳 module から逆参照しない。
- 現行 metrics collector と runner はまだ個別スキャンを持つ。本 intent では配線変更や互換 adapter を追加しない。
- 現行 tier purity gate の smoke policy は consumer 固有の別契約であり、開いた `Tier` を記録する U1 ledger の責務へ持ち込まない。

## LOG-D3: failure domain と blast radius

| Failure domain | 影響範囲 | 結果 |
| --- | --- | --- |
| 1 raw `*.test.ts` candidate の path/read failure | 当該 file | `incomplete` + `ReadFailure`、他 row は保持 |
| tests root 不在・列挙不能 | 母集団全体 | `fatal`、空 ledger を成功として返さない |
| normalized logical path の重複、または canonical target を共有する alias | 母集団全体 | `duplicate-candidate` fatal、全 collision pair 中の code-unit 辞書順最小 pair を保持し dedupe しない |
| classifier/parser defect | 全 row | `fatal`、fallback classifier を作らない |
| row 重複・matrix 不一致 | ledger 全体 | `fatal`、不変条件違反を materialize しない |
| diagnostic renderer failure | 可視化面 | 閉じた kind/logical path の outcome data は保持し、silent success にしない |

共有 mutable state、DB、cache、queue、network connection、thread pool は存在しない。共有資源は read-only の repository source と既存 `TestSize` / `SIZE_ORDER` / classifier/parser 定義だけである。

## LOG-D4: Infrastructure Design への引き渡し

U1 はローカル Bun process 内の静的スイープであり、AWS account、VPC、IAM role、compute service、storage service、load balancer、autoscaling、monitoring service を必要としない。Infrastructure Design へ渡す実在コンポーネントはない。

後続が生成物の保存や CI 実行を決める場合も、それは保存先・runner 配線と同時に設計する。現段階では cloud resource、IaC、daemon、外部 SaaS、常駐 observability stack を予約しない。

## LOG-D5: スコープ境界

- 本成果物は設計のみで、`packages/`、`scripts/`、`tests/`、runner、CI、dist/self-install を変更しない。
- `SizeLedger` 実装、consumer 統合、file materialization、failure injection test は後続実装の責務である。
- U2 の tier policy、U3 の移設・coverage、#683、#1157、動的 wall-clock 計測を変更しない。
- 新規依存、後方互換 shim、二重 classifier、未消費 extension point を追加しない。

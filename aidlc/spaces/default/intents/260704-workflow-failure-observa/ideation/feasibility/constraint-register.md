# Constraint Register

## Scope Constraints

| ID | Constraint | Decision | Impact |
|---|---|---|---|
| C-FEA-001 | `intent-statement` を上流成果物として扱う。 | 採用。 | #431、#432、#433、#435 を 1 つの失敗可観測性 Intent として追跡する。 |
| C-FEA-002 | `competitive-analysis`、`market-trends`、`build-vs-buy` は存在しない。 | mvp scope で market-research が skip されたため、非入力として扱う。 | 外部市場比較ではなく、既存 Issue と実装制約で feasibility を判断する。 |
| C-FEA-003 | Operation phase は今回の workflow から外れている。 | 採用。 | observability setup と deployment execution は今回の stage では扱わない。 |

## Technical Constraints

| ID | Constraint | Decision | Impact |
|---|---|---|---|
| C-FEA-004 | `aidlc-orchestrate.ts` の stdout directive 契約を壊さない。 | audit 書き込みは best-effort とする。 | `ERROR_LOGGED` 追加時も stdout に余計な文字を出さない。 |
| C-FEA-005 | `.aidlc-hooks-health/*.drops` は hook の fail-open 結果である。 | doctor で hook 名、件数、最新時刻、最新理由を表示する。 | hook の静かな失敗を表面化できる。 |
| C-FEA-006 | `SUBAGENT_COMPLETED` は現状 success と failure を区別しない。 | hook input の信頼性を先に確認する。 | 判別可能なら `Status` フィールドを追加し、不可なら区別不能として記録する。 |
| C-FEA-007 | conductor 逸脱は自己申告に依存しない信号だけを初期対象にする。 | run-stage と report の不整合、in-flight stage、runtime graph と audit の矛盾を候補にする。 | 過検出を避けつつ、doctor と audit で表面化できる。 |
| C-FEA-008 | produces 欠落の完了報告は既存 engine guard の確認対象である。 | 新規検出ロジックの主対象にしない。 | 重複実装を避ける。 |

## Boundary Constraints

| ID | Constraint | Decision | Impact |
|---|---|---|---|
| C-FEA-009 | `skills/` は配布物境界である。 | 実装変更の主経路として安易に直接編集しない。 | source skill、昇格先 skill、host harness、Intent 成果物の境界を分ける。 |
| C-FEA-010 | `.agents/aidlc/tools`、`.agents/aidlc/hooks`、`.agents/aidlc/aidlc-common` は parity check の対象である。 | 対象ファイルごとに adapter、upstream contribution、`engineFileExceptions`、分割を判断する。 | parity lock 逸脱を設計判断として追跡できる。 |
| C-FEA-011 | `engineFileExceptions` は現時点で空である。 | 例外追加には人間承認を必要とする。 | 例外が暗黙に増えない。 |
| C-FEA-012 | 既存 audit event を削除または改名しない。 | taxonomy 変更は追加またはフィールド追加に限定する。 | validator と既存 audit 互換を壊しにくい。 |

## Infrastructure Constraints

| ID | Constraint | Decision | Impact |
|---|---|---|---|
| C-FEA-013 | AWS account、CloudWatch、CloudTrail、IAM は現 Intent の必須実装に含めない。 | 採用。 | ローカル CLI、hook、audit、doctor、test fixture の範囲で閉じる。 |
| C-FEA-014 | CI 連携は外部インフラ機能ではなく検証証拠として扱う。 | 採用。 | `npm run test:all` と PR 前検証結果を追跡する。 |
| C-FEA-015 | OpenTelemetry は分析性を高めるが、collector と exporter の設計を必要とする。 | optional extension として記録する。 | 現 Intent の must-have からは外し、後続 Intent 候補にする。 |

## Compliance Constraints

| ID | Constraint | Decision | Impact |
|---|---|---|---|
| C-FEA-016 | PCI、HIPAA、GDPR、FedRAMP は直接適用しない。 | 採用。 | 外部規制要件は非対象として記録する。 |
| C-FEA-017 | audit integrity と再現性は project policy 上の制約である。 | 採用。 | audit 既存イベントを書き換えず、human input を要約しない。 |
| C-FEA-018 | PR 前には validator と標準検証の結果を追跡可能にする。 | 採用。 | PR 説明または Intent 成果物に検証結果を残す。 |

## Verification Constraints

| ID | Constraint | Decision | Impact |
|---|---|---|---|
| C-FEA-019 | 対象 CLI と hook は deterministic test が必要である。 | 採用。 | unit test、e2e、eval fixture を候補にする。 |
| C-FEA-020 | parity check と promote-skill 経路への影響を確認する。 | 採用。 | 配布物境界と上流追従を壊さない。 |
| C-FEA-021 | Amadeus validator は成果物構造の検証であり、内容承認ではない。 | 採用。 | validator pass を gate 承認の代替にしない。 |

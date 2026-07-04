# RAID Log

## Risks

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|---|---|---|---|---|---|
| R-FEA-001 | `aidlc-orchestrate.ts` の error audit 追加で stdout directive 契約を壊す。 | Medium | High | audit 書き込みを best-effort にし、stdout は directive JSON だけにする。 | Open |
| R-FEA-002 | hook drop 表示が詳細すぎて doctor 出力が読みにくくなる。 | Medium | Medium | 初期は hook 名、件数、最新時刻、最新理由に限定する。 | Open |
| R-FEA-003 | subagent failure を message 推測で判定し、誤分類する。 | Medium | High | hook input に信頼できる status がある場合だけ `Status` を追加する。 | Open |
| R-FEA-004 | conductor 逸脱検出が過検出になり、正常 workflow を不安定にする。 | Medium | High | 初期実装は audit と doctor の表面化に留め、hard error 化しない。 | Open |
| R-FEA-005 | parity lock 対象を直接変更し、上流追従を壊す。 | Medium | High | adapter、upstream contribution、`engineFileExceptions`、分割の順で判断する。 | Open |
| R-FEA-006 | `skills/` の配布物境界を壊す。 | Low | High | source skill、昇格先 skill、host harness、Intent 成果物の境界を明示する。 | Open |
| R-FEA-007 | OpenTelemetry を must-have にして scope が肥大化する。 | Medium | Medium | 現 Intent では optional extension として記録する。 | Open |

## Assumptions

| ID | Assumption | Evidence | Validation |
|---|---|---|---|
| A-FEA-001 | 対象 Issue は 1 つの失敗可観測性テーマとして扱える。 | `intent-statement` と #431、#432、#433、#435。 | Scope Definition で scope boundary を確認する。 |
| A-FEA-002 | AWS などの外部インフラは現 Intent の必須実装に不要である。 | Q7 の回答 `E`。 | Construction で外部 collector を導入しないことを確認する。 |
| A-FEA-003 | 外部規制は直接適用されない。 | Q8 の回答 `E`。 | Requirements Analysis で audit integrity と再現性だけを制約化する。 |
| A-FEA-004 | OpenTelemetry は後続拡張として価値がある。 | ユーザー補足と Q11 の回答 `E`。 | 後続 Issue または opportunity として記録する。 |
| A-FEA-005 | `engineFileExceptions` は人間承認なしに増やさない。 | project memory と parity-map。 | 実装前に対象ファイルを constraint-register に照合する。 |

## Issues

| ID | Issue | Impact | Resolution path | Status |
|---|---|---|---|---|
| I-FEA-001 | `aidlc-orchestrate.ts` だけ `emitError()` を呼ばない非対称がある。 | engine error が audit に残らない。 | #431 で対応する。 | Open |
| I-FEA-002 | `doctor` は `.drops` を読まない。 | hook の静かな失敗が見えない。 | #432 で対応する。 | Open |
| I-FEA-003 | `SUBAGENT_COMPLETED` は status を持たない。 | subagent failure を集計できない。 | #433 で hook input を調査する。 | Open |
| I-FEA-004 | conductor の自己申告に依存しない失敗検出範囲が未確定である。 | workflow 逸脱を機械的に補足しにくい。 | #435 で検出信号と対応方針を決める。 | Open |
| I-FEA-005 | `docs/reference/12-state-machine.md` は現在の workspace には存在しない。 | audit taxonomy の参照先が文書上ずれている可能性がある。 | `audit-format.md` と実装を根拠にし、必要なら後続 docs 修正候補にする。 | Open |

## Dependencies

| ID | Dependency | Needed for | Owner | Status |
|---|---|---|---|---|
| D-FEA-001 | `dev-scripts/data/parity-map.json` | parity lock と例外方針の判断。 | Maintainer | Available |
| D-FEA-002 | `package.json` の `npm run test:all` | 標準検証。 | Maintainer | Available |
| D-FEA-003 | `.agents/aidlc/tools/aidlc-audit.ts` の event registry | taxonomy 変更判断。 | Maintainer | Available |
| D-FEA-004 | `.agents/aidlc/hooks/aidlc-log-subagent.ts` の hook input | subagent status 判別。 | Maintainer | Needs investigation |
| D-FEA-005 | `.agents/aidlc/tools/aidlc-utility.ts --doctor` | hook drop 表示。 | Maintainer | Available |
| D-FEA-006 | `.agents/aidlc/tools/aidlc-orchestrate.ts` | engine error audit。 | Maintainer | Available |
| D-FEA-007 | Scope Definition と Units Generation | Bolt 分割の最終判断。 | AI-DLC workflow | Pending |

## Opportunity Notes

| ID | Opportunity | Recommended handling | Status |
|---|---|---|---|
| O-FEA-001 | `.agents/aidlc/tools` の TypeScript CLI に OpenTelemetry を追加する。 | 現 Intent では optional extension として記録し、後続 Intent 候補にする。 | Parked |
| O-FEA-002 | `OTEL_EXPORTER_OTLP_ENDPOINT` 未設定時 no-op、設定時だけ trace と metrics を送る設計にする。 | 後続 Intent の Feasibility で検討する。 | Parked |

# External Dependency Map — ハーネス横断 live E2E

入力参照: `requirements`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`。`stories`、`mockups`、`team-practices`成果物は未生成である。本Intentはservice、database、deployment infrastructure、外部team handoffを追加しない。

## Dependency Policy

- live substrateはローカル開発環境だけで使用し、GitHub Actionsでは起動前にhard denyする。
- binary、version、auth、capabilityは各adapterのpreflightで測定し、secretやsource credential pathをledger/Issueへ記録しない。
- Must-green transportはsubstrate不足を代替完了に使えない。capableなmaintainer環境で実行receiptを得る。
- Conditional transportはgreen、または再実行可能probeと受入条件付きIssueのどちらかで閉じる。
- lead timeは暦日で推測せず、「対象batch開始前」または「Bolt完了前」の検証可能な期限で表す。

## Gated Dependencies

| ID | External dependency | Owner | Required by | Deadline | Gate result | Mitigation / workaround |
|---|---|---|---|---|---|---|
| E1 | `codex` CLI ≥0.139.0と明示auth source | human maintainer | B01 | B01 live実行前 | must-green | preflightを先行し、capable local hostで実行。authはscratchへ最小copyしsource pointerを除去 |
| E2 | `claude` CLIと有効auth、project settings | human maintainer | B03 | B03 live実行前 | must-green | `--setting-sources project`固定、ambient user/local settingsをnegative testで拒否 |
| E3 | Claude Agent SDK runtime/auth | human maintainer | B04 | B04完了前 | greenまたはIssue | fake contractを常時実行し、不成立時は阻害要因・推奨seam・受入条件をIssue化 |
| E4 | `tmux`、Claude TUI auth | human maintainer | B05 | B05完了前 | greenまたはIssue | private socket/session、明示opt-in、bounded timeout、secret-safe debug |
| E5 | `kimi` CLIと有効auth/config | human maintainer | B06 | Batch 5開始時にpreflight、B06完了前にlive | must-green | credential-safe scratch、実credential treeの複製/露出を避ける |
| E6 | `kiro-cli acp`とmachine auth | human maintainer | B07 | B07完了前 | greenまたはIssue | fake ACP、cancel/timeout contract、不成立時evidence Issue |
| E7 | `tmux`、Kiro TUI auth | human maintainer | B08 | B08完了前 | greenまたはIssue | private session、credential-safe cleanup、不成立時evidence Issue |
| E8 | Kiro.app、CDP、machine-level auth | human maintainer | B09 | B09完了前 | greenまたはIssue | generated scratch profile、bounded readiness、secret-safe debug、不成立時Issue |
| E9 | Cursorの利用可能な非対話transportとauth | human maintainer | B10 | B10 capability probe時 | greenまたはunsupported package | adapterを先に捏造せずprobe/testで判定し、unsupportedならIssueとmatrixへ反映 |
| E10 | OpenCodeの非対話transport、plugin seam、auth | human maintainer | B11 | B11 capability probe時 | greenまたはunsupported package | plugin既存能力を測定し、unsupportedならIssueとmatrixへ反映 |
| E11 | GitHub Issue作成権限 | human maintainer | B04/B05/B07〜B11 | conditional failure closure前 | evidence Issue link | 権限がない場合は完全なIssue body artifactを生成し、権限保持者のhandoffをBLOCKERとして明示 |

## Internal Prerequisite Evidence

| Evidence dependency | Producer | Consumers | Required condition |
|---|---|---|---|
| Common production contract | B01 | B02〜B11 | Codex real green、policy/lifecycle、cleanup barrier、ledger commit、`closure-committed`後のmatrix/runbook green |
| Common hardening evidence | B02 | B03〜B11 | negative/property/failure-injection suite green |
| Phase 1 closure | B04/B05 | B06〜B09 | Codex/Claude print must-green、SDK/TUIの`closure-committed`またはIssue evidence、registry/ledger/matrix整合 |
| Phase 2 closure | B06〜B09 | B10/B11 | Kimi must-green、Kiroの`closure-committed`またはIssue evidence、registry/ledger/matrix整合 |

これらは外部team依存ではないが、Construction engineがPhase順序を守るためのmachine-readable barrierである。

## Non-dependencies

- 新しいAWS account、network、database、daemon、service、deployment approvalは不要。
- CIへ外部credentialを投入するlive jobは追加しない。
- 市場データ、ユーザーデータ、利用時間window、外部API quotaは不要。
- Cursor/OpenCodeのunsupported判定は他方をblockせず、Batch 6内で独立に閉じる。

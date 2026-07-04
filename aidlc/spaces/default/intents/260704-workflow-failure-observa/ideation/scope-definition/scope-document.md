# Scope Document

## Upstream Context

この Scope Definition は、`intent-statement`、`feasibility-assessment`、`constraint-register` を上流成果物として読む。

対象は #431、#432、#433、#435 を 1 つの失敗可観測性 Intent として扱うことである。
Feasibility では OpenTelemetry を optional extension としたが、Scope Definition の追加判断により、OpenTelemetry の core 計装は MVP に含める。

この見直しは、collector、dashboard、常時ネットワーク送信を MVP に含める判断ではない。
MVP に含めるのは、`.agents/aidlc/tools` の TypeScript CLI で失敗の発生、伝播、表示、報告を trace と metrics の入口から観測できる no-op default の計装である。

## Scope Decision

MVP は、4 つの Issue と OpenTelemetry core 計装を含める。

| Scope Item | Decision | Reason |
|---|---|---|
| #431 engine error audit | In scope | error directive と未捕捉例外が audit に残らないと、workflow 失敗を後から追跡できない。 |
| #432 doctor hook drops | In scope | hook drop が `.aidlc-hooks-health/*.drops` に残っても doctor が読まないため、運用者に表面化しない。 |
| #433 subagent status | In scope | `SUBAGENT_COMPLETED` が成功と失敗を区別できないと、agent 実行の結果を集計できない。 |
| #435 conductor-independent failure detection | In scope | conductor の自己申告だけに依存すると、実行逸脱を機械的に補足できない。 |
| OpenTelemetry core 計装 | In scope | audit と doctor は deterministic evidence を残し、OpenTelemetry は横断分析の入口を提供する。 |
| OpenTelemetry collector | Out of scope | 外部送信と運用設計が必要であり、MVP の deterministic test を重くする。 |
| OpenTelemetry dashboard | Out of scope | 可視化基盤は core 計装の後に接続できる。 |
| cloud infrastructure | Out of scope | AWS、CloudWatch、CloudTrail、IAM、VPC は現 Intent の価値実証に不要である。 |

## In Scope

MVP の in scope は次である。

| ID | Capability | Expected Outcome |
|---|---|---|
| SCOPE-001 | engine error audit | `aidlc-orchestrate.ts` の error directive と top-level catch が `ERROR_LOGGED` として追跡できる。 |
| SCOPE-002 | hook drop doctor | `doctor` が `.aidlc-hooks-health/*.drops` を読み、hook 名、件数、最新時刻、最新理由を表示する。 |
| SCOPE-003 | subagent status evidence | hook input に信頼できる status がある場合は `SUBAGENT_COMPLETED` に `Status` を追加する。ない場合は区別不能を記録する。 |
| SCOPE-004 | conductor-independent warning | run-stage と report の不整合、in-flight stage、runtime graph と audit の矛盾を warning として表面化する。 |
| SCOPE-005 | OpenTelemetry core 計装 | command span、error span、directive/report span、doctor metrics を no-op default で実装する。 |
| SCOPE-006 | deterministic verification | audit、doctor、OpenTelemetry 計装 evidence、unit test、e2e または eval fixture、validator、`npm run test:all` を接続する。 |

## Out of Scope

MVP の out of scope は次である。

| ID | Exclusion | Reason |
|---|---|---|
| OUT-001 | OpenTelemetry collector 運用 | collector endpoint、認証、retention、運用監視は別 Intent の設計対象である。 |
| OUT-002 | OpenTelemetry dashboard | dashboard は core 計装から得られる telemetry の利用側であり、今回の最小価値ではない。 |
| OUT-003 | 常時ネットワーク送信 | local CLI の決定性とテスト再現性を壊すため、未設定時は送信しない。 |
| OUT-004 | `skills/` 直接編集 | `skills/` は配布物境界であり、今回の主経路として直接編集しない。 |
| OUT-005 | 既存 audit event の削除または改名 | audit integrity と後方追跡性を壊すため、追加またはフィールド追加に限定する。 |
| OUT-006 | `.coderabbit.yml` 変更 | 人間の明示許可がないため変更しない。 |
| OUT-007 | cloud infrastructure | 現 Intent はローカル CLI、hook、audit、doctor、test fixture の範囲で閉じる。 |

## Boundary Rules

配布物境界は、`constraint-register` の制約を引き継ぐ。

`skills/` は配布物境界である。
今回の実装判断では、`skills/` を直接編集する経路を主経路にしない。

parity lock 対象は、対象ファイルごとに次の順で判断する。

1. lock 対象外の adapter または wrapper で回避できるかを確認する。
2. upstream contribution として扱うべきかを確認する。
3. 人間承認付きで `engineFileExceptions` に追加すべきかを確認する。
4. lock リスクが高い場合は後続 Intent へ分割する。

## OpenTelemetry Core Boundary

OpenTelemetry は core observability layer として扱う。

core に含める計装は次である。

| Target | Signal | Boundary |
|---|---|---|
| `.agents/aidlc/tools` command execution | command span | CLI 起動から終了までを trace する。 |
| error directive | error span | stdout JSON 契約を壊さず、error の発生を trace する。 |
| report flow | directive/report span | `next` と `report` の対応を追跡する。 |
| doctor | metrics | hook drop 件数、最新理由、conductor-independent warning 件数を集計可能にする。 |

core に含めないものは、collector、dashboard、常時ネットワーク送信である。
外部 exporter は環境変数で有効化する。
環境変数が未設定の場合は no-op とし、ネットワーク送信を行わない。

## Value Stream Map

この Intent の価値流は、失敗の発生から PR 説明までを接続することである。

```text
Failure occurs
  -> audit event or warning is recorded
  -> doctor surfaces local evidence
  -> OpenTelemetry no-op default records trace or metric boundary
  -> deterministic test verifies the behavior
  -> Intent artifact links evidence to Issue and proto-Unit
  -> PR explains scope and verification
```

<!-- Text fallback: 失敗発生、audit 記録、doctor 表示、OpenTelemetry 計装、deterministic test、Intent traceability、PR 説明の順に証拠を接続する。 -->

## Acceptance Evidence

MVP の完了証拠は次である。

| Evidence | Required | Notes |
|---|---|---|
| audit evidence | Yes | `ERROR_LOGGED` または既存 taxonomy に沿う追加フィールドを確認する。 |
| doctor evidence | Yes | `.aidlc-hooks-health/*.drops` と conductor-independent warning を表面化する。 |
| OpenTelemetry 計装 evidence | Yes | no-op default で span と metrics の境界が test 可能であることを確認する。 |
| deterministic test | Yes | stdout JSON 契約を壊さないことを含める。 |
| Amadeus validator | Yes | Intent 成果物構造の整合性を確認する。 |
| `npm run test:all` | Yes | PR 前の標準検証として実行し、結果を追跡可能にする。 |
| PR description | Yes | 対象 Issue、Intent、scope、検証結果を日本語で記録する。 |

## Traceability

| Source | Scope Item | Backlog Link |
|---|---|---|
| `intent-statement` | 4 Issue を 1 つの失敗可観測性 Intent として扱う。 | U001、U002、U003、U004、U005 |
| `feasibility-assessment` | `GO_WITH_CONSTRAINTS` とし、stdout JSON 契約、parity lock、配布物境界を制約にする。 | U001、U002、U005、U006 |
| `constraint-register` | `skills/` 配布境界、`engineFileExceptions` 人間承認、audit 互換を守る。 | U006 |
| #431 | engine error audit を実装する。 | U001 |
| #432 | hook drop doctor を実装する。 | U002 |
| #433 | subagent status evidence を実装または区別不能として記録する。 | U003 |
| #435 | conductor-independent failure detection を warning として表面化する。 | U004 |
| User correction | OpenTelemetry core 計装を MVP に含める。 | U005 |

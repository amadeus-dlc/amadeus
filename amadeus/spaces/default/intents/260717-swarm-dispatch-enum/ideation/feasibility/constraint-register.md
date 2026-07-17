# Constraint Register

## 上流入力

本 register は [`intent-statement.md`](../intent-capture/intent-statement.md)、[Issue #1157](https://github.com/amadeus-dlc/amadeus/issues/1157)、および [`feasibility-questions.md`](./feasibility-questions.md) の承認済み回答を制約の正本として整理する。

優先順位は、ユーザーが確定した Issue #1157 の改訂契約、現在の Intent record、既存 framework invariant の順とする。旧 `260713-swarm-driver-migration` の成果物は対照証拠であり、要求の正本にはしない。

## Hard Constraints

| ID | 区分 | 制約 | 検証・強制方法 | 状態 |
|---|---|---|---|---|
| C-01 | Public contract | `AMADEUS_USE_SWARM` の許可状態は unset、`claude-ultra`、`codex-ultra` の三つだけとする | harness 別 decision table と全組み合わせ test | Confirmed |
| C-02 | Breaking change | 旧値 `1` の後方互換シムを設けず、未知値として扱う | source scan と invalid-value test | Confirmed |
| C-03 | Failure | 未知値は dispatch、worktree 作成、worker 起動、`SWARM_STARTED` より前に fail-closed する | 副作用ゼロを確認する negative test | Confirmed |
| C-04 | Harness-relative | `claude-ultra` は Claude、`codex-ultra` は Codex の同一セッション内強化モードとして解釈する | harness 別 contract test | Confirmed |
| C-05 | Degradation | 他ハーネス専用値は session 内 native subagent floor へ loud-degrade する | user message と `SWARM_DEGRADED` の一致 test | Confirmed |
| C-06 | Vocabulary | env 値、code type、audit driver は `subagent | claude-ultra | codex-ultra` の一対一とし、写像層を作らない | type・CLI validation・audit fixture の同値検査 | Confirmed |
| C-07 | Codex floor | Codex の通常経路は同一セッション内 native subagent fan-out とし、headless `codex exec` worker を使わない | source／dist scan と live evidence | Confirmed |
| C-08 | Referee | `prepare`、`check`、`finalize` の意味論を変更しない | t134／t135 系回帰 test | Confirmed |
| C-09 | Landing integrity | adapter または契約だけを先行させず、実装・配線・test・必要文書を同じ Intent で揃える | Unit acceptance と PR review | Confirmed |
| C-10 | Scope size | 固定行数上限を合否基準にせず、Units Generation の全 Unit に概算行数レンジを記録する | Units gate | Confirmed |
| C-11 | Scope exclusion | 汎用 driver stack、外部 messaging 基盤、referee 再設計を導入しない | scope review と changed-files review | Confirmed |
| C-12 | Generated assets | dist、self-promoted skill、root onboarding を直接の正本にせず、source から既存の生成経路で同期する | dist／promote drift checks | Confirmed |

## Conditional Constraints

| ID | 区分 | 制約 | 期限・停止条件 | 状態 |
|---|---|---|---|---|
| C-13 | Worktree isolation | native child が prepared unit worktree へ隔離して書き込み、別 Unit／main worktree を変更しないこと | Requirements で Codex floor を確約する前。未成立なら No-Go | Open blocker |
| C-14 | Sandbox | prepared worktree path が child の writable-root 境界内にあるか、同等に安全な明示権限を持つこと | C-13 と同時に実測 | Open blocker |
| C-15 | Effort evidence | `reasoning_effort=ultra` の API 受理と child 完了を現在の証拠限界とし、actual honor の telemetry がないことを開示する | Requirements・docs・acceptance evidence に明記 | Accepted limitation |
| C-16 | Machine boundary | prose だけに依存せず、raw env の許可値と harness 相対結果を機械検証できる最小境界を持つ | Requirements と design で決定。欠落時は No-Go | Required |
| C-17 | Concurrency | session slot が batch より少ない場合は wave／逐次回収を許容し、正しさを concurrency 数に依存させない | Construction behavior と tests | Required |
| C-18 | Retry identity | retry は失敗 Unit と native agent/result を取り違えず、session-local identity の制約を明示する | Functional Design 前に契約化 | Open |
| C-19 | Kiro impact | Kiro／Kiro IDE に残る旧 `1` no-op と共通 env 契約の関係を棚卸しし、対象外なら silent divergence を残さない理由を明記する | Scope Definition | Open |

## Platform and Compliance Constraints

| ID | 区分 | 制約 | 判定 |
|---|---|---|---|
| C-20 | Runtime | Codex CLI は project minimum の `0.139.0` 以上を前提とする | 現セッション `0.144.5` で充足 |
| C-21 | AWS | AWS account、service、region、resource、IaC を追加・変更しない | N/A |
| C-22 | Data | 新しい PII、PHI、cardholder data、customer data を収集・保存・送信しない | 追加規制なし |
| C-23 | Audit | append-only audit を維持し、requested／fallback driver を同じ語彙で記録する | Existing control + change tests |
| C-24 | Secrets | probe、error、audit、docs に token や credential を出力しない | Existing repository security |
| C-25 | Governance | AI-DLC の人間承認 gate、CI、review を通常どおり適用する | Confirmed |

## Scope Exclusions

- provider 内部の reasoning effort telemetry を新規に実装すること
- Claude／Codex 以外の agent orchestration 製品との統合
- Herdr を messaging または ultra の前提にすること
- upstream v2.3.0 の referee 設計変更
- AWS infrastructure、deployment topology、account configuration の変更
- 旧 driver stack またはその adapter 群の復活

## Enforcement Gates

| Gate | 必須確認 |
|---|---|
| Scope Definition | C-01〜C-12 の対象・対象外、C-19 の Kiro 影響を明記 |
| Requirements Analysis | C-13〜C-16 の evidence と fail-closed／degrade matrix を確定。C-13 未達なら停止 |
| Units Generation | 各 Unit の概算行数レンジ、依存、実装＋配線の同時着地を審査 |
| Functional Design | retry identity、wave behavior、audit evidence を設計 |
| Build and Test | invalid values の副作用ゼロ、live native fan-out、referee 回帰、source／dist parity を検証 |
| PR review | 旧 `1`、headless `codex exec` floor、語彙 drift、未配線 adapter が残っていないことを確認 |

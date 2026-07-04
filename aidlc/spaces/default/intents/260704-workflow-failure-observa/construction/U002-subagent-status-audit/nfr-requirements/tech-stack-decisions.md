# Tech Stack Decisions: U002-subagent-status-audit

## 上流文脈

この tech-stack-decisions は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、Subagent Status を `.agents/aidlc/tools` と hook integration の TypeScript module として扱う方針を定義している。

`business-rules` は、trusted source allowlist、additive audit field、old row compatibility、stdout JSON 非干渉を定義している。

`requirements` は、R004、R007、R008、R009、NFR001、NFR004、NFR005 を定義している。

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| TECH001 | 実装言語は既存どおり TypeScript とする。 | hook と `.agents/aidlc/tools` は TypeScript であり、NFR004 が strict typecheck を要求している。 |
| TECH002 | outcome は string literal union または enum 相当の shared contract とする。 | success、failure、unknown の 3 状態を型で閉じるため。 |
| TECH003 | classification は pure helper として実装する。 | deterministic fixture と property-like matrix test が書きやすい。 |
| TECH004 | old row compatibility は reader normalization helper に置く。 | 既存 audit row を migration せずに読めるため。 |
| TECH005 | audit append は既存 audit adapter を使う。 | `SUBAGENT_COMPLETED` の event 名と audit taxonomy を維持するため。 |
| TECH006 | message text classifier は採用しない。 | 誤分類と性能劣化を避けるため。 |
| TECH007 | 追加 package は不要とする。 | field allowlist と normalization は標準 TypeScript だけで実装できるため。 |

## Package Boundary

U002 は新しい external package を要求しない。

OpenTelemetry package の追加判断は U001 が所有する。

U002 は U001 の Shared Contracts と Error Audit evidence path を使う。

`skills/` は配布物境界であり、この Unit では直接編集しない。

## Compatibility and Parity

`SUBAGENT_COMPLETED` は event 名を維持する。

outcome field は additive とする。

old row に outcome がない場合は reader normalization で unknown にする。

parity lock 対象の直接変更は adapter または wrapper first で回避する。

`engineFileExceptions` は明示承認なしに変更しない。

## Verification Stack

| Verification | Tooling |
|---|---|
| TypeScript strict | `npm run typecheck` |
| target fixture | Bun and TypeScript deterministic test |
| full local gate | `npm run test:all` |
| Intent structure | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260704-workflow-failure-observa` |
| parity | `npm run parity:check` |
| stdout JSON | JSON parse assertions |
| audit compatibility | old row and new row fixture matrix |

## Rejected Options

`SUBAGENT_SUCCEEDED` と `SUBAGENT_FAILED` へ event 名を分ける案は採用しない。

この案は audit taxonomy compatibility を壊す。

message text から outcome を推測する案は採用しない。

この案は false positive と false negative を増やす。

old row を migration する案は採用しない。

この案は append-only audit と互換性維持方針に反する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Tech stack は既存 TypeScript だけで閉じている。

追加 package を要求せず、audit taxonomy compatibility を優先している。

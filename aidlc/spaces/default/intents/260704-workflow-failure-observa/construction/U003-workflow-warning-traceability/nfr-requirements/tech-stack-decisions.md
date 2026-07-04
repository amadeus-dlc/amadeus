# Tech Stack Decisions: U003-workflow-warning-traceability

## 上流文脈

この tech-stack-decisions は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、Conductor Warning、Verification Traceability、Doctor Composition を `.agents/aidlc/tools` の TypeScript CLI として扱う方針を定義している。

`business-rules` は、read-only evidence、non-mutating doctor、scope-out 境界、`engineFileExceptions` 非変更を定義している。

`requirements` は、R005、R006、R007、R008、R009、NFR001、NFR003、NFR004、NFR005、NFR006 を定義している。

`technology-stack` は optional input であり、この Intent では個別成果物として存在しないため、既存の TypeScript と Bun の CLI 前提を上流技術制約として扱う。

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| TECH001 | 実装言語は既存どおり TypeScript とする。 | `.agents/aidlc/tools` は TypeScript であり、NFR004 が strict typecheck を要求している。 |
| TECH002 | warning evaluation は pure helper として実装する。 | deterministic fixture と non-mutating assertion が書きやすい。 |
| TECH003 | evidence snapshot は state、audit、runtime graph、artifact path を read-only に集約する。 | doctor warning が workflow state を変更しないことを保つため。 |
| TECH004 | Requirement evidence map は plain data structure として実装する。 | R001-R009 の coverage を deterministic test で検証しやすい。 |
| TECH005 | PR readiness checklist は generated artifact または PR description source として再利用できる Markdown-friendly data にする。 | Issue、Requirement、verification、parity、scope-out の追跡性を保つため。 |
| TECH006 | OpenTelemetry は既存の core 計装 facade を使う。 | U003 は collector や dashboard を要求せず、no-op default を維持するため。 |
| TECH007 | 追加 package は不要とする。 | state、audit、runtime graph、Markdown artifact の読み取りは既存 TypeScript と標準 API で扱えるため。 |

## Package Boundary

U003 は新しい external package を要求しない。

OpenTelemetry package の最終組み合わせは core 計装を所有する Unit で確定する。

U003 は U001 の Error Audit と OpenTelemetry evidence、U002 の Subagent Status evidence を read-only に読む。

`skills/` は配布物境界であり、この Unit では直接編集しない。

## Compatibility and Parity

Doctor warning は hard error ではなく actionable warning とする。

Existing audit event names は削除または改名しない。

`engineFileExceptions` は明示承認なしに変更しない。

parity lock 対象の直接変更は adapter または wrapper first で回避する。

stdout JSON contract を持つ command は diagnostics を stdout に出さない。

## Verification Stack

| Verification | Tooling |
|---|---|
| TypeScript strict | `npm run typecheck` |
| target fixture | Bun and TypeScript deterministic test |
| full local gate | `npm run test:all` |
| Intent structure | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260704-workflow-failure-observa` |
| parity | `npm run parity:check` |
| stdout JSON | JSON parse assertions |
| OpenTelemetry no-op default | in-memory or no-op exporter assertion |
| non-mutating doctor | before and after state snapshot assertion |

## Rejected Options

Doctor warning で workflow state を自動修復する案は採用しない。

この案は R005 の non-mutating doctor と false-positive control に反する。

collector、dashboard、cloud infrastructure を U003 の required item にする案は採用しない。

この案は scope-out 境界と MVP の deterministic verification に反する。

`skills/` を直接編集する案は採用しない。

この案は配布物境界に反する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Tech stack は既存 TypeScript と local deterministic fixture で閉じている。

OpenTelemetry は core 計装として扱い、collector と dashboard を要求していない。

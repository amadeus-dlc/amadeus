# Tech Stack Decisions: U001-failure-evidence-foundation

## 上流文脈

この tech-stack-decisions は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、`.agents/aidlc/tools` の TypeScript CLI 内で Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition を in-process module として扱う方針を定義している。

`business-rules` は、OpenTelemetry no-op default、stdout JSON 非干渉、deterministic fixture、parity lock 境界を定義している。

`requirements` は、R003 の OpenTelemetry core 計装、NFR002 の no-op default、NFR003 の deterministic verification、NFR004 の TypeScript strict を定義している。

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| TECH001 | 実装言語は既存どおり TypeScript とする。 | `.agents/aidlc/tools` は TypeScript CLI であり、NFR004 が strict typecheck を要求している。 |
| TECH002 | 実行入口は既存どおり Bun CLI とする。 | `package.json` と既存 tools が Bun を前提にしている。 |
| TECH003 | OpenTelemetry は Telemetry Facade の背後に置く。 | command が exporter を直接扱うと no-op default と stdout JSON 非干渉を横断的に保証しにくい。 |
| TECH004 | OpenTelemetry package は Code Generation で最小追加にする。 | 現在の `package.json` には OpenTelemetry 依存がないため、実装時に API、SDK、test exporter seam の必要最小セットを TDD で確定する。 |
| TECH005 | collector、dashboard、cloud export package は追加しない。 | `requirements` は core 計装を必須、collector と dashboard を optional scope としている。 |
| TECH006 | `.drops` parsing は標準 file API と small parser で扱う。 | external parser は不要であり、deterministic fixture で検証できる。 |
| TECH007 | performance validation は local deterministic benchmark と fixture test で扱う。 | U001 は deployable service ではなく local CLI tooling である。 |

## Package Boundary

新しい実行時依存は、OpenTelemetry core 計装に必要な最小範囲だけにする。

test exporter seam は deterministic test のために使う。

collector exporter、cloud exporter、dashboard 関連 package は U001 では追加しない。

package 追加が必要な場合は、Code Generation で先に failing test を作り、`npm run typecheck` と関連 test を通す。

## Compatibility and Parity

parity lock 対象の直接変更は adapter または wrapper first で回避する。

locked file 変更が不可避な場合は、U003 の PR readiness traceability に resolution path を渡す。

`engineFileExceptions` は明示承認なしに変更しない。

`skills/` は配布物境界であり、この Unit では直接編集しない。

`.coderabbit.yml` または `.coderabbit.yaml` は明示許可なしに変更しない。

## Verification Stack

| Verification | Tooling |
|---|---|
| TypeScript strict | `npm run typecheck` |
| lint | `npm run lint:check` |
| target fixture | Bun and TypeScript deterministic test |
| full local gate | `npm run test:all` |
| Intent structure | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260704-workflow-failure-observa` |
| parity | `npm run parity:check` |
| stdout JSON | JSON parse assertions |
| OpenTelemetry no-op | no-send fixture and test exporter assertion |

## Rejected Options

OpenTelemetry collector を U001 に含める案は採用しない。

この案は optional scope を core scope に戻してしまう。

各 command に OpenTelemetry 呼び出しを直接置く案は採用しない。

この案は no-op default と stdout JSON 非干渉を command ごとに重複実装させる。

新しい database や cloud storage に evidence を置く案は採用しない。

この案は file-backed evidence surface と deterministic verification の方針に反する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Tech stack は既存の Bun と TypeScript を維持し、OpenTelemetry は最小導入に留めている。

collector、dashboard、cloud export を依存に含めないため、U001 の scope boundary と一致している。

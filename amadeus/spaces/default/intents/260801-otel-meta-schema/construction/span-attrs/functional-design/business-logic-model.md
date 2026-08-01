# Business Logic Model — U2 span-attrs

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U2 の責務は unit-of-work.md U2 行(按分50行: tracer resolver 部 35+resolver arm 15)から、API 形は component-methods.md の tracer-provider 改修節から、FR 契約は requirements.md FR-SPAN-1〜3 / FR-SUB-4 から、価値は story-map 段2から、本 Unit は resolver(span attributes)のみを扱い store/Relay 面は無改変 — その境界(既存 `.amadeus-otel/` JSONL への additive・Relay 無改変)を変更しないことは services.md に依拠する。

## 解決フロー

1. **intent/space**: activeIntent/activeSpace で解決 — 解決不能(cursor 不在等)は両キー**省略**(意図的相違: logger-provider.ts:97 の journal 書込は "workspace" フォールバックだが、span 属性は不在が正 — citation-semantics-check 準拠の明文照合)
2. **stage/phase**: state ファイルの Current Stage を getField で読み(既習様式: amadeus-session-start.ts:191 ほか)、stage graph から phase を引く。**per-process memo** — hot path で state を再読しない。memo 無効化は resetSpanContextForTests(テスト)のみ(プロセスは短命 = ステージ遷移を跨ぐ長命プロセスは engine 本体のみで、engine は遷移時に自プロセスを終える実行モデル)
3. **agent.type/id**: env 存在時のみ(FR-SUB-4 確定 — domain-entities の実測節参照)
4. span record 組み立て(AmadeusSpan.end())で resolver 出力を record.attributes へ merge(呼出し側 setAttributes より優先度低 = 明示設定を上書きしない)

## 無改変保証(FR-SPAN-3)

subprocess-span.ts:80-87 の Command/ExitCode+write-time redaction は非接触。既存 characterization(t-otel-core-plumbing / t384 系)の green を PR の完成条件に含める。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T03:27:30Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major 2件(services.md 装飾トークンの実参照化 / logger-provider.ts:97 引用の意味論照合 — フォールバック vs 省略の意図的相違明文化)を是正確認し READY。FR-SUB-4 供給経路の FD 実測確定(env チャネル不在 → resolver 契約のみ・省略動作)も iteration 1 で妥当性確認済み。

### Findings

- None

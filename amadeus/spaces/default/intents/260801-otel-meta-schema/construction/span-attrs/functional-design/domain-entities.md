# Domain Entities — U2 span-attrs

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U2 の責務は unit-of-work.md U2 行(按分50行: tracer resolver 部 35+resolver arm 15)から、API 形は component-methods.md の tracer-provider 改修節から、FR 契約は requirements.md FR-SPAN-1〜3 / FR-SUB-4 から、価値は story-map 段2から、本 Unit は resolver(span attributes)のみを扱い store/Relay 面は無改変 — その境界(既存 `.amadeus-otel/` JSONL への additive・Relay 無改変)を変更しないことは services.md に依拠する。

## span attribute resolver(tracer-provider 内部)

```typescript
// 公開型は追加しない。resolver は span record 組み立て時に呼ばれる内部関数:
// resolveSpanContextAttributes(projectDir): Record<string, string>
//   - amadeus.intent.id / amadeus.space: activeIntent/activeSpace で解決。
//     呼出し形は logger-provider.ts:97 と同一だが、失敗時挙動は意図的相違:
//     journal 側は "workspace"/DEFAULT_SPACE へフォールバック(常に値を持つ設計)、
//     本 resolver は両キー省略(NFR-1 fail-open — span 属性は不在が正)
//   - amadeus.stage / amadeus.phase: state の Current Stage 読み(per-process memo)
//   - amadeus.agent.type / amadeus.agent.id: AMADEUS_AGENT_TYPE / AMADEUS_AGENT_ID env が存在する場合のみ
// 全キー fail-open(解決不能は省略)
```

## 不変条件

- resolver の出力キーは上記6キーの閉集合。値は string、省略キーは不在(parse-don't-validate)
- stage memo はテストリセットシーム(resetSpanContextForTests)を持つ

## FR-SUB-4 供給経路の FD 実測確定(AD からの委譲事項)

- **実測**: hook 入出力契約(ClaudeCodeHookInput、amadeus-lib.ts:4957-4977 verbatim 確認)に env 注入チャネルは存在しない。hook の stdout 出力面にも subagent プロセス env を書き換える契約はない。subagent は親プロセス env を継承するが、それはセッション共通であり per-agent 識別(agent.type/id)を運ぶ per-spawn チャネルにならない
- **確定(AD components.md:21 の分岐 (ii))**: 本 intent では **resolver 契約のみ実装**。AMADEUS_AGENT_TYPE/ID は「将来ハーネスが env 注入を提供した場合に自動的に効く受け口」であり、現行ハーネスでは常に省略動作(fail-open)= requirements FR-SUB-4 の「解決可能な場合」条項の範囲内で仕様変更なし

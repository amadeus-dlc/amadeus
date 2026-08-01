# Component Dependency — otel-meta-schema

上流入力(consumes 全数): requirements.md、architecture.md(codekb 260801 現在節)、component-inventory.md(同)— 依存の向き(bootstrap→3プロバイダ、redaction/registry の横断)は architecture.md 現在節の現行依存グラフへ additive に重ねた。component-inventory.md 現在節の改修面目録と1:1。

## 依存グラフ

```mermaid
graph TD
  HOOKS_SS[hooks/session-start] -->|supplyResourceAttribute| SUP[otel/resource-suppliers]
  HOOKS_SE[hooks/session-end] -->|supplyTokenUsage| SUP
  RES[otel/resource] -->|suppliedResourceAttributes| SUP
  BOOT[otel/bootstrap] -->|buildResource+register| RES
  BOOT --> TP[tracer-provider]
  BOOT --> LP[logger-provider]
  BOOT --> MP[meter-provider]
  RES --> TP
  RES --> LP
  RES --> MP
  RED[otel/redaction] --> TP
  REG[otel/event-registry] --> TP
  REG --> LP
  INST[otel/metrics-instruments] --> MP
  HOOKS_PT[hooks/subagent-start 新設] -->|SUBAGENT_STARTED| LP
  LIFE[otel/subagent-lifetime] -->|readJournalRecords| JOURNAL[amadeus-journal]
  TP --> SPX[local-span-exporter redactRecord+resource]
  HOOKS_PT -.->|AMADEUS_AGENT_* env 供給経路は FD 未決| TP
```

## テキストフォールバックと不変条件

テキストフォールバック: hooks(session-start/session-end/subagent-start)が suppliers へ供給し、resource が suppliers を読んで(RES→SUP)合成、bootstrap が3プロバイダへ配布。redaction/registry は tracer/logger の横断依存。metrics-instruments → meter-provider。subagent-lifetime は journal 読みのみに依存(Relay 非依存)。

**循環なし**(呼び出し方向は resource → suppliers の一方向。suppliers はどのモジュールへも依存しない葉ノード)。ハーネス中立境界: 新設は全て core 側、ハーネス固有値は hook 実行時の supplier 呼出しでのみ流入(NFR-2)。

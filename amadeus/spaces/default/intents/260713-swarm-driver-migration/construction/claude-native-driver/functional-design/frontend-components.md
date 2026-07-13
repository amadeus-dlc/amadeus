# Claude Native Driver Frontend Components

## N/A判定

U-03はCLI adapter、Claude Code process、provider-state/stream normalizer、harness projectionだけを扱い、browser、GUI、form、frontend stateを追加しない。そのためfrontend component hierarchy、props/state、form validation、API integrationは非適用である。

この判定は`unit-of-work.md`のC-05/Claude conductor境界、`unit-of-work-story-map.md`のCLI acceptance slice、`requirements.md`のstdout/stderrとlive proof、`components.md`のprovider adapter、`component-methods.md`の`DriverAdapter`/`LaunchSpec`、`services.md`のUX feedback contractに基づく。

## CLI feedback contract

worker開始前にC-01の既存1行表示を使い、driver、mode、topology、attemptだけを示す。U-03はClaude固有のprompt、team/task内容、workflow script、credential、raw eventを追加表示しない。

```text
Swarm driver: requested=auto selected=claude-agent-teams mode=native topology=coordinated attempt=<id>
```

失敗時は列挙済みcodeと修正方針だけをstderrへ出す。

```text
Error: selected=claude-ultracode reason=native-evidence-unavailable action=verify Claude Dynamic Workflow surface
```

## Interaction scenario

1. 利用者は既存の`/amadeus` Construction workflowを開始する。
2. harness conductorがC-01を呼び、選択結果を表示する。
3. native実行中はC-01の進捗だけを表示し、Claudeのraw streamを直接流さない。
4. evidence/refereeがgreenなら完了を表示し、失敗ならfallbackせず再開可能性を示す。

## Accessibilityと機密性

色だけに依存せず、stdoutとstderrを分離し、機械読取可能なenumを含める。対話widgetやhidden promptを追加せず、機密情報を画面へ投影しない。

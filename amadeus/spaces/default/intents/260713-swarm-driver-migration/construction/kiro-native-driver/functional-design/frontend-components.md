# Kiro Native Driver Frontend Components

## 適用判定

U-05はCLI/session/provider adapterであり、frontend、GUI、form、browser stateを持たない。したがってcomponent hierarchy、props/state、visual interactionはN/Aである。engine directiveのproducesに含まれるためUIを新設せず、CLI feedback contractを記録する。

この判断は`unit-of-work.md`のU-05、`unit-of-work-story-map.md`のKiro slice、`requirements.md`のFR-14/FR-19/FR-23、`components.md`のC-07/C-08、`component-methods.md`のwave/event v1、`services.md`のKiro process/session contractに基づく。

## CLI feedback contract

selectionとwave planをworker開始前にstderrへ出す。

```text
Swarm driver: requested=kiro-subagent selected=kiro-subagent mode=native engine=v2 units=5 waves=3+2 attempt=<id>
```

各wave開始/完了はcountとindexだけを表示する。

```text
Kiro native wave: index=1/2 units=3 state=starting
Kiro native wave: index=1/2 expectedChildren=3 completedChildren=3 state=evidence-verified
```

session/child raw ID、agent message、prompt、summary、credential、email、worktree absolute path、session rootを表示しない。

## Pre-dispatch error

明示driverが利用不能ならworker/worktreeを新規作成せずhard errorにする。

```text
Error: requested=kiro-subagent unavailable reason=session-profile-unknown engine=v2; no coordinator or worker was started
```

trust不足は修正行動を示すが、`--trust-all-tools`を勧めない。

```text
Error: requested=kiro-subagent unavailable reason=trusted-agent-profile-invalid; validate the project Kiro agent configuration and retry
```

`auto`のdispatch前fallbackだけwarningにする。

```text
Warning: requested=auto selected=kiro-subagent-floor mode=floor reason=native-evidence-unavailable
```

## Post-dispatch error

process/session/child/referee failureはfallback warningに変換しない。

```text
Error: selected=kiro-subagent attempt=<id> wave=2/2 state=failed-resumable code=KIRO_CHILD_COUNT_MISMATCH expected=2 observed=1
```

raw stdout/session/provider payloadをdiagnosticへ展開せず、redaction済みstatusを参照させる。

## Status projection

machine-readable stdoutは既存C-01 schemaを使い、Kiro固有追加fieldを次に限定する。

```text
provider = kiro
modeIdentifier = kiro-subagent-v1
engine = v2
surfaceProfileId
waveCount / currentWaveIndex / waveSizes
parentSessionDigest
expectedChildCount / observedCompletedChildCount
runtimeAgentConfigSetDigest
evidenceState
```

stderrの人向け表示とJSON stdoutを混在させない。色、spinner、TUI、対話approvalへ依存しない。

## Kiro CLI / Kiro IDE一貫性

Kiro CLIとKiro IDEの両conductorで同じrequested/selected/mode/wave/status codeを使う。IDEのpanelやhook固有表示を契約へしない。既存IDE `invoke_sub_agent`はfloor/legacy表示とし、native session evidenceへ読み替えない。

## Accessibilityとplatform

GUIがないためvisual accessibilityはN/Aである。全状態を文字列codeと数値countで示し、色だけで成功/失敗を表現しない。macOSをcredentialed live proof、GitHub Actions Linuxをdeterministic proof対象とする。Windows対応を示す未検証表現は追加しない。


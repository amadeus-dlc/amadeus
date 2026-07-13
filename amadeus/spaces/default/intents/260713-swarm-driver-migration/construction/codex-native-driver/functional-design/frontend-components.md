# Codex Native Driver Frontend Components

## 適用判定

U-04はCLI/hook/provider adapterであり、frontend、GUI、form、browser stateを持たない。したがってcomponent hierarchy、props/state、visual interactionはN/Aである。engine directiveのproducesに含まれるため、UIを新設せずCLI feedback contractを本成果物へ記録する。

この判断は`unit-of-work.md`のC-06境界、`unit-of-work-story-map.md`のCLI acceptance slice、`requirements.md`のFR-13/FR-18/FR-19/FR-23、`components.md`のC-01/C-06/C-10、`component-methods.md`のversioned JSON CLI、`services.md`のUX feedback contractに基づく。

## CLI feedback contract

worker開始前にstderrへ1行のredaction済みselectionを出す。

```text
Swarm driver: requested=codex-ultra selected=codex-ultra mode=native topology=independent attempt=<id> model=<resolved-id> effort=ultra
```

model IDはapp-server catalogとSessionStartで一致したresolved IDだけを表示する。credential、account、prompt、thread/agent raw ID、worktree absolute pathを表示しない。

## Pre-dispatch error

明示driverが利用不能な場合は代替を実行せず、原因と次の行動をstderrへ出す。

```text
Error: requested=codex-ultra unavailable reason=ultra-not-supported model=<resolved-id>; no worktree or worker was started
```

hook未trustedでは次を出す。

```text
Error: requested=codex-ultra unavailable reason=hook-untrusted; review the project Codex hooks, then retry
```

`auto`のdispatch前fallbackだけはwarningとする。

```text
Warning: requested=auto selected=codex-exec-floor mode=floor reason=native-evidence-unavailable
```

## Post-dispatch error

process/hook/child/referee failureはfallback warningに変換せず、attemptを再開可能として表示する。

```text
Error: selected=codex-ultra attempt=<id> state=failed-resumable code=CODEX_CHILD_COUNT_MISMATCH expected=<n> observed=<n>
```

raw JSONL、agent message、hook payload、command line、envをdiagnosticへ展開しない。詳細はredaction済みcheckpoint/statusを参照させる。

## Status projection

`status`のmachine-readable stdoutは既存C-01 schemaだけを使う。Codex固有追加fieldは次に限定する。

```text
provider = codex
modeIdentifier = codex-ultra-v1:<resolved-model-id>
resolvedModelId
modelCapabilityDigest
probeBindingDigest
parentThreadDigest
collaborationLifecycleDigest
expectedChildCount / observedCompletedChildCount
evidenceState
```

人向けstderrとmachine-readable stdoutを混在させない。色、spinner、対話promptに依存せず、headless `codex exec`とGitHub Actions fake suiteで同じ意味を保つ。

## Accessibilityとplatform

GUIがないためvisual accessibility項目はN/Aである。全状態は文字列codeと数値countで表し、色だけでsuccess/failureを示さない。macOSをcredentialed live proof対象、GitHub Actions Linuxをdeterministic対象とし、Windows対応を示す未検証メッセージは追加しない。

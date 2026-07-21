# Unit Test Instructions — team-up Codex safety-wait

## Test strategy

active Test StrategyはMinimalである。[Code Generation Plan](../team-up-safety-wait/code-generation/code-generation-plan.md) のTDD契約と [Code Generation Summary](../team-up-safety-wait/code-generation/code-summary.md) の最終実装を入力に、FR-1〜6とAC-1〜10を17件のrequirement-driven unit testで検証する。実Herdr/Codex processは使用せず、adapter、clock、pane snapshotをtest doubleへ閉じる。

## Run command

```sh
bun test tests/unit/t-team-up-codex-safety-wait.test.ts
```

期待値は17 pass、0 fail、73 assertionsである。test順序や共有mutable stateへ依存せず、fixtureは`tests/fixtures/team-up-codex-safety-wait/test-only-positive.json`からtest側だけが読む。

## Requirement coverage

| Requirement | 主な検証 |
| --- | --- |
| FR-1 / AC-2 / AC-8 / AC-9 | current Codex roleのexact mapping、0/複数/異runtime拒否、送信直前identity再照合 |
| FR-2 / AC-1 / AC-10 | closed schema、version、120x34、CRLF以外を正規化しないexact positive |
| FR-3 / AC-1〜4 | stability/TTL、Enter唯一1回、post-send modal残存とtimeout時の追加入力0 |
| FR-4 / AC-3 / AC-4 | unknown latch維持、test-only exact absence連続2回だけのrearm |
| FR-5 / AC-5 / AC-6 / AC-8 | lifecycle record predicateとsupervisor active条件 |
| FR-6 | pane本文を複製しないtyped result |

## Negative and regression data

- ANSI、wrap、partial、marker欠損、version drift、unstable read、expired TTL、ambiguous identityはすべて入力0件。
- ANSI/wrap/partial後にexact modalが再出現しても、pane latchによりEnter総数1。
- production activationは内部positiveでenabledだが、test-only fixture loader、environment、CLI injectionから非到達。
- failure時は同じtestをREDとして保持し、原因を特定するまで期待値を緩和しない。

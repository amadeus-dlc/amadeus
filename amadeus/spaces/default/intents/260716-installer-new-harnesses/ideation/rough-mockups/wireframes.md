# Wireframes(出力モック)— installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../intent-capture/intent-statement.md`(意図・成功の姿)、`../scope-definition/scope-document.md`(In 1/3/5)、`../scope-definition/intent-backlog.md`(B-1〜B-4)。
> 方式: ui-less-mockups-as-output-contract(既決)— verdict 別の出力文言+exit code モック。様式は既存 `packages/setup/src/modules/reporter.ts` の既習様式(usage :20-27、ACTION_LABELS、renderAlreadyInstalled 系)に揃え、新規発明しない。

## モック1: usage(更新後 — 列挙 6値)

```
amadeus-setup

Usage:
  amadeus-setup install [--harness <claude|codex|kiro|kiro-ide|opencode|cursor>] [--target <path>] [--version <semver|tag>] [--yes] [--force]
  amadeus-setup upgrade [--harness <claude|codex|kiro|kiro-ide|opencode|cursor>] [--target <path>] [--version <semver|tag>] [--yes] [--force]
  amadeus-setup            # this help; install/upgrade are never run implicitly
```
exit 0(引数なし)— 既存挙動保存、`<...>` 内の列挙だけが 4→6。

## モック2: `install --harness opencode` 正常系

既存 install 完走出力(plan 表示 → 配置 → 検証)と**同一様式・同一段構成**で、ハーネス名/配置先だけが変わる:

```
Installing amadeus (opencode) ...
  <既存 ACTION_LABELS による plan 行 — 様式不変>
Installed: .opencode/ + amadeus/ (+ AGENTS.md)
```
exit 0。cursor も同型(`.cursor/` + amadeus/ + AGENTS.md)。

## モック3: 未知ハーネス(エラー verdict — 更新後)

```
Invalid --harness value: "foo". Expected one of claude, codex, kiro, kiro-ide, opencode, cursor.
```
exit 2(既存 UsageError.invalidHarness の様式・exit code 不変 — 列挙のみ 6値)。

## 受け入れ基準への導出

- モック1/3 の列挙文字列 → requirements の全数性 AC(6値の exact match テスト文言)
- モック2 の完走 → install 正常系 AC(exit 0+配置検証)

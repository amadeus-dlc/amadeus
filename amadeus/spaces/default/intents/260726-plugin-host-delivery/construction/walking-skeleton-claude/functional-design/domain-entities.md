# Domain Entities — U2 walking-skeleton-claude

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> UI なし(services.md — CLI/フック単発実行のみ。frontend-components.md は非該当につき不生成)。既存 engine の型(ValidPlugin / PluginCompositionPlan / CompositionRecord 等 — `scripts/plugin-composition.ts` の export、移設後も**シグネチャ不変**が component-methods.md C2 の契約)は再定義しない — 本書は U2 が**新設**する型のみを定義する。

## PluginCliArgs(C1 CLI の引数 — parse-don't-validate)

| フィールド | 型 | 制約 |
|---|---|---|
| verb | `"compose" \| "doctor" \| "drop" \| "status"` | 未知 verb・引数なしは usage+exit 2(mutation 不到達 — component-methods.md C1 表) |
| ifStale | boolean | `--if-stale` — compose のみ有効。他 verb に付くと未知フラグ拒否 |
| projectRoot | string(絶対パス化済み) | `--project-root <dir>` — 省略時は cwd 起点の既存 project-root 解決を再利用 |
| dropTarget | string(plugin name) | drop のみ。余剰引数は fail-closed 拒否 |

パース失敗はすべて `{ kind: "usage-error", message }` へ(未知フラグの無視は禁止 — ADR-3 是正済みのセキュリティ契約)。

## PluginCliResult(判別 union — handlePluginCli の戻り)

```
type PluginCliResult =
  | { kind: "composed"; applied: number; recompiled: true }
  | { kind: "noop"; reason: "record-current" }          // --if-stale 早期 return(FR-3c-no-op の実測点)
  | { kind: "dropped"; plugin: string; baselineRestored: boolean; recompiled: true }  // compose⇔drop の対称性(両 mutation とも再 compile 完了を型で確認)
  | { kind: "doctor"; lines: readonly DoctorLine[]; degraded: boolean }
  | { kind: "status"; installed: number; composed: number; revision: number }
  | { kind: "usage-error"; message: string }             // exit 2
  | { kind: "failure"; stage: "discover" | "trust" | "plan" | "apply" | "recover"; message: string } // exit 1、stderr 1 行 loud
```

## DoctorLine(C5 契約の U2 最小面 — claude 分のみ)

| フィールド | 型 | 備考 |
|---|---|---|
| plugin | string | — |
| state | `"ok" \| "drift" \| "degraded" \| "advisory"` | degraded は doctor 全体 exit へ FAIL 伝播(component-methods.md C5) |
| detail | string | diagnosePlugins の既存戻り値からの射影のみ(新判定を作らない) |

## HookInvocation(claude SessionStart 配線の契約)

| フィールド | 型 | 制約 |
|---|---|---|
| command | `bun <harnessDir>/tools/amadeus-plugin.ts compose --if-stale` | component-methods.md C4 の共通形 verbatim |
| failureMode | stderr 1 行警告+セッション継続 | 起動ブロック禁止(fail-loud/continue) |

## 不変条件

- `noop` 経路は applyPluginPlan へ**不到達**(requirements FR-3c-no-op: 到達カウンタ or 書込不発生 assert)
- compose 2 回目の host bytes・composition record は 1 回目と byte-identical(FR-3c-冪等)
- drop 後(最後の 1 plugin)の host ツリーは 0-plugin build と byte-identical(FR-6)

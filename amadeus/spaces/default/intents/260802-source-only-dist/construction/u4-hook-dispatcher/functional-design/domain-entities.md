# Domain Entities — u4-hook-dispatcher

上流入力(consumes 全数): component-methods(C3 契約)、requirements(FR-3.2)、components(C3)、unit-of-work(u4)、unit-of-work-story-map(Slice 2)、services(該当外部なし)。

## 型定義(functional-domain-modeling-ts スタイル)

```ts
// packages/framework/harness/claude/hooks/amadeus-dispatch.ts 内
type HookSlug = string & { readonly __brand: "HookSlug" };

namespace HookSlug {
  // parse-don't-validate: 静的表に在る slug のみ通す。未知は typed error
  export declare function parse(raw: string): Result<HookSlug, string>;
}

type DispatchOutcome =
  | { readonly kind: "delegated"; readonly exitCode: number }  // 実体へ透過済み
  | { readonly kind: "not-built" }                              // 案内出力 + exit 0
  | { readonly kind: "unknown-slug"; readonly known: readonly string[] }; // exit 1
```

- `DispatchOutcome` は判別 union。`not-built` と `unknown-slug` を別 variant にすることで「想定内 fallback を fatal 経路へ流さない」(project.md Forbidden)を型で表現

## 静的表(slug 集合)

settings.json の11参照に対応する実体10種(mint-presence は2参照1実体): mint-presence / session-start / session-end / audit-logger / sensor-fire / sync-statusline / runtime-compile / validate-state / log-subagent / stop。slug は settings.json の参照集合から導出(BR-U4-7)。**対象外の明示**: `.claude/hooks/` 実在13本のうち settings.json 未参照の2本(`amadeus-log-subagent-start.ts` / `amadeus-plugin-compose.ts` — 後者は他面から呼ばれる想定、code-structure.md B8)は dispatcher の静的表に含めない(本 Unit の N/A — 参照経路が settings.json でないため dispatcher 化の対象がない)。

## 不変条件

1. dispatcher が exit 0 を返すのは「実体が exit 0」または「not-built」の2場合のみ
2. dispatcher 自身は record・state・監査へ一切書き込まない(透過層)
3. settings.json 内の `.claude/hooks/amadeus-<slug>.ts` 直接参照は 0 件(dispatch 経由のみ)

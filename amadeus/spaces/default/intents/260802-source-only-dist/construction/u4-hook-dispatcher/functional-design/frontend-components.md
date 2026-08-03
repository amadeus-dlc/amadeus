# Frontend Components — u4-hook-dispatcher

上流入力(consumes 全数): requirements(Out of Scope — UI なし)、components(C3 = hook 配線のみ)、component-methods / services / unit-of-work / unit-of-work-story-map(UI 要素の不存在確認)。

## 該当なし(N/A)の宣言と根拠

u4-hook-dispatcher はフック配線の CLI 層のみで UI を持たない。produces 全件実在要件を満たす根拠付き N/A 宣言。

## 出力契約(人間可読面)

- 不在案内: `amadeus-dispatch: hooks are not built yet (fresh clone?) — run \`bun run build\` to generate them`(exit 0)
- 未知 slug: `amadeus-dispatch: unknown hook slug "<slug>" — known: <list>`(exit 1)

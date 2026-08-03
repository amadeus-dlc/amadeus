# Frontend Components — u8-source-only-switch

上流入力(consumes 全数): requirements(Out of Scope — UI なし)、components(C7/C8/C9 = Git 境界と CI のみ)、component-methods / services / unit-of-work / unit-of-work-story-map(UI 要素の不存在確認)。

## 該当なし(N/A)の宣言と根拠

u8-source-only-switch は Git 追跡境界・CI 検査・生成器責務の切替のみで UI を持たない。produces 全件実在要件を満たす根拠付き N/A 宣言。

## 出力契約(人間可読面)

- 境界ガード違反: `source-only boundary violated — <N> generated file(s) are tracked:` + パス列挙(exit 1)
- 第3ガード不変量違反: 違反した不変量 (i)〜(v) の識別子+詳細(exit 1)

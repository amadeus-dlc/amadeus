# Frontend Components — u7-ci-stage1

上流入力(consumes 全数): requirements(Out of Scope — UI なし)、components(C7 = CI 構成のみ)、component-methods / services / unit-of-work / unit-of-work-story-map(UI 要素の不存在確認)。

## 該当なし(N/A)の宣言と根拠

u7-ci-stage1 は CI 構成とテストランナー入口の変更のみで UI を持たない。produces 全件実在要件を満たす根拠付き N/A 宣言。

## 出力契約(人間可読面)

- 入口ガード: `run-tests: dist/ is missing — run \`bun run build\` first`(exit 1)
- 再現性検査失敗: 差分ファイル数と先頭 N 件のパス列挙(loud)

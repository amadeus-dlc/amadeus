# Frontend Components — u5-agents-import

上流入力(consumes 全数): requirements(Out of Scope — UI なし)、components(C4 = 指示ファイル合成の再編のみ)、component-methods / services / unit-of-work / unit-of-work-story-map(UI 要素の不存在確認)。

## 該当なし(N/A)の宣言と根拠

u5-agents-import はルート指示ファイルの構成再編と生成器改修のみで UI を持たない。produces 全件実在要件を満たす根拠付き N/A 宣言。

## 出力契約(人間可読面)

- 整合テスト失敗時: 乖離ファイルと該当行範囲の列挙(loud)
- build 時の suffix 生成ログ: 生成先パス1行(既存 promote-self の出力様式に従う)

# Frontend Components — u3-scope-promotion

上流入力(consumes 全数): requirements(Out of Scope — UI なし)、components(C6 = データ移設のみ)、component-methods / services / unit-of-work / unit-of-work-story-map(UI 要素の不存在確認)。

## 該当なし(N/A)の宣言と根拠

u3-scope-promotion は scope 定義ファイルの移設・stage frontmatter タグ付け・センサー期待改訂のみで、フロントエンド/UI コンポーネントを持たない。本書は produces 全件実在要件を満たす N/A 宣言(根拠付き薄書)。

## 出力契約(人間可読面)

- deep-equal テスト失敗時: 不一致キーとセル差分の列挙(loud)
- self-scope-consistency FAILED 時: 既存センサーの detail finding 様式に従う

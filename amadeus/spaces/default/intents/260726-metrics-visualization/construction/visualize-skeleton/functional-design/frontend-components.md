# Frontend Components — U1 visualize-skeleton(生成 HTML の構造)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

## ページ構造(単一 index.html — story-map「見る」ジャーニー)

```
<!doctype html>
<head> … inline <style> のみ(外部参照ゼロ — services.md 境界)
<body>
  <h1> + メタ行(スナップショット件数・期間・最新 commit 12桁 — いずれも入力データ由来の決定値のみ。wall-clock の生成時刻は埋め込まない: renderHtml 決定性ルール(business-rules.md ルール11)により --check(U2)のバイト比較を成立させる)
  <section class="collector"> × コレクタ数(discoverCollectors 順)
    <h2>コレクタ名</h2>
    <div class="chart"> × キー数(unionValueKeys 順)
      <h3>キー名</h3>
      <svg>(折れ線: <path> + データ点 <circle><title>captured_at / commit12</title></circle>)
    </div>
    <details><summary>値表</summary>
      <table>(行 = スナップショット: captured_at / commit12 / 各キー値(formatValue))</table>
    </details>
  </section>
```

## 表示規約(U1 範囲)

- スタイルは inline `<style>` の最小セット(等幅数値・チャート枠・余白)。配色・強調 class(`regressed`)の意匠は U2 で追加(requirements.md FR-4 S2)— U1 は構造のみ用意しない(YAGNI、無強調)
- 表示文言(見出し・メタ行)は日本語(閲覧者 = ユーザー、requirements.md FR-4)。HTML コメント・class 名は英語
- 値表は `<details>` 折りたたみでチャートの1画面性(S1)を守りつつ、SHA 遡及の非 hover フォールバック(business-rules.md ルール7)を提供
- SVG 寸法は固定幅(viewBox)でレスポンシブ不要(ローカル単独閲覧)

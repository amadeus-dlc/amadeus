# Frontend Components — U2 visualize-hardening(HTML への増分)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

## U1 ページ構造への追加(story-map「気づく」ジャーニー)

U1(construction/visualize-skeleton/functional-design/frontend-components.md)の構造を変えず、以下を重ねる:

- **強調スタイル**: inline `<style>` へ `.regressed` を追加(赤系の背景/枠 — 劣化が1画面スキャンで目に入ること(S2)が唯一の要件。具体色は実装時に既存 coverage HTML(tests/run-tests.ts の配色)へ揃える)
- **強調の付与位置**: 各チャートの最新データ点 `<circle class="regressed">` と、値表の最新行の該当セル `<td class="regressed">`(チャート・表の両面で気づける)
- **凡例行**: メタ行直下に「赤 = 直前スナップショットからの劣化」の1行(日本語)
- 決定性(U1 ルール11)は維持 — 強調判定はスナップショットデータのみから導出され、同一入力で同一出力

## 変更しないもの

- ページ骨格(section/chart/details 構造)・SVG 寸法・メタ行の決定値構成 — U1 確定のまま(--check の比較対象は「凡例行+class 追加後」の新基準バイト列になるだけで、決定性契約は不変)

# Build & Test Summary — 260814-plugins-rename-drift

上流入力: `build-test-results.md`(実測)、instructions 5 面、各 Unit の `code-generation/code-summary.md`。

## 判定

- **統合断面のローカル検証**: 型・lint・ビルド・配送先ツリー述語 green。フルスイートの機能赤は帰属分解済み(統合固有の registry 鮮度 → 修正済み / pi-driver flake → 非帰属)で、**本 intent の変更に帰属する機能赤 0 件**。
- **リモート CI(blocking の正)**: 3 PR とも既知の赤を全て是正済みで再実行中。green 到達後は queue 経由で自動マージ(ユーザー事前承認、順序 #3051 → #3052 → #3055 retarget)。
- 落ちる実証: FR-REN(scope-grid 注入 1 セット)/ FR-SET(4 項)/ FR-DRIFT(3 経路 + 正当系 + 設定実消費)すべて成立(各 code-summary に実測記録)。
- テスト理論衛生: 性能・セキュリティは承認済み NFR に trace できる範囲のみ生成(生成しなかった検査は instructions に根拠明記 — 検証劇場なし)。

## 申し送り

1. size 分類(medium→large)の負荷依存 flag は本 intent 非帰属だが、複数エージェント並行環境で再発しやすい — 別件観察として記録(起票はしない: 既知の load-sensitive 帯 #1331/#1326 の範疇)。
2. coverage registry は「新規テスト追加 PR は regen を同梱する」— #3051/#3052 側は対応済み。マージ順により最終 main 断面で再 regen が必要になった場合は queue の Tests が検出する。
3. ノルム PR(team.md の remote-first 追記)は intent 完了前に単独ブランチで起票する(persist ごとの PR 義務)。

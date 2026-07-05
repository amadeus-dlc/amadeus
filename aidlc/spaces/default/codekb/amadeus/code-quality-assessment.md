# コード品質評価：amadeus

## 強み

- 決定論的 eval（25 種）が「隔離 workspace + 実 CLI 駆動」で統一され、手書き fixture による不整合の隠蔽を避ける規約が learnings に定着している。
- 失敗の観測経路が対称に揃っている: ツール CLI とエンジンの ERROR_LOGGED（#431）、hooks の drops + doctor 表面化（#432）、audit の追記型台帳。
- 上流適応の追跡（parity）と skill 昇格（promote）の機械化により、二重管理の逸脱が検査で捕まる。

## 既知の弱み（記録時点）

- パス解決の固定深度仮定が層をまたいで再発してきた（runtime memory_path = #457/#458、graph rulesDir = #491、workspace-detection の定型 dir 前提 = #459）。「構造を根拠にした解決」への置換が進行中の傾向として続く見込み。
- intents.json の entry 追記が並行 PR 間で毎回衝突する（2026-07-05 に 4 回）。entry 分割ファイル化 + 生成物化が検討中。
- codekb を含む知識スナップショットの鮮度は自動検査されない（本ファイル群の 7/3 版が実体とズレたまま参照可能だった実例あり）。

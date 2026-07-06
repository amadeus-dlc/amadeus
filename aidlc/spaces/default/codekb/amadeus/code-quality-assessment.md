# コード品質評価：amadeus

## 強み

- 決定論的 eval（29 種）が「隔離 workspace + 実 CLI 駆動」で統一され、手書き fixture による不整合の隠蔽を避ける規約が learnings に定着している。
- 失敗の観測経路が対称に揃っている: ツール CLI とエンジンの ERROR_LOGGED（#431）、hooks の drops + doctor 表面化（#432）、audit の追記型台帳。
- 上流適応の追跡（parity）と skill 昇格（promote）の機械化により、二重管理の逸脱が検査で捕まる。
- workspace_requires ガードの docs-only 宣言は audit trail クロスチェック付きで検証される（#499）。宣言の書き込み口を declare-docs-only 1 か所に限定することで、意図しない免除の混入を防ぐ。
- codekb 採用 stub の参照解決（正本パスの dangling reference 検出）は validator が検査する（#501）。
- learnings persist の cid marker は Intent 込みの新形式（cid:<dirName>:<stage>:<cN>）で衝突が構造的に解消され、戻り値の rule_learned / already_present 分離でスキップの無言化も解消された（#504）。
- エンジン tools は全ファイルが import 副作用なしでロードでき、未ガード main() の新規混入は eval の全 tools 走査で回帰検出される（#507）。

## 既知の弱み（記録時点）

- パス解決の固定深度仮定が層をまたいで再発してきた（runtime memory_path = #457/#458、graph rulesDir = #491、workspace-detection の定型 dir 前提 = #459、codekb repo キーが linked worktree で basename(projectDir) を worktree 名に誤解決 = #498）。#498 は `git rev-parse --git-common-dir` 由来の主リポジトリ解決へ置換して修正済みで、「構造を根拠にした解決」への置換が進行中の傾向として続く見込み。
- intents.json の entry 追記が並行 PR 間で毎回衝突する（2026-07-05 に 4 回）。entry 分割ファイル化 + 生成物化が検討中。
- codekb を含む知識スナップショットの鮮度は自動検査されない（本ファイル群の 7/3 版が実体とズレたまま参照可能だった実例あり）。validator は reverse-engineering の reference-stub が指す codekb 正準ファイルの「実在」は検査する（#501）が、内容が最新かどうかは検査対象外のまま。

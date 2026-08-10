# reverse-engineering memory (260810-plugin-manifest-resoluti)

## Interpretations

- 2026-08-10T10:05:00Z — Scan mode: xrev differential scan (cid:reverse-engineering:c1-xrev-scan-mode / c1-xrev-single-issue / E-XBB-RE-S13-c2); Issue #2823 はクロスレビュー2名成立済み(run xrev-2823-20260810T094918Z、ESTABLISHED_WITH_REFINEMENTS、target SHA c51afbd0a99b2eb3f0b9c1ee4e2cef2772378131)。レビュー verdict を一次入力とし、observed 断面の verbatim 実読で二重化する
- 2026-08-10T10:05:00Z — Base = df1c874cfb397fafe877a72f00a82664a59689ae(re-scans/ 最新 observed、260810-plugin-harness-dir-token)。`git merge-base --is-ancestor` exit 0、`git rev-list --count df1c874c..HEAD` = 13
- 2026-08-10T10:05:00Z — 行番号再解決の免除実測: `git diff --name-only c51afbd0a99b2eb3f0b9c1ee4e2cef2772378131..HEAD`(review..observed に固定)と被引用6パス(amadeus-advisory-declaration.ts / amadeus-advisory-choice.ts / amadeus-plugin.ts / amadeus-plugin-compose.ts / scripts/harness-transform.ts / plugins/formal-model-check/plugin.json)の交わりは**空**。一方 base..observed(df1c874c..HEAD)は amadeus-plugin.ts / plugin-projection.ts を含む(PR #2811 自体の差分)ため、codekb 差分反映はこの観点で実施する

## Deviations

- 2026-08-10T10:55:00Z — Step 3 Architect Synthesis を `subagent_type: amadeus-architect-agent` で出し損ね、Agent tool の default(coder)に architect 指示を inline 注入して実行した。成果物の検証(verbatim 実読・write 範囲限定)は conductor が別途確認済み。次回は subagent_type を明示する

## Tradeoffs

- 2026-08-10T10:55:00Z — code-structure.md / dependencies.md / technology-stack.md は差分がモジュール配置・依存・スタックを変えないため無変更とした(architect 判断を conductor が追認)。last-writer-wins の shared store で不要な churn を避けるため

## Open questions

- 2026-08-10T10:05:00Z — reviewer-1 は「#2267 が asymmetry 1 と同根で重複検索が検出漏れ」、reviewer-2 は「独自角度3検索でも同クラス先行なし」と食い違い。機序の一意確定は本 scan 段の責務(cid:reverse-engineering:c1-xrev-mechanism-resolution)として #2267 本文との突合を実施する
- 2026-08-10T10:05:00Z — 枝(b) hold の到達可能性: r1 はモジュールレベルプローブで hybrid 配置の hold raise を動的確認、r2 は「文書化 install 手順は hybrid 配置を生成しないため実質到達不能に近い」。同一実験系(文書化 install 経路の列挙)で到達可能/不能を分離する

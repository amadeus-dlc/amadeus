# Performance Test Instructions — 260810-plugin-manifest-resoluti

該当なし。requirements に performance NFR は存在しない(NFR-1 後方互換 / NFR-2 決定性 / NFR-3 最小侵入のみ)。manifest 解決は checkpoint あたり高々数回の `existsSync` 追加であり、負荷・ベンチマークの対象外。

Upstream: `construction/fix-2823-plugin-manifest-resolution/code-generation/code-generation-plan.md` / `code-summary.md`

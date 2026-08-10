# Security Test Instructions — 260810-plugin-manifest-resoluti

該当なし(追加の SAST/DAST 対象となる NFR は存在しない)。本変更のセキュリティ関連性は以下に既存ガードでカバーされる。

- evaluator spawn は従来どおり shell 介在なしの argv vector(`spawnSync`、BR-U2-19 不変)
- argv 解決は `join(pluginRoot, element)` のみで、shell 展開・パス traversal の新規面を導入しない(相対要素の join 先は locate 済み plugin ルートに限定)

Upstream: `construction/fix-2823-plugin-manifest-resolution/code-generation/code-generation-plan.md` / `code-summary.md`

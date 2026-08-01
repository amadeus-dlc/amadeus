# Code Generation Plan — U6 docs(Bolt 4)

上流入力(consumes 全数): functional-design 3成果物、nfr-design 5成果物、requirements.md FR-DOC-1 — 新章の6節構成・対訳ペア・乖離解消決定木を FD から、count-free / 引用実測規律を nfr-design から導出。

## 実行形態

gated swarm batch 4(worktree `bolt-docs`)。最終 Bolt。

## 経過(実績)

1. 新章(telemetry-schema en/ja)執筆 — 執筆中に**仕様⇔実装の乖離2件を発見**(BR-U6-3 準拠で docs 独自吸収せず停止・報告)
2. ユーザー裁定3件: (1) amadeus.intent → amadeus.intent.id へ実装是正 (2) amadeus.bolt/unit を本 intent 内で追加実装 (3) telemetry.sdk.language を #1868 §1 表へ編入
3. 裁定2の供給方式は E-OMSB4-DEV(tie)→ ユーザー裁定「worktree-local 解決」→ tracked state の git travel 実測により **untracked マーカー(.amadeus-bolt-context)で執行**(--unit discriminator を swarm→bolt→fork の3ツールへ通過)
4. main が章番号 21/22 を先取(formal-model 章)→ **23-telemetry-schema へ改番**
5. PR レビュー iteration 1 REVISE(引用の行シフト16件)→ 是正(en/ja 38箇所再解決)→ 増分再確認 READY(GoA 1)

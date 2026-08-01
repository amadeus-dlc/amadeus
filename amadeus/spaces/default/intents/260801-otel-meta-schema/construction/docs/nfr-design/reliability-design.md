# Reliability Design — U6 docs

上流入力(consumes 全数): reliability-requirements ほか performance-requirements / security-requirements / scalability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— 信頼性面は requirements.md NFR-3(blocking gate)+ FR-DOC-1 から代替導出。business-logic-model.md(実在)の乖離解消の決定木を消費。

## 文書の「信頼性」= 実装との乖離統制

- 乖離解消の決定木(FD 4分岐): 一致=正常系 / 実装バグ=実装修正 / 意図的乖離=#1868 改訂経由 / requirements 乖離=ユーザーエスカレーション。docs 側での独自吸収は常に禁止(BR-U6-3)— 文書が実装と黙って乖離し続ける失敗モードを手続きで塞ぐ
- 引用の信頼性: 新章の file:line・識別子引用は執筆時に grep 実測してから書く(mechanism-cite-verify-at-draft の docs 適用)

## 検証ゲート

- en/ja ペアの実在は PR レビュー観点(project.md Mandated: paired EN/JA in the same change)で担保。t174 系の既存 docs 検査は legacy refs 面をカバー(新規ペア要否は強制しない — FD 実測)ため、ペア新設の完全性はレビューが正
- CI の docs paths-ignore 盲点(ci-paths-ignore-doc-guard-blindspot)に留意 — doc-consuming テストが新章を読む構成にする場合は paths-ignore との交差を実装時に確認する

## 障害時の回復

- 文書は git 管理成果物 — 誤りの回復は通常 PR の revert / 修正 PR で行い、履歴から常に復元可能(ローカル store と異なる)。deployment-pipeline:c3 は append-only 生成物向けの規範のため根拠には引かない — 本 docs は通常の版管理慣行で足りる

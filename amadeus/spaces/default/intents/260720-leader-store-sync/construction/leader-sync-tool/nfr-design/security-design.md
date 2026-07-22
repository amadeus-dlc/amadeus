# Security Design — leader-sync-tool(U1)

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model — S-1〜S-3(security-requirements.md)の実装形(S-4 は FD BR-3 で担保済み — 下記検証接続に継承明示)。spawn 様式・認証委譲の正本は NR で出典訂正済み(project.md gh-scripts-boundary / AD services.md)。

## 設計

- SD-1: GhRunner/GitRunner は引数配列+env: process.env 明示の spawnSync(no-shell — S-2 実装形。business-logic-model.md の port 実行順序に従い、様式は AD services.md 継承)。
- SD-2: トークン・credential の変数保持ゼロ(S-1 — gh keyring 委譲。環境変数の読取も GH_TOKEN 等へ触れない)。
- SD-3: 書込面は git ブランチ操作のみ(S-3/BR-9 — elections/ への直接 write API を型レベルで持たない = OwnedSet は read 専用構造)。
- (実装細部メモ — 設計判断ではない: SelfCheckReport の PR 本文転記の具体様式(コードブロック内転記等)は code-generation-plan へ委譲。転記面の forge 懸念を新規 NFR として立てる場合は nfr-requirements への差し戻しが必要 — 現時点で要求なし。reviewer 指摘 (a) 採用で SD-4 を格下げ)

## 検証接続

- SD-1 は fake runner の呼出引数 assert、SD-2 は実装 grep(GH_TOKEN 参照 0)、SD-3 は型検査+BR-9 テストで担保。
- S-4(監査整合 — tool 単独で main 到達不能)は FD BR-3(PR 作成まで・auto-merge 禁止)で担保済み — ND 側の追加設計なし(継承明示)。

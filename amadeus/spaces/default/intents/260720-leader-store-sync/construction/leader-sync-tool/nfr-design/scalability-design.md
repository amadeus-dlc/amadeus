# Scalability Design — leader-sync-tool(U1)

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model — SC-1/SC-2(scalability-requirements.md)の実装形。

## 設計

- SCD-1: 走査は elections/ の direntry 列挙+sort(決定的順序 — business-logic-model.md M1 の列挙規則)。55→数百 dir 級まで線形(新機構不要 = tech-stack-decisions.md T-1 整合)。
- SCD-2: 分割提案は SYNC_SPLIT_FILE_LIMIT 超過時に対象一覧を N 分割してユーザー(leader)へ表示 — 自動分割 PR は作らない(判断は人間、C-4 系の対称)。

## 検証接続

- SCD-1 は corpus sweep の全量実行が実証を兼ね、SCD-2 は SYNC_SPLIT_FILE_LIMIT 境界テスト(±1)でピンする。

# Security Test Instructions — 260730-skill-reviewer-fixes

上流入力(consumes 全数): fix-1736-skill-new-intent/code-generation/code-generation-plan.md・code-summary.md、fix-1711-unitname-resolution/code-generation/code-generation-plan.md・code-summary.md — 検証対象・手順・検証済み証拠は両 unit の plan/summary から導出した。

## 判定: N/A(反証可能根拠付き)

本変更は認証・認可・秘密情報・外部入力の検証境界に触れない(SKILL 散文の是正+record 配下の readdirSync による unit 解決)。新規外部入力面は無く、readdirSync の対象は record 配下の自己所有パスに限定される(パス組み立ては既存 recordPrefix 機構を踏襲)。攻撃面の増加が実測されないため、比例選定により専用セキュリティテストは生成しない。既存の必須 scan(CI の lint/complexity、依存監査)は不変。

## 再判定条件

後続変更が unit 解決の入力面を record 外(ユーザー入力・外部 API)へ広げる場合、本判定は失効し、境界検証(パス正規化・シンボリックリンク)を比例選定で追加する。

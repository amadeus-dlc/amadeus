# Security Test 手順 — leader-sync-tool(U1)

上流入力: `code-generation-plan.md`、`code-summary.md`

## 攻撃面と比例選定

- 新規依存、runtime service、HTTP/DB/IaC、外部ユーザー入力はないため DAST・IaC scan・追加 dependency scan は非適用。
- 実在境界は clone-id file、Git/Gh argv、生成 branch、PR 作成である。

## 実行

- focused unit/integration で clone-id missing/invalid/symlink、Git/Gh failure、除外違反、malformed 出力を fail-closed にする。
- `rg -n 'GH_TOKEN|gh pr merge|--shell|shell:' scripts/amadeus-leader-sync.ts` の実装ヒット 0 件を確認する。
- fake runner の argv assertion で no-shell、PR create まで、auto-merge 不在を確認する。

## 合格条件

- credential 読取・表示 0、shell 展開 0、直接 election write API 0、auto-merge 0。
- 失敗は stderr 1 行と非 0 exit へ写像され、判定不能を成功へ丸めない。

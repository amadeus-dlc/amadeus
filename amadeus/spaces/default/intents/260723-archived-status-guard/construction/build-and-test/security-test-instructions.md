# Securityテスト手順

## 脅威と制御

入力改ざん、path traversal/symlink、監査否認、HUMAN_TURN偽造、lock外状態変更、診断への過大入力露出を対象とする。各Unitの `code-generation-plan.md` と `code-summary.md` に定義されたstrict parser、canonical path boundary、operation ID、callback-scoped capabilityを検証する。

## 実行と判定

対象unit/integrationテストと `bun run lint:check` を実行する。未知status、重複timestamp、audit payload不一致、symlink registry、forged targetがすべてfail closedとなり、registry・cursor・auditに意図しない変更がないことを合格条件とする。認証情報、ネットワーク、実データは使用しない。

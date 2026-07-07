# Personas — インストーラの実装

> Stage: user-stories / Intent: `260706-installer-impl`  
> Sources: `requirements.md`, `team-practices.md`, `business-overview.md`, `component-inventory.md`, `user-stories-questions.md`

## Persona Priority

| Priority | Persona | Role | Primary workflow |
|---|---|---|---|
| 1 | 新規 OSS ユーザー | Amadeus を初めて導入する利用者 | README から `amadeus-setup install` で導入する |
| 2 | 既存 Amadeus ユーザー | 手動コピー済みまたは旧版導入済みの利用者 | `amadeus-setup upgrade` で安全に更新する |
| 3 | メンテナー | npm package と GitHub release を管理する保守担当 | `workflow_dispatch` で release/publish する |
| 4 | Contributor / CI Owner | installer 変更をレビュー・検証する開発者 | PR で blocking gates を通す |

## 新規 OSS ユーザー

- **Role**: Amadeus を試したい外部利用者。
- **Goals**: repository clone や手動 `cp -r` なしで、選択した harness を短時間で導入する。
- **Pain points**: どの `dist/<harness>/` をどこにコピーすべきか分かりにくい。失敗時に何が壊れたか不安。
- **Context**: README から `bunx @amadeus-dlc/setup` または best-effort `npx` 経由で入る。Bun が必要。

## 既存 Amadeus ユーザー

- **Role**: 既に Amadeus を導入済みで、バージョン更新したい利用者。
- **Goals**: 既存カスタマイズを失わずに、新しい distribution version へ更新する。
- **Pain points**: 手動コピー導入のため現状 version や変更済み shared file が分かりにくい。上書き事故が怖い。
- **Context**: manifest がある導入と manual-or-unknown 導入の両方がありうる。file-level report と backup policy が安心材料になる。

## メンテナー

- **Role**: `@amadeus-dlc/setup` の release/publish を担う保守担当。
- **Goals**: 最新 stable tag から、手動承認付きで npm release できる。
- **Pain points**: 誤 publish、metadata 不整合、SBOM/provenance 欠落、credentials の扱い。
- **Context**: GitHub Actions `workflow_dispatch` から release validation を実行する。

## Contributor / CI Owner

- **Role**: installer の変更を実装・レビューし、CI を保守する開発者。
- **Goals**: installer 変更が package dry-run、installer tests、security checks、coverage registry/ratchet を通ることを確認する。
- **Pain points**: どの PR が installer-related か曖昧だと gate が抜ける。security scan の fail threshold が曖昧だとレビューできない。
- **Context**: `packages/setup/**`、installer docs/tests、release workflow、package metadata、CI configuration の変更が対象になる。

## Relationships

新規 OSS ユーザーと既存 Amadeus ユーザーは installer CLI の直接利用者である。メンテナーは配布品質を保証し、Contributor / CI Owner は実装変更が release 可能な状態を保つ。Story ordering は、新規導入体験を primary とし、upgrade、release、CI validation、docs/onboarding の順で価値を広げる。


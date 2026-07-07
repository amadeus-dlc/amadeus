# Deployment Strategy — @amadeus-dlc/setup

## Upstream Inputs

- `ci-config.md`: CI は merge 前検証、CD は release workflow
- `quality-gates.md`: PR gate vs release preflight gate の違い
- U8 `deployment-architecture.md`: environment 定義、release state boundaries
- U8 `cicd-pipeline.md`: dry-run / publish contract

## Strategy Type

**Manual Gated Release**（npm CLI パッケージ）

| 特性 | 本 intent の選択 |
|------|-----------------|
| Blue/green | N/A（registry 上の単一 package name） |
| Canary | N/A — dist-tag + SemVer で代替 |
| Rolling | N/A |
| Immutable artifact | npm tarball + provenance evidence |

## Promotion Flow

```
Developer merge → CI green (ci-config)
       ↓
Maintainer dry-run dispatch (dry_run:true)
       ↓
Review .amadeus-ci/setup/ artifacts + gate-summary
       ↓
Protected publish dispatch (dry_run:false + confirm_package)
       ↓
npm registry (@amadeus-dlc/setup@<version>)
       ↓
End users: npm install / setup upgrade
```

## Version Selection Policy

| 入力 | 動作 |
|------|------|
| `tag` 空 | latest **stable** SemVer tag（prerelease 除外） |
| `tag` 指定 | exact tag 必須（v-prefix duplicate 時は v 優先） |
| prerelease publish | `npm_dist_tag` ≠ `latest` 必須 |

## Release States

U8 `deployment-architecture.md` の state machine に従う:

| State | ユーザー影響 |
|-------|-------------|
| dry-run | なし（検証のみ） |
| publish-blocked | なし（承認/validation 失敗） |
| publish-failed | なし（registry 未更新または部分失敗） |
| published | 新バージョンが registry 上で取得可能 |
| published-verification-failed | publish 済みだが post-publish 検証失敗 — follow-up 必要 |

## Dist-Tag Strategy

| dist-tag | 用途 |
|----------|------|
| `latest` | stable release |
| `beta` / `rc` 等 | prerelease チャネル |

`setup upgrade` の default resolution は stable SemVer。明示 version/tag で prerelease を選択可能。

## Pre-Release Checklist

1. `main` 上で CI green（`quality-gates` 全 pass）
2. `release-setup` dry-run dispatch — preflight / build / docs / publish-validation pass
3. CHANGELOG / README 整合（docs-consistency gate）
4. 新 npm version が registry に未存在（publish-validation）
5. protected environment 承認者が publish を review

## Post-Release Verification

- `post-publish-verify.ts`: registry metadata、bin entry、tarball 整合
- ローカル smoke: `bun tests/setup/run-installer-smoke.ts`
- 必要なら tag 付き integration dry-run

## Constraints

- 1 dispatch = 最大 1 回 `npm publish`（retry loop なし）
- push/tag 自動 publish 禁止（U8 不変条件）
- SBOM/provenance 生成失敗時は publish 前に block

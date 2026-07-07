# Rollback Runbook — @amadeus-dlc/setup

## Upstream Inputs

- `cd-config.md`: publish job、post-publish verification
- U8 `deployment-architecture.md`: published / publish-failed state boundaries
- U8 `cicd-pipeline.md`: 単一 publish 試行、dry-run 共有 validation path

## Rollback Principles

npm パッケージの rollback は **traffic shift ではなく registry 上の version/dist-tag 管理** で行う。

| 手段 | 適用条件 | 効果 |
|------|---------|------|
| dist-tag 戻し | `latest` が誤った stable を指す | 新規 install の default が前バージョンへ |
| deprecate | 問題バージョンを残しつつ警告 | install 時に npm warn |
| patch republish | 修正版を新 SemVer で publish | 推奨 rollback パス |
| unpublish | 72h 以内・制約多数 | **最終手段** |

## Scenario 1: 誤って latest に publish した（機能バグ）

### 検知

- post-publish verification 失敗
- ユーザー報告 / smoke test 失敗
- registry 上で意図しない version が `latest`

### 手順

1. **即時**: GitHub Actions で追加 publish dispatch を止める（コミュニケーション）
2. **dist-tag 修正**（maintainer ローカル）:
   ```bash
   npm dist-tag add @amadeus-dlc/setup@<last-good-version> latest
   npm dist-tag remove @amadeus-dlc/setup@<bad-version> latest
   ```
3. **deprecate** 問題バージョン:
   ```bash
   npm deprecate @amadeus-dlc/setup@<bad-version> "Rollback: use <last-good-version>. See incident <id>."
   ```
4. 修正を main に merge → CI green → **patch version** で dry-run → publish
5. post-publish verify + smoke 再実行

### 検証

- `npm view @amadeus-dlc/setup dist-tags.latest` が last-good を指す
- `setup upgrade` が stable 解決で last-good に向く

## Scenario 2: publish 前に検知（publish-validation 失敗）

### 手順

1. registry 変更なし — 追加操作不要
2. `.amadeus-ci/setup/publish-validation.json` を確認
3. 原因修正（version bump、confirm_package、dist-tag 等）
4. dry-run 再 dispatch

## Scenario 3: publish 成功後 post-publish 失敗

### 手順

1. registry 上に package version **存在** — unpublish しない（原則）
2. `post-publish.json` の failed checks を確認
3. docs / metadata 不整合 → patch release または npm deprecate + dist-tag 調整
4. incident 記録（Operation `incident-response` ステージへ handoff）

## Scenario 4: 秘密情報を含む tarball を publish した

### 手順

1. **緊急**: npm deprecate + dist-tag 除去
2. secret rotation（NPM_TOKEN 等）
3. npm support / unpublish ポリシー確認（72h ルール）
4. 修正版を **新 patch version** で publish（同一 version 上書き不可）
5. secret-scan gate 強化確認（`quality-gates.md`）

## Dry-Run Rollback（検証キャンセル）

`dry_run:true` dispatch は registry に副作用なし。キャンセル = 追加操作不要。

## Communication Template

```text
Subject: @amadeus-dlc/setup release rollback — v<X.Y.Z>

Status: [investigating | mitigated | resolved]
Impact: new installs via `latest` may receive v<X.Y.Z>
Action taken: dist-tag moved to v<A.B.C>; v<X.Y.Z> deprecated
Next: patch v<X.Y.(Z+1)> with fix ETA <date>
```

## Prevention

- 常に dry-run dispatch を先に実行（`cd-config.md` デフォルト）
- `confirm_package` 二重確認
- protected environment required reviewers 維持
- release 前に `quality-gates` CI green を確認

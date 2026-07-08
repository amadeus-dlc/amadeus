# Business Logic Model — upgrade-flow

> ステージ: functional-design (3.1) / Unit: upgrade-flow / 作成: 2026-07-08
> 上流入力: `../../../inception/units-generation/unit-of-work.md`(U3)・`unit-of-work-story-map.md`(US-B1〜B5)、`../../../inception/requirements-analysis/requirements.md`(FR-005/007/008/009/016)、`../../../inception/application-design/services.md`(直列パイプライン)、`../../setup-foundation/functional-design/`(U1)、`../../install-flow/functional-design/`(U2 の共有基盤)

## ワークフロー 1: upgrade オーケストレーション

```
runUpgrade(parsed):
  mode = parsed.isNonInteractive(stdin.isTTY) ? "non-interactive" : "interactive"   # U2 と同一のモード判定(BR-I02)
  missing = parsed.missingRequiredFor(mode)
  if mode == "non-interactive" && missing.nonEmpty: return usageError(...)          # FR-011(U2 と同一)
  if mode == "interactive" && missing.nonEmpty:
    wiz = runWizard(parsed, missing, tty)                                           # U2 のウィザードを再利用(確認文言のみ upgrade 用)
    if wiz.err: print("中断しました"); return 1
    inputs = wiz.ok
  else:
    inputs = InstallInputs.fromFlags(parsed)

  installation = Installation.detect(inputs.target, manifestIo)                     # U2(FR-005 の状態分類)
  source = UpgradeSource.fromInstallation(installation, parsed.force)
  if source.err: print(reporter.renderError(source.error)); return 1                # no-installation(install 案内)/ unsupported-layout / partial-refused — 無変更終了

  version = resolver.resolve(parsed.version)                                        # U1(FR-006)
  if version.err: print(reporter.renderError(version.error)); return 1

  if source.ok.kind == "manifested":                                                # バージョン境界(FR-005 の5ケース)
    assessment = UpgradeAssessment.of(installedVersionOf(source.ok), version.ok, parsed.version)
    outcome = assessment.outcome()
    if outcome.type != "proceed": print(reporter.renderError(toRefusal(outcome))); return outcome.type == "already-up-to-date" ? 0 : 1
    # already-up-to-date は成功扱い(変更不要)、downgrade / installed-newer は非ゼロ(要求は満たされない)— いずれも無変更
  # manual-or-unknown / partial-forced は導入版が不明のため境界判定をスキップし、保守的プランへ直行

  payload = fetcher.fetchArchive(version.ok, tmpDir)                                # U1(FR-012)
  if payload.err: print(reporter.renderError(payload.error)); return 1

  plan = Plan.forUpgrade(payload.ok, source.ok, inputs.harness, inputs.target, { force: parsed.force, startedAt: now() })
  if plan.err: print(reporter.renderError(plan.error)); return 1
  print(reporter.renderPlanReport(plan.ok))                                         # 適用前差分レポート(FR-007。source.strategyNote を含める)

  if mode == "interactive" && !parsed.force:
    if !confirm(tty): return 1                                                      # 差分確認後の適用承諾(US-B2)
  # 非対話: upgrade はレポート出力後そのまま適用(衝突概念がなく Disposition が全処遇を決定済み。
  #         破壊的でありうる操作は backup 済みのため FR-010 の中断要件は install 固有)

  applied = applier.apply(plan.ok, inputs.target)                                   # U2 の applier 再利用(退避→コピー)
  if applied.hasFailures(): print(reporter.renderApplyFailure(applied)); return 1   # マニフェスト未更新 → 次回 partial 検出

  files = applied.manifestFiles()
  if files.err: print(reporter.renderError(files.error)); return 1
  newManifest = (source.ok.kind == "manifested")
    ? existingManifest.upgradedTo({ payload: payload.ok, files: files.ok, meta })   # U1: イミュータブル更新
    : Manifest.build(payload.ok, files.ok, meta)                                    # manual-or-unknown: 初回マニフェスト化
  written = manifestIo.write(inputs.target, newManifest)                            # FR-016(バージョン更新)
  if written.err: print(reporter.renderError(written.error)); return 1

  verify = verifier.verify(inputs.target, newManifest)                              # FR-013(U2 の verifier 再利用)
  if !verify.allPassed(): print(reporter.renderVerifyFailure(verify)); return 1
  print(reporter.renderSuccess(applied, verify, NextSteps.of(inputs.harness, version.ok, inputs.target)))
  return 0

  # meta = { installerPackageVersion: SETUP_VERSION, harness: inputs.harness, installStartedAt: plan.ok.backupTimestamp }
  # installedVersionOf(source) = manifested の場合のマニフェスト distributionVersion
```

## ワークフロー 2: プラン作成(Plan.forUpgrade 内部 — Disposition 駆動)

```
Plan.forUpgrade(payload, source, harness, target, opts):
  root = payload.harnessRoot(harness)
  if root.err: return err(...)
  for file in walk(root):                                       # 配布物側の全ファイル
    newMd5 = md5Of(file)                                        # 新期待値(プラン時計算 — U2 と同じ規約)
    if !fsops.exists(target/file.relPath):
      entries.push(add, md5: newMd5)
    else:
      actualMd5 = md5Of(target/file.relPath)                    # 対象側の現状
      disposition = dispositionOf(source, file, actualMd5)      # 下記
      entries.push(mapToAction(disposition), md5: newMd5, forced: opts.force && ...)
  return ok(createPlan(entries, opts.startedAt))

dispositionOf(source, file, actualMd5):
  expected = source.expectedMd5For(file.relPath)
  if file.class == "owned": return overwrite                    # フレームワーク所有(amadeus-* 規約)
  if file.class == "user-preserved": return preserve
  # shared:
  if expected != null && expected == actualMd5: return overwrite   # 未変更(FR-008)
  return backup-then-copy                                          # 変更済み or 期待値なし(manual-or-unknown 含む)
```

- **Disposition → PlanAction の写像**: overwrite→update / backup-then-copy→backup / preserve→skip、非存在→add
- manifested の場合の `expectedMd5For` は U1 の `manifest.dispositionFor` と同一判定になる(UpgradeSource がマニフェストを封入して委譲)— 判定ロジックの二重実装はしない
- 退避ファイル名は `${path}.${plan.backupTimestamp}.bk`(FR-008、単一タイムスタンプ — U2 applier の既存契約)

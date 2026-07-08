# Business Logic Model — install-flow

> ステージ: functional-design (3.1) / Unit: install-flow / 作成: 2026-07-08
> 上流入力: `../../../inception/units-generation/unit-of-work.md`(U2)・`unit-of-work-story-map.md`(US-A1〜A7)、`../../../inception/requirements-analysis/requirements.md`(CLI Contract、FR-003/004/007/009/010/011/013/016)、`../../../inception/application-design/components.md`・`component-methods.md`・`services.md`(プロセストポロジー: 直列パイプライン)、`../../setup-foundation/functional-design/`(U1 の型・ワークフロー)

## ワークフロー 1: エントリポイントとディスパッチ(CLI Contract)

```
main(argv):
  parsed = ParsedCommand.parse(argv)
  if parsed.err: print(reporter.renderError(parsed.error)); return 2   # UsageError は ClassifiedError の一員
  switch parsed.subcommand:
    "help"    -> print(reporter.renderHelp()); return 0        # サブコマンドなし=ヘルプ(US-A3、暗黙実行なし)
    "install" -> return runInstall(parsed)
    "upgrade" -> return runUpgrade(parsed)                     # 本体は U3
```

- 終了コード: 0=成功 / 1=実行時失敗(fetch・apply・verify)/ 2=使用方法エラー(UsageError)

## ワークフロー 2: install オーケストレーション(直列パイプライン)

```
runInstall(parsed):
  mode = parsed.isNonInteractive(stdin.isTTY) ? "non-interactive" : "interactive"
  missing = parsed.missingRequiredFor(mode)
  if mode == "non-interactive" && missing.nonEmpty:
    return usageError(UsageError.missingRequired(missing))     # FR-011。--force は補完しない(FR-009)
  if mode == "interactive" && missing.nonEmpty:
    wiz = runWizard(parsed, missing, tty)                      # US-A2(ワークフロー3)
    if wiz.err: print("中断しました"); return 1                 # 最終確認の拒否 = 明示的中断(BR-I18)
    inputs = wiz.ok
  else:
    inputs = InstallInputs.fromFlags(parsed)                   # フラグ完備経路(BR-I03 検査済み)

  installation = Installation.detect(inputs.target, manifestIo)
  admission = installation.admitsInstall(parsed.force)         # FR-004 の判断は installation が所有
  if admission.type == "refuse-suggest-upgrade":
    print(reporter.renderAlreadyInstalled(admission)); return 1  # 中断+upgrade 案内。ファイル無変更

  version = resolver.resolve(parsed.version)                   # U1(FR-006)
  if version.err: print(reporter.renderError(version.error)); return 1
  payload = fetcher.fetchArchive(version.ok, tmpDir)           # U1(FR-012: 1リトライ+分類)
  if payload.err: print(reporter.renderError(payload.error)); return 1

  plan = Plan.forInstall(payload.ok, inputs.harness, inputs.target, { force: parsed.force, startedAt: now() })
  # 注: Plan.forInstall は component-methods.md の planInstall(payload, target, opts) を本設計で置換する正式契約
  #     (harness 引数の明示化+Result 化。プラン時に配布物 md5 / required を PlanEntry へ計算格納)
  if plan.err: print(reporter.renderError(plan.error)); return 1
  print(reporter.renderPlanReport(plan.ok))                    # 適用前レポート(FR-007。非対話でも必ず出力)

  if plan.ok.hasConflicts():                                   # FR-010
    if parsed.force: pass                                      # --force は衝突確認のみバイパス(FR-009)
    elif mode == "interactive": if !confirm(tty): return 1     # 確認して続行
    else: return 1                                             # 非対話は中断(レポートは出力済み)

  applied = applier.apply(plan.ok, inputs.target)              # 退避→コピー(FR-008 は Disposition 経由)
  if applied.hasFailures():                                    # 部分失敗を成功へ流さない(サイレント失敗禁止)
    print(reporter.renderApplyFailure(applied)); return 1      #   マニフェストは書かず、次回 detect が partial を検出する

  files = applied.manifestFiles()                              # PlanEntry の md5/required から正準射影(FR-016)
  if files.err: print(reporter.renderError(files.error)); return 1
  meta = { installerPackageVersion: SETUP_VERSION, harness: inputs.harness, installStartedAt: plan.ok.backupTimestamp }  # InstallMeta は U1 の shape-only 補助型 — リテラル構築(コンパニオンなし)
  manifest = Manifest.build(payload.ok, files.ok, meta)
  written = manifestIo.write(inputs.target, manifest)          # FR-016
  if written.err: print(reporter.renderError(written.error)); return 1  # I/O 境界の明示分岐

  verify = verifier.verify(inputs.target, manifest)            # FR-013
  if !verify.allPassed(): print(reporter.renderVerifyFailure(verify)); return 1
  print(reporter.renderSuccess(applied, verify, NextSteps.of(inputs.harness, version.ok, inputs.target)))  # US-A6
  return 0
```

- `renderApplyFailure(applied)` は Reporter API に追加(domain-entities の Reporter API 節参照。renderError と同格の失敗系描画)
- `SETUP_VERSION` は setup パッケージ自身の semver 定数(FR-017。package.json と同期)

## ワークフロー 3: 対話ウィザード(US-A2)

```
runWizard(parsed, missing, tty): Result<InstallInputs, "wizard-aborted">
  harness = missing.has("harness") ? tty.select("ハーネスを選択", HarnessName.all) : parsed.harness   # FR-003(4択)。指定済みは再質問しない(BR-I17)
  target  = missing.has("target")  ? tty.input("導入先", default: cwd) : parsed.target                # 対話のみ cwd 既定
  if !tty.confirm(summary(harness, target)):                    # 展開前の最終確認(BR-I18)
    return err("wizard-aborted")                                # 拒否 = 中断(呼び出し側が終了コード1で終了。ファイル無変更)
  return ok(InstallInputs(harness, target))                     # 内部ファクトリ
```

- ウィザードは cli モジュールが所有し、TtyIO ポート経由(テストシームは DI — 本番コードにテスト分岐なし)

## ワークフロー 4: ファイル分類とプラン作成(Plan.forInstall 内部)

```
Plan.forInstall(payload, harness, target, opts):
  root = payload.harnessRoot(harness)                          # U1(BR-F10 検証済み)
  if root.err: return err(PlanRefusal.harnessNotInPayload(harness))
  for file in walk(root):
    exists = fsops.exists(target/file.relPath)
    entry = classify(file, exists, opts.force)                 # add(新規)/ conflict(既存×非force)/ update|backup(既存×force、class 依存)
    entries.push(entry)
  return ok(createPlan(entries, opts.startedAt))
```

- install の分類は「新規 or 既存」が主軸。md5 ベースの Disposition 判定(FR-008)は既存ファイルの処遇でのみ使用(マニフェスト不在の初回 install では期待 md5 がないため、既存共有ファイルは常に backup-then-copy — requirements FR-008 の「期待 md5 なし=ユーザー変更扱い」)

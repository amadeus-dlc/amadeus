# Code Summary — install-flow(U2 / Bolt 2)

> ステージ: code-generation (3.5) / Unit: install-flow / 作成: 2026-07-08
> ビルダー: amadeus-developer-agent(codegen-u2)/ 全14ステップ完了

## 作成/変更ファイル

- **domain 増分**: command.ts / installation.ts / engine-layout.ts(新規)/ plan.ts / apply-result.ts / verify-result.ts、harness.ts へ HarnessName.parse 追加
- **ports 増分**: tty.ts、apply-write.ts(新規)、verify-read.ts(新規 — U1 fsops.ts は無変更)
- **modules 増分**: wizard.ts / applier.ts / verifier.ts / reporter.ts(8関数 + ClassifiedError)
- **cli.ts 本実装**: main(argv, ports?) + CliPorts/createDefaultPorts(fake 注入用)
- **テスト**: unit 9 + integration 1 + e2e 1(オフライン既定、実ネットワークは AMADEUS_SETUP_E2E_NETWORK=1 ガードで skip)+ tests/lib ヘルパー3(codeload 形状フィクスチャ含む)
- **既存修正**: smoke テストの文言アサーション(cli 本実装化による直接原因の赤 → 修正)

## ビルダー申告の逸脱(9件 — うち4件は architect レビュー裁定待ち)

1. command.ts ↔ harness.ts の双方向値依存(nfr-design 規律からの逸脱。実行時循環は安全と実証主張)★要裁定
2. internal/ ファクトリファイル新設せず(ファイル内 private 関数。nfr-design レイアウト図に internal 増分なし)
3. PlanEntry に `source`(配布物側絶対パス)追加 — 契約6フィールド外の純追加 ★要裁定
4. reporter 8番目 renderWizardAborted 追加(SEC-I04 の文言一元化のため)
5. ClassifiedError に UpgradeRefusal 未包含(U3 で型が生まれ次第拡張、コメント明記)
6. FileClass 分類ヒューリスティック(owned=amadeus-*、user-preserved=memory/、shared=他)は独自解釈 ★要裁定
7. Installation.detect のスキャンアルゴリズムは独自設計判断(上流ルールなしと確認済み)★要裁定
8. ports/apply-write.ts / verify-read.ts 新設(U1 凍結遵守のため)
9. E2E は spawnSync デッドロック(同一プロセス fake サーバ)を踏み、非同期 spawn へ

## テスト結果(ビルダー実行結果)

typecheck / lint / `tests/run-tests.sh --ci`(255ファイル・3804 assertion・失敗0)/ dist:check / promote:self:check 全 green。setup 関連 24ファイル 166 pass / 1 skip(ネットワークゲート、意図どおり)/ 0 fail。

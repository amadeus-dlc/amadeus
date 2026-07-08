# Code Generation Plan — upgrade-flow(U3 / Bolt 3)

> ステージ: code-generation (3.5) / Unit: upgrade-flow / 作成: 2026-07-08
> 出典: `../functional-design/`(domain-entities: UpgradeAssessment/UpgradeOutcome/UpgradeRefusal/UpgradeSource/LegacyLayout・business-logic-model: runUpgrade 制御フロー・business-rules)、`../nfr-design/logical-components.md`(新規ファイルゼロ・修正3箇所)・`reliability-design.md`(REL-U02 の6経路)・`security-design.md`(SEC-U01)、`../infrastructure-design/cicd-pipeline.md`(派生フィクスチャ4種)、U1/U2 実コード(凍結 API)
> テスト戦略: Standard / 承認モード: autonomous(記録用、ユーザーゲートなし)

## 実装スタイル(拘束 — U1/U2 と同一)

functional-domain-modeling-ts。U2 で確定した増分規律を継承: BR-I19(FileClass)、Plan.harnessRoot()、Reporter 10関数、HarnessName.parse の軽量エラー。

## ステップ(トレーサビリティ付き)

- [ ] **Step 1: domain/upgrade.ts**(US-B1/B4, FR-005)— UpgradeAssessment(assess: 6経路 = already-up-to-date / downgrade-unsupported / installed-newer-than-latest / no-installation / unsupported-layout / partial-refused + proceed)+ UpgradeOutcome(NonProceed)+ UpgradeRefusal.fromOutcome + UpgradeSource(fromInstallation、dispositionFor は manifest.dispositionFor へ委譲、nextManifest)+ LegacyLayout.isUnsupported(条件 a: 非 SemVer VERSION / 条件 b: 両アンカー不在)+ ユニットテスト(6経路全分岐+条件 a/b)
- [ ] **Step 2: domain/plan.ts へ Plan.forUpgrade 追加**(US-B2/B3, FR-007/008)— U2 予告済み拡張点。UpgradeSource 由来の dispositionFor で PlanEntry を構築(user-preserved は preserve、変更検出は md5)+ ユニットテスト(preserve/backup/overwrite/skip の全 action、BR-I19 準拠)
- [ ] **Step 3: domain/command.ts の ClassifiedError に UpgradeRefusal 合流**(U2 是正で宣言済みの拡張)+ reporter のエラー文面追随(SEC-I04 — 文言は reporter のみ)
- [ ] **Step 4: modules/applier.ts へ SEC-U01 チェック追加**(修正、新規ファイルなし)— backup-then-copy 前に `.bk` 事前存在チェック(存在時 ApplyFailure(operation:"backup"))。install 経路への副作用は意図した安全側(nfr-design 明記)— install 側テストへの影響を確認し、必要なら期待値を安全側に追随
- [ ] **Step 5: modules/wizard.ts の文言分岐**(修正)— summary ヘルパーを parsed.subcommand で install/upgrade 別文言に。runWizard シグネチャ不変
- [ ] **Step 6: cli.ts へ runUpgrade 追加**(FR-005)— business-logic-model の制御フロー: source 解決(manifest / manual-or-unknown / partial)→ assess → 非 proceed は UpgradeRefusal で早期終了(exit 1、already-up-to-date は exit 0)→ Plan.forUpgrade → 適用前レポート → apply → manifest 更新 → verify。到達順序契約(BR-I16 相当)は install と同一
- [ ] **Step 7: ユニット/統合テスト**(Standard)— cli-wiring の upgrade 分岐、runUpgrade 統合(fake ポートで6経路+成功経路+到達順序)
- [ ] **Step 8: upgrade E2E**(NFR-002, US-B3)— U2 の E2E ヘルパー+フィクスチャ流用。派生フィクスチャ4種(infrastructure-design 契約): (1) manifest 削除 = manual-or-unknown、(2) 一部ファイル削除 = partial、(3) VERSION を `legacy-build-2024` 化 = unsupported-layout(a)、(4) tools/+amadeus-common/ 削除・amadeus-* 残置 = unsupported-layout(b)。加えて正常 upgrade(カスタマイズ保持 = user-preserved 無傷+owned 更新+バックアップ生成)
- [ ] **Step 9: 検証一式**— `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` / `bun run dist:check` / `bun run promote:self:check` 全グリーン

## ストーリー/要件 → ステップ対応

| 要件/ストーリー | ステップ |
|-----------------|----------|
| US-B1(検出)/ FR-005 | 1, 6 |
| US-B2(差分レポート)/ FR-007 | 2, 6 |
| US-B3(カスタマイズ保持)/ FR-008, NFR-002 | 2, 4, 8 |
| US-B4(バージョン境界) | 1 |
| FR-009(バックアップ)+ SEC-U01 | 4 |
| REL-U02(6経路) | 1, 7, 8 |

## スコープ外

- pack 契約テスト・publish 手順書(U4)、README 刷新(U5)
- 新規モジュールファイルの追加(nfr-design の「新規ゼロ・修正3箇所」設計を厳守)

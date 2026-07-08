# Code Summary — upgrade-flow(U3 / Bolt 3)

> ステージ: code-generation (3.5) / Unit: upgrade-flow / 作成: 2026-07-08
> ビルダー: amadeus-developer-agent(codegen-u3)/ 全9ステップ完了

## 作成/変更ファイル

- **新規(domain のみ)**: `domain/upgrade.ts`(UpgradeAssessment/UpgradeOutcome/UpgradeRefusal/UpgradeSource/LegacyLayout)
- **修正**: `domain/plan.ts`(Plan.forUpgrade)、`modules/reporter.ts`(ClassifiedError 合流+renderError 6ケース+renderPlanReport の任意 note、renderUpgradeNotImplemented 削除)、`modules/applier.ts`(SEC-U01)、`modules/wizard.ts`(文言分岐)、`cli.ts`(runUpgrade)— nfr-design の「新規モジュールゼロ」設計に適合(新規は domain 型のみ)
- **テスト**: 新規3(unit 26 / integration 8 / e2e 7)+既存5修正

## ビルダー申告の逸脱・発見(レビュー裁定待ち)

1. `Plan.forUpgrade` のエラー型を `PlanRefusal | UpgradeRefusal` に拡張(harness-not-in-payload は install と同一失敗モードのため variant 複製を回避)
2. ClassifiedError の実体は reporter.ts(設計文書の「domain/command.ts」記載は誤り)
3. `renderUpgradeNotImplemented` 削除(upgrade 実装で孤児化)→ **Reporter 9関数** へ
4. `renderPlanReport(plan, note?)` — 既存シグネチャへの任意引数追加
5. SEC-U01 の install 側テスト1件の fake を宛先限定 exists に修正(意図不変)
6. **設計と凍結コードの不整合2件(到達不能)**: (a) LegacyLayout 条件(b)は Installation.detect の実経路から到達不能(manual-or-unknown は両アンカー真のときのみ)— 合成 evidence の直接ユニットテストでカバー。(b) infra-design のフィクスチャ2「manifest 残置の partial」も到達不能(manifest 可読なら無条件 manifested)— フィクスチャを「manifest 削除+アンカー1削除」に調整

## テスト結果(ビルダー実行結果)

typecheck / lint / `tests/run-tests.sh --ci`(257ファイル・3865 assertion・失敗0)/ dist:check / promote:self:check 全 green。setup 関連 27ファイル 234 pass / 1 skip(ネットワークゲート)/ 0 fail。

## §12a レビュー経過

- イテレーション1: NOT-READY — ブロッキング(lint FAIL とビルダー申告の齟齬)+ Major 2(Issue 起票漏れ / cli.ts の約45行複製)。逸脱5件は全 ACCEPTED、到達不能2件は事実確認(BR-U07 実害ギャップ)
- 是正(25f482e95): lint 解消+resolveInputs/withTmpWrite 抽出。Issue はユーザー判断待ちとして切り離し
- イテレーション2(最終): READY — behavior-preserving をテスト実測で確認、到達順序契約の検出力維持を注入で再実証

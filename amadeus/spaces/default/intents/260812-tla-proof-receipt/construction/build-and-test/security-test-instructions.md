# Security Test Instructions — 260812-tla-proof-receipt

上流入力(consumes 全数): `construction/fix-2913-proof-receipt/code-generation/code-generation-plan.md`(Step 4 の fail-closed 境界と Step 5 の production pin 非緩和・構築子非公開の機械検査が、本 unit における信頼境界の検証を規定する)、`construction/fix-2913-proof-receipt/code-generation/code-summary.md`(FR-4/FR-5 の充足根拠と落ちる実証3系の結果)。

## 適用外判定(専用セキュリティ試験)

**判定: SAST/DAST・認証認可試験・インジェクション試験は適用外(新規に作らない)。**

requirements.md の非機能要件は NFR-1(決定性)と NFR-2(回帰なし)の2件のみで、セキュリティ属性の数値目標も、認証・認可・外部入力処理に関する NFR も宣言されていない。stage 契約 Step 4-8 の Comprehensive 定義も `security-test-instructions.md` を **IF NFR security requirements exist** の条件付きとしている。変更面は plugin `plugins/formal-model-check/tools/` 配下のローカル proof 経路に閉じており(code-summary.md「変更面」)、ネットワーク境界・認証面・ユーザー入力パースを新設していないため、DAST・認証試験は対象を持たない。目標も対象もない試験を体裁のために作らない(project.md `cid:build-and-test:c2-no-test-theatre-for-absent-nfr`)。

## 既存の担保面(本 unit のセキュリティ隣接契約を実際にカバーしているもの)

本 unit は「receipt という信頼境界」を触るため、セキュリティ隣接の契約は存在する。それらは新規試験ではなく、既に実在する次の面が担保する。

| 契約 | 担保する面 | 種別 |
|---|---|---|
| 改竄検知(module/cfg/auxiliary のバイト改変を proof 準備前に拒否) | FR-5 の fail-closed テスト群(`tests/integration/t535-tla-referee-model-receipt.integration.test.ts`)。落ちる実証 I1 は identity 比較を無効化して 3 fail を実測 | 既存(本 unit で追加済み) |
| path substitution の拒否(model name と module basename の不一致) | 同上。落ちる実証 I2 は name 検査を無効化して 1 fail を実測 | 既存(本 unit で追加済み) |
| auxiliary モジュールの束縛(補助モジュールの差し替え検知) | 同上。落ちる実証 I3 は aux guard を無効化して 1 fail を実測 | 既存(本 unit で追加済み) |
| **能力の非漏出**(referee 専用 receipt 構築子を production 経路へ公開しない — FR-4) | t535 が `plugins/formal-model-check/tools/` 配下の全 `.ts` を走査し `createRefereeTlaModelReceipt` を含むファイルが1件であることを機械検査(t535:333) | 既存(本 unit で追加済み) |
| production model-map pin の非緩和(未登録名の `VerifiedTlaModelReceipt` を拒否し続ける) | `validateVerifiedTlaModelReceipt` 無変更+既存ピンテスト 90 pass 維持(cg2913-builder-report.md FR-4 行) | 既存(無変更で維持) |
| 制御バイト混入の検出 | CI の `control-byte-gate` job(`.github/workflows/ci.yml:214`、実行 `:230` の `bun tests/control-byte-gate.ts --check`、集約 `CI Success` の needs に `:827` で所属し `:864` で `require_result` 判定) | 既存(リポジトリ横断) |

これらはすべて実測済みであり、本ステージで新規の検査を追加していない。

## この判定を覆す条件

1. referee 経路が信頼境界の外(ユーザー提供の TLA+ ソース、リモート取得のモジュール等)からの入力を受けるよう拡張される — その時点で入力検証・パス走査の攻撃面が実在し、専用試験の対象が生まれる。
2. requirements/NFR がセキュリティ属性(秘匿・完全性の数値目標や脅威モデル)を明示宣言する。
3. `loadVerifiedTlaSourcesInternal` の root 選択 seam が開かれる(現在は方針で封印 — requirements.md「前提」節、本 unit のスコープ外)。

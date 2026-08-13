# Integration Test Instructions — 260812-tla-proof-receipt

上流入力(consumes 全数): `construction/fix-2913-proof-receipt/code-generation/code-generation-plan.md`(Step 3 の validator 全消費者受理、Step 4 の fail-closed 3系、Step 6 の実TLC統合検証と専用実行面の分離)、`construction/fix-2913-proof-receipt/code-generation/code-summary.md`(テスト面の2層構成と FR-1/3/4/5/6/7 の充足根拠)。

## 二層構成(Q1=A の実行面)

requirements.md FR-7 は「実TLC を要するテストは formal-model-check 専用実行面に置き、日常 CI には TLC 非依存の受理・fail-closed テストのみ追加する」を逐語で要求する。実装はこの分離どおり:

| 層 | ファイル | 対象 FR | 日常 CI |
|---|---|---|---|
| 日常 CI(TLC 非依存) | `tests/integration/t535-tla-referee-model-receipt.integration.test.ts` | FR-1 受理面 / FR-4 非公開の機械検査 / FR-5 fail-closed / FR-6 両消費者 | 対象 |
| 専用実行面(実TLC) | `tests/formal-verif/tla-referee-real-toolchain.test.ts` | FR-1 実行面 / FR-3 陽性対照 / FR-6 完走 / FR-7 対角 | 対象外 |

分離の機械確認: `grep -rn "formal-verif" tests/run-tests.ts tests/run-tests.sh` が exit 1(0 hit、本ステージ実測)。日常 CI ランナーは `tests/formal-verif/` を一切参照しないため、TLC(JDK・jar 取得ネットワーク)への依存が日常 CI に持ち込まれていない(requirements.md「前提」節、スコープ外「formal-verif の日常 CI 組込み(Q1=A で不採用)」)。

## 実行コマンド

日常 CI 層:

```
bun test ./tests/integration/t535-tla-referee-model-receipt.integration.test.ts
```

専用実行面(実TLC — JDK 固定が必須):

```
mise x java@temurin-26.0.1+8 -- bun test tests/formal-verif/tla-referee-real-toolchain.test.ts
```

素の `bun test` で後者を走らせると、グローバル mise の `JAVA_HOME` 上書きにより `ENVIRONMENT_UNAVAILABLE` で cause なく落ちる(project.md `java-home-mise-shim-override`)。

## 検査対象の境界

- **FR-4(非漏出)の機械検査**: t535 が `plugins/formal-model-check/tools/` 配下の全 `.ts` を走査し、`createRefereeTlaModelReceipt` を含むファイルが1件(= `tla-referee-toolchain.ts`)であることを assert する(t535:333 の filter、本ステージで実読)。production model-check 呼び出し面へ構築子が漏れた瞬間に赤になる。
- **FR-5(fail-closed)**: module・cfg・auxiliary のバイト改変、path substitution、model name 不一致の各系。落ちる実証は code-generation 段で I1/I2/I3 の3回実施し、いずれも赤を実測してから復元・残渣ゼロを機械確認済み(cg2913-builder-report.md「FR-5 落ちる実証」表)。
- **FR-6(両消費者)**: 準備段 `fs-tlc-toolchain.ts` と出力解析段 `tlc-toolchain.ts` の双方で受理されること。片側修正による「失敗の段移動」が起きないことを固定する。

## テストデータ

fixture は `tests/formal-verif/fixtures/` 配下に置く。新規 fixture は parseTrace の既存制約(2変数以上・アルファベット順の VARIABLES 宣言)に適合させてある — この制約は #2913 とは独立の既存欠陥で、本 unit のスコープ外(build-test-results.md「申し送り」参照)。

## カバレッジ期待

Patch Coverage Gate を正の判定とする。実TLC 経路(`runOnce` の acquire/preparePlanned/runPlanned 区間)は CI が pinned TLC jar と sealed JDK を取得・実行できないため構造的に計測不能で、`tests/.coverage-patch-allowlist.json` に semantic selector(`function: runOnce` / fingerprint / `targetLines: "2-36"`)の waiver として登録済み(本ステージで当該エントリを実読)。waiver は行ピンでなく関数 fingerprint に束ねられており、reason 欄が「real-TLC surface でのみ到達可能」「pre-toolchain 行は t447/t535 が in-process 駆動」と到達可能性を明記し、expiry 欄が hermetic TLC fixture jar の CI 着地を解除条件として保持している。

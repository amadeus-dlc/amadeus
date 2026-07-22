# Unit Test Instructions

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

## フレームワークと構成

- ランナー: `bun test`(追加設定不要)。純関数層のテストは `tests/unit/`、実 FS を触るものは `tests/integration/`(fs-tests-integration-first 準拠)
- 対象: 各ユニットの code-summary.md が列挙するテストファイル(U1〜U8 で計 46 ファイルの t-formal-verif-* 群)

## 実行コマンド

| 対象 | コマンド |
| --- | --- |
| formal-verif unit 全数 | `bun test tests/unit/t-formal-verif-*.test.ts` |
| U6 Arm S | `bun test tests/unit/t-formal-verif-arm-s-universe.test.ts tests/unit/t-formal-verif-arm-s-oracle.test.ts tests/unit/t-formal-verif-arm-s-run.test.ts` |
| U7 matrix | `bun test tests/unit/t-formal-verif-full-matrix.test.ts tests/unit/t-formal-verif-full-matrix-cost.test.ts` |
| U8 eligibility | `bun test tests/unit/t-formal-verif-eligibility.test.ts tests/unit/t-formal-verif-eligibility-report.test.ts tests/unit/t-formal-verif-final-cli-root.test.ts` |
| 回帰 spot(U1 契約) | `bun test tests/unit/t-formal-verif-contract.test.ts` |

実行規律: 複数 path 列挙時は事前に全 path の実在を確認し、実行後に `Ran N tests across M files` を期待ファイル数と照合する(test-path-set-completeness)。

## カバレッジ目標(Comprehensive)

- コンポーネントあたり 10–15 テスト水準。ハッピーパス+最低2つのエラー/エッジケース
- 決定論性: fixed seed(fast-check seed 20260720)の replay、golden hash 照合(descriptorIdentity)
- negative 系: 時刻概念混同(@ts-expect-error による型境界)、TALLY 欠損/重複/位置違反、hold precedence、over-budget、poisoned freeze 入力

## テストデータ管理

- fixture は各テストファイル内の決定論的 in-memory 構築のみ。外部データ・ネットワーク・実時刻に依存しない(Date.now 不使用)

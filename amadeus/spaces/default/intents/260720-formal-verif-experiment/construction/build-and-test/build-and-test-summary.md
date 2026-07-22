# Build and Test Summary

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

## 全体ビルド状況

- 前提: Bun + `bun install`(lockfile 固定)。ビルド成果物なし(Bun 直接実行)
- ビルド検証(型検査・リント・drift guard)は全て green。tests tsconfig の 9 error は B1 既存 baseline(build-test-results.md で帰属確定)

## テストタイプ目録(Comprehensive 戦略)

| タイプ | 生成した instruction | 実行 |
| --- | --- | --- |
| Build | build-instructions.md | ✅ 実行済み(5 コマンド) |
| Unit | unit-test-instructions.md | ✅ 435 pass / 0 fail |
| Integration | integration-test-instructions.md | ✅ 実行済み(B1 在庫 22 fail を帰属記録) |
| Performance | performance-test-instructions.md | 機構検証まで(実 suite 実行は実験実行フェーズ) |
| Security | security-test-instructions.md | ✅ grep/blind/依存検査 実行済み |

## ユニット別カバレッジ期待

- U1〜U5(B1): 契約・registry・evidence・toolchain・skeleton — unit green / integration に B1 在庫 red(22+1)と型 9 error が残存
- U6 Arm S: 49 テスト green(全域性 5,760+160、PBT seed 固定、blind 走査、golden hash)
- U7 matrix: 27 テスト green(schedule/receipt-chain、cost 導出)
- U8 eligibility: 91 テスト green(hard gate、Pareto、wiring 一意性・error propagation)

## レディネス評価

- **build-ready**: ✅(型・リント・drift 全 green)
- **test-ready**: ✅(全 instruction 実行可能・決定論的)
- **deployment-ready**: N/A(本 intent はデプロイ基盤を持たない — 実験 CLI はローカル実行)
- **実験実行レディネス**: ⚠ 条件付き — B2〜B4 は完成・green だが、B1 skeleton の在庫 red(integration 21+1、fixture-store export 面 1、型 9)が解消されるまで、TLA アーム側の end-to-end 実験実行(full matrix の実走)は開始できない

## 既知の残課題(明示フラグ)

1. B1 walking-skeleton の在庫 red 23 件+型 error 9 件(全て pre-B2 baseline で再現、B2〜B4 由来 0 件)— B1 READY 化の是正作業が別途必要
2. full-matrix の実 suite 実行(1 warmup + 5 measured)と Alloy trigger 判定の実走は、B1 在庫解消+TLC toolchain fetch 後の実験実行フェーズで実施

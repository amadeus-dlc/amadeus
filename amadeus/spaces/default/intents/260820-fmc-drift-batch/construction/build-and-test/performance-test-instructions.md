# Performance Test Instructions — 260820-fmc-drift-batch

## 判定: N/A(適用可能な性能 NFR が存在しない)

`requirements.md` **NFR-3(性能)** が明示宣言するとおり、本 intent に適用可能な数値性能 NFR は宣言されていない。したがって性能専用の検査は**生成しない**。合否を決める数値目標が要件に宣言されていないテスト種別に体裁のための実体を作ることは検証劇場であり禁止(cid:build-and-test:c2-no-test-theatre-for-absent-nfr / c1-build3029)。各 unit の `code-generation-plan.md` / `code-summary.md` にも性能目標への trace は存在しない(全4面確認)。

## 根拠と将来この判定を覆す条件

- **根拠**: NFR-3 逐語「適用可能な数値 NFR は宣言されていない — 性能・security の専用検査は生成しない(no-test-theatre-for-absent-nfr)」。Comprehensive strategy はこの判定を覆さない — strategy 水準が高くても、検査は承認済み NFR と実在境界へ trace できる範囲だけ生成する
- **覆す条件**(NFR-3 記載のとおり): 適用性判定の実行時間が体感劣化としてユーザーから報告された場合、**別 intent** で NFR 化し、そのとき初めて数値目標つきの性能検査を設計する
- **代替の担保**: 追加された述語群(applicability-arms)は純粋関数として分離されており(`tla-applicability-arms.ts`)、実行時間はテストスイート実測(targeted 9 ファイル 677ms、build-test-results.md 参照)の範囲で問題兆候なし — これは観測であって性能受け入れ基準ではない

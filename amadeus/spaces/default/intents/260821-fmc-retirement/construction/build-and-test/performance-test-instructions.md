# Performance Test Instructions — 260821-fmc-retirement

上流入力: `inception/requirements-analysis/requirements.md` NFR-3、`construction/fmc-retirement/nfr-design/security-design.md`、`../fmc-retirement/code-generation/code-generation-plan.md`(裁定表 — 性能検査の生成判断に関わる逸脱なし)、`../fmc-retirement/code-generation/code-summary.md`(追補 1 の gate 実行時間観察値の出典)。

## 判定: N/A(適用可能な性能 NFR が存在しない)

- **判定**: 本 intent に合否を決める数値性能目標は宣言されていない(requirements.md NFR-3 逐語「適用可能な数値 NFR は宣言されていない — 専用検査は生成しない」)。Test Strategy が Comprehensive でも、承認済み NFR と実在境界へ trace できない検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 目標なきベンチマークは検証劇場)
- **根拠**: 削除 intent であり、新規の実行経路・外部境界・負荷特性を導入しない。性能への影響は負方向でない(CI から FMC job 約 106 行と JDK セットアップが消え、パイプラインは軽くなる方向)
- **将来この判定を覆す条件**: (a) FMC 再設計 intent が数値性能 NFR(例: モデル検査の時間上限)を宣言した場合 (b) coverage gate 拡張(ADR-7)の per-file 読取が CI の Project coverage gate ステップ実行時間を有意に延ばす実測が出た場合(現実測: gate ステップは秒級 — round 4 で 3–12 秒帯、閾値宣言なしのため観察のみ)

## 参考実測(目標なし・観察値)

- Coverage Report (head) ジョブ全体: 12m34s(round 3)— gate 拡張前後で顕著な変化なし(per-file 読取は lcov 1 パース + BigInt 集計)

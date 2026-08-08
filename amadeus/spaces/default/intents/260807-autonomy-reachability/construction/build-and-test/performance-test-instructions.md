# Performance Test Instructions — autonomy-reachability(#2378)

上流入力(consumes 全数): 6 unit の `code-generation-plan.md`(検証面の宣言)と `code-summary.md`(実装した面と実測) — u1-autonomy-core / u2-birth-declaration / u3-question-route-observability / u4-conduit-parity / u5-measurement-report / u6-plugin-docs-drift。

## 判定: **専用の性能試験は生成しない(N/A)— 反証可能な根拠付き**

Test Strategy は Comprehensive だが、**戦略名だけを根拠に負荷試験を機械追加しない**(project.md `cid:build-and-test:bt-proportional-selection` / `cid:build-and-test:c1`)。検査は承認済み NFR と実在境界へ trace できる範囲だけ生成する。

## 根拠1: 対応する性能 NFR が存在しない

`inception/requirements-analysis/requirements.md:54-58` の NFR は5件で、その全文は安全性(NFR-1)・互換(NFR-2)・テスト規律(NFR-3)・監査(NFR-4)・配布(NFR-5)である。**スループット・レイテンシ・リソース使用量に関する受け入れ基準は1つも宣言されていない**。対応する NFR が不在なまま専用試験を新設すると、戦略名に形を合わせただけの検証劇場になる(project.md `cid:build-and-test:c4`、org.md Forbidden)。

## 根拠2: 本 intent の変更面が性能境界を持たない

本 intent が触ったのは (a) autonomy 判定と state 投影(1 intent あたり数回の同期呼び出し)、(b) audit イベントの属性追加、(c) 導線ドキュメント、(d) record 内レポートである。ループ・バッチ処理・ネットワーク I/O・大規模データ走査のいずれも導入していない。

## 既存の担保面

性能退行が起きた場合に検出しうる既存面は次のとおりで、いずれも本 intent の変更を通過している:

- `bash tests/run-tests.sh --ci` の全体 wall-clock — 極端な退行は実行時間として現れる
- `tests/complexity-gate.ts --check` — 複雑度の退行を blocking で拒否
- CI の各ジョブタイムアウト — 実行が予算を食い切れば赤になる

これらは性能 SLO ではなく、**個別実行の停止 guard** である(project.md `cid:observability-setup:c3` — timeout を service SLO 達成へ昇格させない)。本 intent に service SLO は存在しないため、その意味での性能判定は **N/A** であり、PASS でも未検証でもない。

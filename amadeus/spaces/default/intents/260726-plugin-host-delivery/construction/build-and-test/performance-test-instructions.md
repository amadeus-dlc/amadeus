# Performance Test Instructions — 260726-plugin-host-delivery

> 上流入力(consumes 全数): code-generation-plan、code-summary — 各ユニットの code-generation-plan.md が引く性能 NFR(U2 の no-op 高速路、U5 の 0-plugin 定数コスト、U7 の CI 増分)へ trace できる検査のみを選定した(bt-proportional-selection — 戦略名を根拠に負荷試験を機械追加しない)。

## 検査対象(承認済み NFR への trace)

1. **NFR-2 / BR-U2-3(U2 nfr-requirements/performance-requirements.md「no-op 高速路」)**: 自動 compose の no-op 経路が apply へ不到達であること
   - 構造検証(数値非依存): t299 が applyPluginPlan 到達 0 を counter assert で固定(実装済み・green)
   - 数値予算(本ステージで実測固定 — 同 NFR「数値予算の扱い」の委任): 下記実測により **500ms 以下**を受け入れ予算として固定
2. **U5 0-plugin 定数コスト(doctor-observability nfr-design/performance-design.md)**: 構造的(非数値)受け入れ — readDoctorPluginObservation は existsSync ガード付き読取のみ。t315 で検証済み
3. **U7 CI 増分(conformance-suite の PERF-U7-1/2)**: 適合テストは smoke/unit/integration の既存 --ci 範囲で層別実行(e2e は範囲宣言どおり非対象)。フルスイート実測は build-test-results.md 参照

## 実測(NFR-2 数値予算の固定)

- 手順: dist/claude シェルを scratch fixture へ複製 → `compose`(record 作成)→ `compose --if-stale` を `/usr/bin/time -p` で3回計測
- 実測値: **real 0.04s / 0.04s / 0.04s**(macOS、Bun 1.3.13)
- 固定予算: **500ms**(出典: 実測 40ms。上流 business-logic-model の目安「数百 ms」帯の下限に対し実測が 1/10 のため、環境ばらつきを見込み 500ms を受け入れ上限として固定。40ms は実測、500ms は実測からの導出値)

## 回帰検出

- no-op 経路の構造検証(t299 の到達 counter)が回帰の一次検出。数値予算の再実測は同経路を触る変更時に本手順を再実行する

# スケーラビリティ要件 — U3 host-projection-all

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## スケーリング軸と前提

U3 のスケーリング軸は 2 つのみ — (1) 投影対象**ハーネス面数**(`requirements.md` FR-1 で確定する対応ハーネス集合)と (2) **プラグイン数**。`requirements.md` A-3 が「同時プラグイン数は少数(lockfile 不要 — 非目標で固定)」と固定しているため、大規模並行・水平スケーリングの service パターンは適用しない。`technology-stack.md` 実測どおりビルド時単発実行であり、負荷は CI ビルド 1 回に閉じる。

## SCALE-U3-1: 面数に対する線形性

`business-logic-model.md` フロー 1 は U1 マトリクスの確定面リスト(`business-rules.md` BR-U3-2 のマトリクス駆動列挙)から `HarnessProjectionSpec[]` を構成し、各面を独立に投影する。面の追加は投影ループの 1 反復増であり、面間に共有可変状態を持たない。

- 合否: 投影の総処理時間は対応面数に対して線形(面あたり独立処理 — 面間の N×N 相互作用を持たない)。`requirements.md` FR-1 で対応面が 7 面まで増えても投影構造は同一(クラス別 3 分岐 — component-methods.md C3、`business-logic-model.md`「残面の layout 分岐を追加」)

## SCALE-U3-2: プラグイン数に対する線形性

`business-rules.md` BR-U3-5 の `--check` は hash 比較で、投影物とオーファンの検出はディスク走査に線形。少数プラグイン前提(`requirements.md` A-3)のため索引構造・キャッシュを要求しない。

- 合否: 投影・`--check` ともプラグイン数に線形。少数前提のため、それ以上のスケーリング機構(並列投影・キャッシュ)は導入しない(必要になれば別 intent — スコープ外の機構を先行実装しない)

## 非該当カテゴリ(N/A + 根拠)

- 水平スケーリング / オートスケール / ロードバランシング: N/A。ビルド時単発ツールで常駐 service ではない(technology-stack.md「HTTP・DB はない」実測)。決定的な file 境界(投影 outDir への 1 回書き込み)へ置換される
- 同時実行制御 / ロック: N/A。単発ビルドプロセス内で完結し、`requirements.md` A-3 が lockfile 不要を非目標として固定

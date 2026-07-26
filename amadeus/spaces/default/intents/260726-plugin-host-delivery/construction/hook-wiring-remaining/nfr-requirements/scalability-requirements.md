# スケーラビリティ要件 — U4 hook-wiring-remaining

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## スケーリング軸と前提

U4 のスケーリング軸は、配線対象となる**対応ハーネス面数**のみである。`business-rules.md` BR-U4-2(マトリクス駆動)のとおり、配線対象面・挿入位置は U1 マトリクスの composeTrigger セル(measured のみ)からの転記で決まる。`technology-stack.md` 実測どおり各面のフックは単発起動(セッションライフサイクルごとに 1 回)であり、常駐・並行処理の service スケーリングは適用しない。

## SCALE-U4-1: 面数に対する加算的配線

`business-logic-model.md` フロー 1 のとおり、各面の配線は独立した HookInvocation 1 点の追加である。面の追加は他面の配線へ影響せず(面ごとに独立コミット — `business-logic-model.md`「実行順」)、面間の相互作用を持たない。

- 合否: 配線対象面の追加が既存配線面の挙動に影響しない(面ごと独立 — `business-logic-model.md` フロー 1)。`requirements.md` FR-1 で対応面が増えても配線構造は同一(HookInvocation 追加 1 点の反復)
- 合否: 配線面リストと U1 マトリクス列挙の機械照合が一致(`business-rules.md` BR-U4-2 検証 — 面集合のスケールが常にマトリクス駆動)

## SCALE-U4-2: degrade 面の加算的閉包

`business-rules.md` BR-U4-4(degrade 必須 — fail-closed)のとおり、DegradeContract は (a) clazz == manual-only、または (b) composeTrigger deferred の面に必ず作る。面数が増えても「配線あり XOR DegradeContract あり」の全数 assert により沈黙欠落が構造的に不能なため、面数スケールに対して閉包が保たれる。

- 合否: 全面について「配線あり XOR DegradeContract あり」が全数成立(`business-logic-model.md` フロー 2・BR-U4-4 検証)。面数が増えても XOR 全数 assert がスケールする(1 面追加ごとに配線か degrade のどちらか一方が必ず対応)

## 非該当カテゴリ(N/A + 根拠)

- 水平スケーリング / オートスケール / 同時接続: N/A。フックはセッションごとに 1 回起動される単発トリガーで、常駐 service ではない(technology-stack.md「HTTP・DB はない」実測)。決定的な `--if-stale` 判定と単発起動へ置換される
- 負荷分散 / キューイング: N/A。フック起動は各セッションのローカルプロセスで完結し、共有リソースの競合スケーリングを持たない(`requirements.md` A-3 少数プラグイン前提)

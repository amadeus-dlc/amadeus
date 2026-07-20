# Reliability Requirements — U1 tie-choice-resolution

上流入力(consumes 全数): requirements.md、business-logic-model.md、business-rules.md、technology-stack.md(brownfield 条件付き consumes — codekb) — 耐障害の要点は business-logic-model.md の DURABLE append 順序(無変更)と business-rules.md BR-4、回帰保証は requirements.md NFR-1/NFR-3 から導出。実行環境の Bun 挙動差クラス(technology-stack.md の Bun 前提)は本 unit の変更面(純関数+既存 I/O 経路)に非該当。

## 要求

| # | 要求 | 根拠 |
| --- | --- | --- |
| R-1 | DURABLE 順序の不変 — 裁定 append が状態遷移より先(既存 :211-221 無変更、human-ruling-persist-through の既得保証を退行させない) | business-logic-model.md |
| R-2 | 既存受理値・既存出力・既存ピン(t236:310 系)の不変を CI green の機械確認で保証(NFR-1 verbatim 完全形) | requirements.md NFR-1 |
| R-3 | 既存 store 実データ(hold 0・winner-schema 0・非空 resolutions 0 — 実測 ref NFR-3)の load/verify を壊さない — sweep は実装時点の対象 worktree glob 全数で実測 | requirements.md NFR-3 |
| R-4 | 誤入力は回復可能エラー(exit 1+valid ヒント → 再実行で回復)、store 破損系は既存 fail-fast のまま(エラー分類の回復可能性区分を変えない) | BR-2、construction ガードレール |

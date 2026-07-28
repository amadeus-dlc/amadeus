# Risk and Sequencing Rationale — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map, team-practices

## リスク起点の順序付け(なぜこの並びか)

1. **R-3(add/update 両 mutation 未実測 = live risk)を Bolt 1 の内部順序の先頭で潰す**(cid:delivery-planning:intra-bolt-order-as-risk-control — 順序自体をリスク制御として明示): mutation が成立しなければ本 intent 全体が成立しないため、gateway メソッド実装直後・他の全作業の前に実 Project で実証する。失敗時は halt-and-ask で以降の Bolt を組まない。requirements FR-7d の GraphQL errors 写像表もこの実証で実測確定する。
2. **A-4(期待選択肢の不存在)を Bolt 1 で観測面として扱う**: safety-blocked の正観測は skeleton の検証面(unit-of-work U1)。Project #5 の選択肢再構成のタイミングはユーザー運用に委ね、どちらの状態でも Bolt 1 は検収可能(成立実証 or safety-blocked 正観測)。
3. **状態の頑健化(U2)を lifecycle 統合(U3)より先に**: unit-of-work-dependency のとおり completion ゲート(FR-8)は per-Project receipt 完全形を判定材料にするため、U3 を先行させると close 阻止の判定基盤が仮実装になる。
4. **U3 → U4 の直列既定**: components の割付上、U3(executor/lifecycle)と U4(config/repair だが executor の設定消費点に接触)の交差が否定できない。並行格上げは着手前の実 diff 交差実測(cid:code-generation:c6)を条件とする(team-practices の並行実装規律)。
5. **U5 を合流点に**: docs・契約・dist は全機能の最終形を反映する集約面(unit-of-work-dependency の合流事実)。

## 主要リスクと Bolt 上の緩和

| リスク(上流) | Bolt 上の緩和 |
|---|---|
| R-3 mutation 未実測(requirements A 系/raid) | Bolt 1 先頭で実証+halt-and-ask(上記1) |
| R-2/A-4 選択肢不存在 | Bolt 1 で safety-blocked 正観測をテスト固定、U4 で上書き設定を提供、docs で運用手順(U5) |
| 部分成功の乖離(FR-7) | Bolt 2 の failure injection を Bolt 3(close 阻止)より先に完成 |
| GraphQL errors 語彙の未実測(FR-7d) | Bolt 1 の実証で実測し写像表を確定 — 後続 Bolt は確定語彙の上に立つ |
| FakeGateway 4箇所の追従漏れ | Bolt 1 で interface 追加と同時に4箇所全数更新(型検査が強制)+t280 手動確認 |

## 逸脱時の手順

実装が requirements / components / decisions から逸脱する必要に気づいたら、実装前に停止し conductor 経由でユーザー裁定を仰ぐ(cid:requirements-analysis:implementation-deviation-election のソロ適用 — 正準リスト(4))。

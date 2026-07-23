# Intent Backlog — チーム機能のコア昇格(proto-Units)

> 上流入力(consumes 全数): intent-statement(4要素の定義)、feasibility-assessment(GO 判定と E2E 基盤の実測)、constraint-register(T-1〜T-6 の制約を各 proto-Unit の受け入れ条件へ反映)

## 優先順序方針

dependency + risk-first(Q3 裁定、cid:scope-definition:c3 既習に従う)。配布骨格(依存の根元・低リスク)→未実証リスク面の前倒し→仕上げ、の3段。

## Prioritized Proto-Units(MoSCoW)

| # | Proto-Unit | MoSCoW | 依存 | 概要と受け入れの骨子 |
|---|---|---|---|---|
| PU-1 | 配布境界ガード | Must | なし(根元) | 配布ツリー→`scripts/` 参照禁止の drift guard テスト。現存層またぎ(選挙スキル→scripts)で落ちる実証→PU-2 で green 化(T-5) |
| PU-2 | 選挙エンジン昇格 | Must | PU-1(ガードの赤→green を実演) | CLI 5ファイルの core/tools 移動+スキル配布化+`{{HARNESS_DIR}}/tools` 参照書き換え+配置 ADR(T-2)。既存テスト t234〜t244 の追随 |
| PU-3 | チーム起動+メッセージング配布面 | Must | PU-1 | team-up.sh 一式の配布位置確定、herdr/agmsg の PATH 依存宣言+不在時 loud エラー+実測バージョン記録(T-1/T-3/T-6)。リスク最大面(bash 配布)のため前倒し |
| PU-4 | クリーン環境 E2E | Must | PU-2, PU-3 | fake-binary seam+pty e2e で Must 面(起動→メッセージ→選挙完走)を自動検証。temp HOME+隔離 PATH+self-install ツリー構成 |
| PU-5 | docs(Team Mode 章+3層規約+prerequisite) | Must | PU-2, PU-3(内容確定後) | en/ja 対の新章、prerequisite 節(agmsg 入手経路は raid-log D-2 の確定が前提)、Windows 対象外の明記 |
| PU-6 | バリエーション動作維持 | Should | PU-3 | codex/--instance/-c/サイズ指定/spawn 系のコード搬送と既存テスト green 維持。新規 E2E 保証は付けない(Q1 裁定) |

## Won't(明示的除外)

scope-document の Out of Scope 節を参照(herdr/agmsg 同梱・抽象化、memory テンプレ、Windows、手動実証、選挙 CLI 機能拡張)。

## 備考

- proto-Unit は units-generation 段で正式な Unit of Work へ再分割される(本表は優先順序と境界の合意が目的)
- PU-3 の「配布位置確定」は設計判断(dist へ載せる形 vs リポジトリ公式のまま参照する形)を含む — application-design/units-generation でUX起点(cid:intent-capture:ux-first-scope-for-distribution-intents)に確定する

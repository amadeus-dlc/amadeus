# Business Rules — standing-grant

上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`(単一 Unit)、`../../../inception/units-generation/unit-of-work-story-map.md`(FR トレース)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜8)、`../../../inception/application-design/components.md`(C-1〜C-6)、`../../../inception/application-design/component-methods.md`、`../../../inception/application-design/services.md`(三経路の権限フロー)

## ルール表

| # | ルール | 由来 |
|---|--------|------|
| R-1 | 受理は全条件 AND(発行行・HUMAN_TURN・scope・TTL・未撤回・両側 team モード)— どれか欠け = 無効 → 従来経路へ | FR-3 AC-3a/C-1 |
| R-2 | approve 側のみ — reject(gate resolution reject 分岐・handleDelegateRejection)は対象外 | E-SDG-AD2=X / AC-3a 遡及訂正 |
| R-3 | phase-boundary は既定拒否、grant.includesPhaseBoundary=true のときのみ通す | E-SDG-RA2=C / AC-4e |
| R-4 | skeleton ゲートは恒久除外(opt-in 不可)。PR マージは verb 不在の構造外(分類に現れない) | AC-4a〜4c |
| R-5 | TTL 比較は parse 済み数値のみ(型不正は発行時 loud refuse) | AC-1e / C-6 |
| R-6 | 撤回は結果整合 — 取込前ツリーの旧グラント有効は TTL 上限内で許容(docs 明文) | ADR-2 / AC-2b |
| R-7 | fail-open 分岐(lib:2484)に相乗りしない — グラント判定は humanActedSinceGate false 後にのみ実行 | AC-3b / ADR-7 |
| R-8 | GRANT_* 行は verb の in-process 書き込みのみ(CLI mint 拒否) | AC-7a / ADR-6 |

## ルールの検証対応

R-1〜R-8 は C-6 テストへ 1:1(R-1=AND 各欠落ケース+発行側チームモード拒否(AC-1b = AC-5a 赤側(4)前半。受理側拒否は同(4)後半)、R-2=reject 側非適用、R-3=赤側(6)+opt-in 白側、R-4=skeleton は赤側(1)・PR マージは白側 sweep(AC-4c — 構造外につき落ちる実証は不能)、R-5=赤側(5)、R-6=一時状態 fixture、R-7=ledger 不在 fixture でグラント判定非実行、R-8=mint 拒否)。

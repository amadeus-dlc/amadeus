# Security Requirements — standing-grant(U1)

上流入力(consumes 全数): `../functional-design/business-logic-model.md`(純関数構成・エラー処理方針)、`../functional-design/business-rules.md`(R-1〜R-8)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜8)、codekb `technology-stack.md`(Bun/TS/Biome — 本日 RE 現況)

## 要件

- S-1: グラント行の偽造耐性 — GRANT_ISSUED/GRANT_REVOKED は PRESENCE_PROTECTED_EVENTS(CLI mint 拒否)+根拠 HUMAN_TURN 実在照合の2層(ADR-1/6)。落ちる実証: mint 拒否テスト(R-8)
- S-2: 権限拡大の封鎖 — approve 側のみ(E-SDG-AD2=X)・既定除外(RA2=C)・TTL 有界・revoke 可能・除外集合は定数列挙で env/設定から緩和不能(AC-4d)
- S-3: モード境界 — 発行・受理とも `AMADEUS_OPERATING_MODE`(env 唯一判定)が team のときのみ。ソロの human-presence ゲートを弱めない(赤側 (4) 両側)
- S-4: fail-open 非拡大 — 既存 lib:2484 の fail-open 分岐にグラント判定を合流させない(AC-3b / R-7 — fixture でピン)

## 検証対応(系列別 — 被覆源を分離)

- S-1(偽造耐性)= **R-8 mint 拒否テスト**(AC-5a の6種とは別系列)+根拠 HUMAN_TURN 実在照合の AND 欠落ケース(AC-5a 系列)
- S-2(権限拡大封鎖)= AC-5a 赤側 (1)(2)(3)(6)
- S-3(モード境界)= AC-5a 赤側 (4) 両側(発行・受理)
- S-4(fail-open 非拡大)= **AC-5b 一時状態 fixture 系列**(ledger 不在 fixture でグラント判定非実行のピン — R-7)
- 白側 sweep(#671 退行ゼロ)は全 S の背面保証
(NR reviewer Major-1 是正: 被覆源は AC-5a / AC-5b / R-8 mint 拒否の3系列+白側 — 2系列への単純化は build-and-test の閉包誤解を生むため分離明記)

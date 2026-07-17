# Security Test Instructions — standing-delegation-grant

上流入力(consumes 全数): `../standing-grant/code-generation/code-generation-plan.md`、`../standing-grant/code-generation/code-summary.md`

## NFR 対応(S-1〜S-4、3系列+白側)

- **S-1 偽造耐性**: R-8 mint 拒否テスト(PRESENCE_PROTECTED_EVENTS 経由の CLI 鋳造拒否)+根拠 HUMAN_TURN 実在照合の AND 欠落ケース
- **S-2 権限拡大封鎖**: 赤側 (1) scope 外拒否 (2) TTL 切れ拒否 (3) 撤回後拒否 (6) opt-in なし×phase-boundary 拒否。skeleton 恒久除外は Major-1 是正で生値 stance 系も封鎖(RED 2本追加)
- **S-3 モード境界**: AMADEUS_OPERATING_MODE≠team の発行拒否・受理拒否の両側(solo-mode rejection — ユーザー要件)
- **S-4 fail-open 非拡大**: ledger 不在 fixture でグラント判定非実行(lib:2484 の既存 fail-open に非合流 — 挿入位置の構造保証をピン)

## 実行方法と SAST

- `bun test tests/integration/t-standing-grant.test.ts` に全系列を同居(47 テスト中のセキュリティ系列)
- SAST 相当: Biome lint+`tsc --noEmit`(CI 必須ゲート)。秘密情報ハードコードなし(グラントは監査シャードの公開行のみで構成)
- 落ちる実証実績: revoke 判定無効化注入 → 1 fail → 復元 green / pre-fix dist skeleton 素通り → 1 fail → 是正後 green(いずれも実測、code-summary.md 参照)

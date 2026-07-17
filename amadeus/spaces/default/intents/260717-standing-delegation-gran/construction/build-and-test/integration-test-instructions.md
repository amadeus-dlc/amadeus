# Integration Test Instructions — standing-delegation-grant

上流入力(consumes 全数): `../standing-grant/code-generation/code-generation-plan.md`、`../standing-grant/code-generation/code-summary.md`

## クロスユニット/境界テスト

単一ユニット intent のため「ユニット間」は該当なし。統合境界は次の3面で、いずれも t-standing-grant.test.ts 内の handle* 直接駆動(in-process)でテスト済み:

1. **verb 統合**(handleGrantStandingDelegation / handleRevokeStandingDelegation → 監査シャード emit): 接地ゲート(HUMAN_TURN 実在)→ モード判定 → scope 検証 → TTL parse → emit の実行順を含む
2. **受理統合**(handleGateStart/approve 経路 → findActiveStandingGrant → standingGrantSatisfiesGate): 全 intent シャード走査+revoke 優先+TTL+phase-boundary/skeleton 除外の AND 連鎖
3. **taxonomy 統合**(PRESENCE_PROTECTED_EVENTS): CLI mint 拒否(R-8)

## 実行方法

- `bun test tests/integration/t-standing-grant.test.ts` — 47 テスト
- フル統合: `bash tests/run-tests.sh --ci`(integration 層 9 ファイル 138 pass を含む — 白側 sweep = 既存 delegate フロー #671 退行ゼロの背面保証)

## 外部依存の扱い

外部サービス依存なし(検証はシャード行+現在時刻に閉じる決定的設計 — ADR-2 のオフライン耐性)。ネットワーク不要で全テストが完走する。

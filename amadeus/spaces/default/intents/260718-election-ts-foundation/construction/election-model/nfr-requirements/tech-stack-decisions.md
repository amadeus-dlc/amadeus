# Tech Stack Decisions — election-model(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 選定と根拠

| 領域 | 選定 | 根拠 |
|---|---|---|
| 言語/ランタイム | TypeScript/ESM+Bun 直接実行 | requirements.md NFR-1+codekb technology-stack.md の既存スタック実測(Bun/TS が全ツールの現行) |
| エラー型 | 判別ユニオン `Result<T, E>` | project.md 既決スタイル(functional-domain-modeling-ts)。business-logic-model.md エラー処理節と一致 |
| hash/PRNG | fnv1a+mulberry32 を自前実装(数十行) | business-logic-model.md 決定的シャッフル節 — 外部依存なし(NFR-1 の gh 非依存と同系の依存最小方針、Bun-only Forbidden 準拠)。暗号強度は不要(用途は表示順シャッフルのシードのみ — セキュリティ境界でない) |
| lint/型検査 | Biome+`tsc --noEmit`(既存配線) | ADR-1 Consequences — scripts/ 配置で既存 CI gate 列をそのまま利用。新規配線なし |
| テスト | bun test・unit 層(fs 非依存純関数) | business-rules.md テスト列(全 BR が unit 層)+NFR-2(fs-tests-integration-first — U1 は実 FS を触らないため unit 層が正) |

## 却下した代替

- 外部 hash/シャッフルライブラリ(seedrandom 等)— 配布フレームワーク外とはいえ Bun-only 前提の文書化なし追加を避ける(project.md Forbidden)。自前 fnv1a+mulberry32 は要件(決定性・非暗号)に十分
- Node.js crypto の暗号乱数 — 決定的再現(NFR-3)と相反するため不採用

# Tech Stack Decisions — election-model(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 選定と根拠

| 領域 | 選定 | 根拠 |
|---|---|---|
| 言語/ランタイム | TypeScript/ESM+Bun 直接実行 | requirements.md NFR-1+codekb technology-stack.md の既存スタック実測(Bun/TS が全ツールの現行) |
| エラー型 | 判別ユニオン `Result<T, E>` | project.md 既決スタイル(functional-domain-modeling-ts)。business-logic-model.md エラー処理節と一致 |
| hash/PRNG | fnv1a+mulberry32 を自前実装(数十行)— **本ステージで確定** | business-logic-model.md 決定的シャッフル節の擬似コードは `fnv1a` を例示しつつ「具体 hash 関数は実装時選定」と留保しており自己矛盾がある(reviewer Finding 5)。本ステージ(tech-stack 選定の正位置)がこの留保を**申告付きで解消**し fnv1a+mulberry32 を確定とする — 要件は決定性(NFR-3)と外部依存なし(NFR-1 同系の依存最小方針)のみで、両者を満たす。暗号強度は不要(用途は表示順シャッフルのシードのみ — セキュリティ境界でない)。FD 側注記の同期是正は本ステージ是正コミットで実施 |
| lint/型検査 | Biome+`tsc --noEmit`(既存配線) | ADR-1 Consequences — scripts/ 配置で既存 CI gate 列をそのまま利用。新規配線なし |
| テスト | bun test・unit 層(fs 非依存純関数) | business-rules.md テスト列(全 BR が unit 層)+NFR-2(fs-tests-integration-first — U1 は実 FS を触らないため unit 層が正) |

## 却下した代替

- 外部 hash/シャッフルライブラリ(seedrandom 等)— W-04 配布外につき project.md の Bun-only Forbidden の射程外だが、依存最小方針(NFR-1 の gh 非依存と同系)と規模正当化(inception ガードレール — 既存で代替できない根拠がある場合のみ新規導入。自前実装は数十行で足りる)により不採用
- Node.js crypto の暗号乱数 — 決定的再現(NFR-3)と相反するため不採用

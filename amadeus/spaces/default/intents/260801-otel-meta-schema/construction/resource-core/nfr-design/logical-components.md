# Logical Components — U1 resource-core

上流入力(consumes 全数): performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions — nfr-requirements SKIP により不在(expected)、各面の要件は requirements.md NFR-1〜4 から代替導出(本ファイルは NFR パターンの適用先コンポーネント目録として4設計の適用点を束ねる)。business-logic-model.md(実在)のコンポーネント分担を消費。

## コンポーネント目録と NFR 適用点

| コンポーネント | 責務 | 適用 NFR 設計 |
|---|---|---|
| `otel/resource.ts`(新設) | buildResource / currentResource(遅延 memo)/ 閉集合検証 | performance(memo)、reliability(per-key fail-open)、security(write-time redaction 適用点) |
| `otel/resource-suppliers.ts`(新設) | supplier 4キーの受付・二重設定 throw | reliability(fail-closed)、security(閉集合拒否) |
| `otel/tracer-provider.ts` :137(改修) | resource literal 置換 → currentResource 消費 | scalability(中立境界 NFR-2 — ハーネス分岐なし) |
| `otel/logger-provider.ts` / `meter-provider.ts`(改修) | 同上の resource 搬送 | 同上 |
| `otel/local-span-exporter.ts`(改修) | export 境界 redaction の resource 面拡張 | security(二層の第2層) |

## 障害ドメインと blast radius

- resource 解決の障害ドメインはプロセスローカル(共有 store・他プロセスへ波及しない)。最悪ケース = 属性省略された telemetry(NFR-1 により本体無影響)
- throw 面(supplier 誤用)は呼出し側プロセスのみで顕在化し、store 上の既存データを破壊しない — store は追記のみ(appendFileSync)で既存行の書換え経路を持たないため。なお本 store は gitignore 対象のローカル JSONL であり、git 管理成果物の回復規範(deployment-pipeline:c3)とは別軸の append-only 特性である

## 共有資源

- 共有は `.amadeus-otel/` store のみ(services.md 依拠・additive)。resource は各レコードへの per-record 埋め込み(local-span-exporter.ts:39 実測)として既存の store writer 経路(appendFileSync 追記)を通り、新規のロック・排他は導入しない

## dist 投影(NFR-4)

上記全ファイルは packages/framework/core/ 配下 — 変更ごとに package.ts+promote:self を同一 PR で回し、7ハーネス dist+self-install を同期する(bt-dist-regen-seven-harnesses)。

# Tech Stack Decisions — goa-sparse-acceptance

上流入力(consumes 全数): `business-logic-model.md` の3コンポーネント境界、`business-rules.md` の BR-11/BR-12、`requirements.md` の FR-4、brownfield 条件の `technology-stack.md` に記録された TypeScript/Bun/ESM・既存 test/coverage/dist toolchain を実依拠として使用する。

## 決定一覧

| ID | 領域 | 決定 | 理由・制約 |
|---|---|---|---|
| TS-1 | 言語/runtime | 既存 TypeScript + Bun + ESM を継承し、新規 runtime/dependency を追加しない | parser、election record、tests が同一 stack。FR-4 の brownfield surgical 境界 |
| TS-2 | parsing | 既存の型付き `Result`/`ParseFailure` と正規表現 seam を拡張し、parser generator や外部 grammar library を導入しない | 文法は小さく、受理境界は BR-6〜BR-10 で閉じている。依存追加は供給網と配布面を不必要に拡大する |
| TS-3 | tests | `bun:test` と既存 test runner を使用。純粋 parser/extractor は unit、memory 実 FS sweep は integration | `business-logic-model.md` の test layer 精密化と fs-tests-integration-first に一致 |
| TS-4 | coverage/quality | 既存 lcov patch gate、typecheck、lint、全 CI を使用し、新規 quality tool を追加しない | requirements.md FR-4 の完成条件をそのまま実行可能にする |
| TS-5 | distribution | `amadeus-norm-metrics.ts` は core 正本から既存生成器で dist 6面+self-install へ投影。`amadeus-election-record.ts` / `amadeus-election.ts` は scripts 配布外面のまま | BR-11/BR-12 の ownership と配布境界を保存 |

## Reuse Inventory

- `GOA_TOKEN_RE` と既存 canonical parse: count 文法・8-bin 変換を再利用する。
- `Result` / `ok` / `err` と `ParseFailure`: 新しい例外型を作らず失敗契約を維持する。
- `GoaLineCode.parse`: election ID の唯一の値検証境界を維持し、`handleOpen` は説明文だけを同期する。
- `runTestFiles` / Bun runner / lcov: 既存の unit・integration・coverage 経路を利用する。
- dist/promote scripts: core 正本の生成物同期に利用し、コピーを手編集しない。

## 採用しない選択肢

- parser generator・PEG library: 単一行の限定文法に対して過大で、配布6面と supply-chain surface を増やすため不採用。
- performance/load-test framework: service/RPS 境界がなく、固定時間閾値を正当化できないため不採用。
- database/cache/queue/observability SDK: 永続化・外部通信・runtime service を追加しない Unit には非該当。
- 新しい compliance/security scanner: 攻撃面と依存が増えず、既存 CI/静的検査で要件を検証できるため追加しない。既存必須 scanner の省略を意味しない。

## 変更統制

実装中に外部 dependency、新しい永続 store、network boundary、非決定的 fallback、test-only production mode が必要になった場合は、本決定の射程外である。実装前に停止して選挙/Change Control へ戻し、NFR と threat model を再確定する。

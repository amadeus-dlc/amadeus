上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

本 NFR は codekb `technology-stack.md` の TypeScript/ESM・Bun と既存テストサイズ機構を前提とし、新規の常駐サービス、永続ストア、監視基盤を追加しない。

# 信頼性要件 — U2 層責務仕様と tier-aware ドリフト判定

本書は `business-logic-model.md` の決定的判定と fail-closed 方針、`business-rules.md` の上限写像、`requirements.md` の FR-3/FR-7 を、再現性・故障時挙動・観測可能性として具体化する。

## REL-1: 同一台帳から同一 verdict を得る決定性

同一 measurement ref の同一 `SizeLedger` と同一 `allowedMaxSize` 写像に対し、判定順序やホストに依存せず同じ `TierDriftReport` を返すことを要求する。判定は `SIZE_ORDER[measured] > SIZE_ORDER[allowed]` の strict 比較だけで、時刻、乱数、ネットワーク、環境変数、LLM 判断を入力にしない。

現行 442 行への規約適用結果は次の機械導出と一致しなければならない。

| tier | 規約上限 | over-limit 実測 |
| --- | --- | --- |
| unit | small | medium 162 + large 1 = 163 |
| integration | medium | large 0 |
| e2e | large | 0 |
| smoke | medium | large 0 |

harness/lib は補助 tier として台帳には残るが規約対象外であり、上表の violation 総数は 163 である。

## REL-2: 欠落・不正入力の局所化と fail-closed

- 規約対象行の `tier`・`measured` 欠落、未知の `TestSize`、不正な台帳形式は failure として明示し、`none` へ縮退させない。
- 正当な補助 tier は failure ではなく `not-applicable` 相当として集計対象外にし、台帳上の可視性は維持する。
- 1行の failure と全体集計を区別し、判定不能行が存在するレポートを「violations 0」の成功として扱わない。
- 既存 declared-vs-measured ゲートは非破壊温存し、新判定の故障や未実装を理由に無効化しない。

具体的な failure 型、exit code、CI 赤化、故障注入による落ちる実証は別 intent の実装範囲である。

## REL-3: 適用外の信頼性指標と観測契約

常駐サービス、利用者リクエスト、永続データが存在しないため、可用性 SLA/SLO、RTO、RPO、バックアップ、マルチ AZ、リトライ、サーキットブレーカは N/A である。単発コマンドの成功や timeout を service SLO へ昇格させない。

代わりに、各判定結果は measurement ref、総行数、規約対象行数、補助 tier 行数、violation 件数、判定不能件数を保持できる形にする。これが再実行時の差分確認と誤った zero-violation の検出に必要な最小観測契約である。本 intent では設計のみを行い、ログ出力やレポート形式の実装は Out とする。

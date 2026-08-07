# U3 subagent-stats — Logical Components

**上流入力(consumes 全数)**: `business-logic-model`(モジュール構成と依存方向 — 本書の目録の導出元)。条件解決で除外された consumes(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は nfr-requirements SKIP による設計上の不在(directive の `consumes_absent` expected: true)。

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## 論理コンポーネント目録

| コンポーネント | 実体 | 障害ドメイン | blast radius |
|---|---|---|---|
| 走査フェーズ | `amadeus-subagent-stats.ts` の main(node:fs) | CLI プロセス(単発) | 当該実行の出力のみ — 読取専用につき永続状態への影響ゼロ |
| 集計層 | `composeStatsReport`(export 純関数) | プロセス内 | 同上(決定的) |
| 描画層 | `renderStatsText`(export 純関数)/ JSON 出力 | プロセス内 | 同上 |
| 分類の再利用 | `amadeus-subagent-observability.ts`(U1)の import | プロセス内 | U1 の fail-open 契約を継承(解決失敗は台帳のみ縮退) |
| 入力データ | `intents/*/audit/*.jsonl`(読取のみ) | FS | ゼロ(書込なし — read-only 分類) |

## 分離戦略と共有資源

- **依存方向**: stats → observability の一方向(新設同士でも上位/下位を固定 — business-logic-model)。`amadeus-lib.ts` へ依存しない
- **走査/集計/描画の3層分離**: I/O は走査フェーズに閉じ込め、集計と描画は純関数 — テスト境界(in-process seam)と障害境界が一致する設計
- **共有資源との関係**: audit シャードは他プロセス(hook・engine)が並行 append しうる — 読取専用 CLI は lock を取らず、その実行時点のスナップショットを読む(部分行=書きかけ末尾行は parse skip 計上で自然に吸収 — 並行書込との共存設計)。注記の文言上、`parseSkippedCount` は「データ破損」と「並行書込の書きかけ末尾行」を区別できない — **本 ND が加える出力文言統制**(BR-U3-5 の第5節構成は変更せず、render の文言実装に対する追加規定): 注記行の文言に「(並行書込中の一時値を含みうる)」を含め、少数の skip を破損と誤診断させない

## 障害ドメインの遮断点

1. **行レベルの破損** → `parseSkippedCount` 計上で行内に遮断(集計は続行、exit 0)
2. **シャードレベルの読取失敗** → `unreadableShardCount` 計上 + path を stderr で遮断(他シャードの走査は続行、**exit 非0** — fail-loud、business-logic-model エラーモデル表の訂正注記で FD 側に確定)
3. **許可集合の解決失敗** → U1 契約の台帳のみ縮退(分類は続行、`allowedSetWarnings` 計上、exit 0)
いずれも集計出力には到達する — 遮断は常に「観測を狭めて続行」方向で無音に落ちる遮断はなく、観測宇宙が欠けた場合(2)だけは exit で loud に伝える

## インフラ設計への橋渡し

インフラ資源なし — 常駐・配備・監視対象の service ではなく、開発者が手元で実行する読取 CLI(kind=service は「実行可能な独立成果物」の意味論)。Infrastructure Design 段への引き継ぎ事項なし。

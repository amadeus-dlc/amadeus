# Logical Components — `launch-autonomy-flag` NFR Design(#2253)

上流入力(consumes 全数): business-logic-model.md(present — 処理シーケンス・データフロー・委譲境界の依拠元)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は scope の SKIP により設計上不在(questions ヘッダの負方向解決を参照)。

本 Unit の論理コンポーネントは 3 つ+障害ドメイン 1 つで全数である(questions D4)。

---

## コンポーネント台帳

| # | コンポーネント | 所在(編集正本) | 責務 | 障害ドメイン |
| --- | --- | --- | --- | --- |
| LC-1 | C12 parser 分岐(2 分岐) | `packages/framework/core/tools/amadeus-orchestrate.ts` の `parseNextFlags`(既存 argv ladder 内) | `--autonomy` の値 consume(自由文漏洩防止)と値なし検出。検査はしない(運ぶだけ) | engine プロセス内・parse 段 |
| LC-2 | C13 適用ハンドラ+context reader | 同ファイルの新 Branch(state 読込後・birth 分岐前) | 判定 0〜8 の一元実施(loud エラー / no-op / 委譲)。projection は `readLaunchAutonomyContext` が 1 回だけ読む | engine プロセス内・directive 構築前 |
| LC-3 | 委譲境界 | 既存 `applyProductionAutonomyMode`(`amadeus-intent-autonomy-production.ts`)への 1 呼び出し | mode 書込・監査・provenance 検査は既存経路が独占(ADR-8 — 第 2 の書込経路を作らない)。directive への射影も既存 `routeMainWorkflowDirective:2192` が独占(C-3) | 既存認可基盤側(本 Unit は境界のみ所有) |

## 障害ドメインと blast radius

- **障害ドメイン**: engine プロセス(`services.md` P3 — FD 依拠箇所)1 つ。単発 CLI 実行であり常駐・並行実行の障害モードを持たない。
- **blast radius**: LC-1/LC-2 の欠陥の最大影響は「起動フラグ経由の mode 宣言の誤受理・誤拒否」。誤拒否側は loud エラー(利用者は `set-autonomy` 正本経路で回復可能 — 案内文付き)。誤受理側は LC-3 の既存検査(provenance・grant 儀式)が第 2 の防衛線として残るため、単独欠陥では認可強度が落ちない(defense in depth — security-design.md S4)。
- **隔離戦略**: 判定ロジック(LC-2)を export 関数として隔離し in-process テスト駆動(t450)。parser(LC-1)も `parseNextFlags` export 追加で in-process 駆動(t449 — `cid:code-generation:seam-export-handler-amend` の執行)。

## 共有資源

| 資源 | 共有相手 | 競合の扱い |
| --- | --- | --- |
| state ファイル(読み取り) | engine 既存 Branch 群 | 既存 `loadStateFileIfPresent:2540` の結果を再利用(追加 read なし) |
| autonomy projection(読み取り) | 認可基盤・hooks | `readLaunchAutonomyContext` の 1 read に限定。書込は LC-3 委譲のみ |
| argv ladder | 既存フラグ群(`--report` 等) | 同一 ladder への分岐追加(NFR-3 — 走査計算量不変)。`--report` の consume 様式を踏襲 |

## インフラ非該当の明記

circuit breaker / cache / pooling / scaling / failover は**すべて非適用**(1 行理由): 単発 CLI の parse+適用経路であり常駐負荷が存在しない(`cid:nfr-design:c1`、questions D2)。信頼性は fail-closed 判定表と決定的 I/O(projection 1 read)で担保する。

## 適用 NFR との対応(検証手段付き)

- **NFR-1**: security-design.md **S1**(FR-CLI-4 の面に限る)の落ちる実証。**NFR-6**: security-design.md **S4**(`--autonomy` の面)の provenance ケース。S2/S3 の落ちる実証は FR-CLI-2/3 の受け入れ基準に紐づく品質検証であり、NFR-1/6 の充足根拠には数えない(§12a iteration 1 MAJOR の精密化)。
- **NFR-3**: parse 関数本体の FS 呼び出し grep 0 件+同一 ladder 内配置の diff 確認。
- **NFR-4**: t449/t450 を Red 先行で追加。実 FS ケースは integration 層。
- **NFR-5**: 編集正本 1 ファイル、`bun run build` 後の追跡ファイル不変。
- **NFR-7**: PR CI ブロッキング集合の全通過。
- **NFR-2**: 非適用(security-design.md の分類表 — 本 Unit は裁定を生成しない)。

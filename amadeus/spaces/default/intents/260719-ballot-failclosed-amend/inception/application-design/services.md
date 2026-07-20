# Services — 260719-ballot-failclosed-amend

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## サービス面(CLI 契約)

本 intent はサービス(常駐プロセス・API)を導入しない。ユーザー可視の契約は選挙 CLI の verb 面のみ:

| verb | 変更 | 契約 |
| --- | --- | --- |
| `vote --election <id> --file <ballot.json>` | 受理域の変更 | (1) submittedAt が mint 正規形+実在日時でない ballot は `vote: invalid-timestamp` で exit 1(FR-1) (2) `kind:"amend"`+有効 ref の ballot が受理される(FR-3) (3) ref 不一致は `appendBallot: unknown-ref` で exit 1(E-BFARA3。表記は storeFail の実装様式 `${op}: ${e}`(election.ts:84-86)に一致させる — 初稿の `appendBallot failed:` は誤記で FD レビュー iteration 1 Major #1 により是正) |
| `tally` / `verify` / `render` | 集計母集団の解決 | per-voter 最新1票(同時刻 amend 優先)で解決してから集計(FR-4)。original+amend 共存 ledger でも二重計上しない |
| `next` / `status` / `open` / `notify` / `report` | 変更なし | — |

## 他エージェント(利用者)への影響

- 既存の正当な投票フロー(original ballot、秒精度 UTC submittedAt)は完全不変(FR-1(d)、FR-3(a))。
- 訂正フロー: `__NOW__` 事故級の誤 ballot は受理段で即時 exit 1(検出がライフサイクル終盤から受理時へ前進)。受理後の内容訂正は amend ballot(同一 vote verb、ref = 訂正対象の submittedAt)で CLI 内完結 — store 手是正が不要になる。
- #1261(e1 intent)との関係: 本 intent の解決は「母集団の per-voter 一意化」まで。outcome 導出(choice/GoA の役割分担)は #1261 の管轄で、直列合意(e1 先行着地→本 intent CG 再接地)に従い統合する。

# Services — intent 260816-priority-bug-batch-3

本リポジトリはデプロイされる常駐サービスを持たない(codekb `architecture.md` — bun 直接実行の CLI ツール群 + hooks)。requirements.md の 5 FR が触る「サービス相当」の実行単位は、いずれも短命 CLI プロセスであり、本 intent で新設・廃止されるものはない。

## 実行単位と本 intent の関係

| 実行単位 | 起動形態 | 本 intent の修正 |
|---|---|---|
| `amadeus-state.ts`(approve / reject / gate-start) | conductor の `report` 経由で spawn | C1 presence guard(FR-1)・C4 source-work guard(FR-4)の判定変更。CLI 契約(verb・exit code)は不変 |
| `amadeus-orchestrate.ts`(next / report) | conductor が直接実行 | FR-2 の裁定次第で :2822 の呼出形が変わりうる(emit の分離)。directive スキーマは不変 |
| pr-convergence CLI(create / report) | Bolt 配送時に conductor が実行 | FR-3 の lifecycle 遷移・検査束縛の変更。verb 追加の要否は q3/q4 裁定に従う |
| `pr-convergence-report-format` センサー | PostToolUse hook / stage approve 時に fire | FR-3 の検査束縛変更(blocking severity は不変) |
| `amadeus-election.ts`(vote) | 投票時に voter ごとに実行されうる | FR-5 の並行安全化。CLI 契約は不変 |

## オーケストレーション

- 通信はすべてプロセス境界の JSON(stdout / ファイル)で、非同期メッセージング・イベントバスは存在しない。本 intent でも導入しない
- FR-5 のみ「複数プロセスの並行実行」が正面の主題(並行 voter)。他 FR は単一 conductor プロセスの直列実行が前提
- ライフサイクル・スケーリング特性の変更なし

## サービス契約の不変条件

- 全 CLI の exit code 意味論(0 = 成功 / 非0 = fail-closed 拒否)は維持する
- ユーザー可視の CLI 契約(verb 名・フラグ)の変更が q3/q4 裁定で必要になる場合(例: override 経路の verb 追加)は、該当 unit の受け入れ条件にユーザー可視契約テストを含める(project.md Testing Posture)

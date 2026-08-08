# Component Methods — autonomy-reachability(#2378)

上流入力(consumes 全数): requirements.md(FR の受け入れ基準をメソッド契約へ具体化)、architecture.md / component-inventory.md(既存シグネチャの現在断面 — 患部詳細は re-scan record 正本)。

シグネチャは方向性契約であり、確定は functional-design。詳細な業務規則は Functional Design に置く。

## C1: Launch Declaration

- `takeAutonomyFlag(args: string[]): { args: string[]; declared?: AutonomyMode; missingValue?: true }` — 既存(変更なし、t449 ピン維持)
- `applyLaunchAutonomyDeclaration(input): LaunchDeclarationJudgment` — 変更: judgment 0 を「state 不在かつ birth 予定あり → `carry-to-birth`」判定へ分岐。エラー文言は「birth も宣言も成立しない」ケースにのみ残す
  - 入出力: 入力に birth 予定の有無(freeform 記述の実在)を追加。出力 union に `{ kind: "carry-to-birth", mode }` を追加
  - エラー方針: 値域外・値なしは従来どおり loud refuse(t449/t450 ピン維持)
- `intent-birth --autonomy <none|semi>`(amadeus-utility.ts)— 新規引数: birth 完了直後に C2 の `applyProductionAutonomyMode` を呼ぶ。full は適用せず preview 表示指示を print で返す(fail-closed)

## C2: Autonomy Production

- `applyProductionAutonomyMode(input): {ok, projection} | {ok: false, error}` — 変更: 成功時に state 3フィールド(`Intent Autonomy Mode` / `Intent Grant` / `Construction Autonomy Mode`)の書込を追加所有。書込失敗は loud error(audit 先行・state 追従の順序は cid:functional-design:audit-batch-before-state-atomicity に従い functional-design で確定)
- `emitAuthorizationRefusal(occurrence, reason): void`(新設・私有)— `productionStageAutonomy` の `autoApprove === false` 分岐(`:227-231`)から呼ぶ。audit イベント1行を emit。エラー時は握りつぶさず stderr 警告(fail-open — 可観測性の欠落で workflow を止めない)
- `previewProductionAutonomyGrant(...)` — 変更: 出力に `nonAutoDecidedKinds: InteractionKind[]` を追加(semi = `["phase-gate","walking-skeleton"]`、full = `[]`)

## C3: Mode Recording CLI

- `handleSetAutonomy(args, explicitProjectDir?)`(amadeus-bolt.ts)— **縮約**: 現行の state 3フィールド直書き(`:1075-1081` の `setOrInsertField`/`setFieldStrict`/`writeStateFile` 列)を削除し、`applyProductionAutonomyMode` の呼出し(既存)だけを残す — state 書込は C2 が canonical に所有(ADR-3)。verb の引数契約(`--mode` / `--policies-file` / `--confirmed-display-digest`)・stdout 出力・exit code は不変
- エラー方針: C2 の `{ok: false, error}` をそのまま loud に返す(現行同等)。縮約により「audit 成立・state 未反映」という現行 C13 経路の非対称が構造的に消える(残る failure mode は C2 側で functional-design が固定)

## C4: Question Audit

- `logQuestionAnswered(...)`(`amadeus-log.ts:180-187` 相当)— 変更: 属性 `Resolution Route: ladder|human` と、ladder 時のみ `Decision Id: <auto-decision-…>` を追加。入力に optional `decisionId` を追加し、呼び出し元(conductor の questions 記録手順)が decide-question の戻り値から搬送する
- エラー方針: 属性欠落は従来の guard 挙動を変えない(FR-3c)
- **FR-3b の所有と委譲(明示)**: 検出面は C4 が所有する — 一次実現は上記属性による after-the-fact 集計(`Resolution Route=human` × mode∈{semi,full} の抽出)。sensor 化(リアルタイム検出)を追加するか否かは functional-design の裁定事項として**明示的に委譲**する(委譲先で不採用なら理由を成果物に記録)

## C7: Parity Guard

- `tests/unit/tNNN-autonomy-conduit-parity.test.ts`(採番は実装時に予約)— 各面のファイルを読み `--autonomy` の出現を assert。stage-protocol には semi の decide-question 手順段落の存在を語彙 grep で assert。入力: リポジトリの正本ファイル群(dist 非参照)。失敗: 面のパスと欠落語彙を列挙して赤

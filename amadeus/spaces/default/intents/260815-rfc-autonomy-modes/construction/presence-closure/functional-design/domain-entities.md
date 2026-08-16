# Domain Entities — unit presence-closure(U6 / C13 / FR-12 / D7・D8)

## PresenceReceipt(新規、U6 所有)

`verifyBatchApprovalPresence` の成功アームが返す型。既存の類似成功アーム(`amadeus-presence-reservation.ts` の `TargetedApprovalEvidence`)は監査照合(freshness・件数)の複合エビデンスだが、`approve-batch` の presence 検証は「あるか/ないか」の一過性ブール判定であり、成功したという事実そのもの以上の情報を呼出し元(`handleApproveBatch`)は消費しない(FR-12 の受け入れ基準・component-methods.md C13 のいずれも成功時の追加データを要求していない)。よって意図的に最小の witness 型とする(refine — component-methods.md は名前のみを指定):

```ts
type PresenceReceipt = { readonly present: true };
```

```ts
type PresenceRefusal = { readonly reason: string };

function verifyBatchApprovalPresence(projectDir: string): Result<PresenceReceipt, PresenceRefusal>;
```

- `Result` は project.md Code Style の判別ユニオン規約に従う(`{ kind: "ok"; value: T } | { kind: "error"; error: E }` 相当。プロジェクト標準の `Result` 型を再利用し新型を作らない)。
- `PresenceRefusal.reason` は `error()` ヘルパーへそのまま渡せる人間可読文字列(構造化エラーコードは持たない — 既存 `rejectUngroundedDelegation()` 等の単純な `error(message)` 呼出しパターンに揃える)。

## PresenceVerdict(新規、U6 所有)

`resolveGatePresence` の戻り型。component-methods.md C13 が明示するのは ledger-absent の1ケースのみ(`{ present: false, reason: "ledger-absent" }`)なので、"present あり" と "ledger はあるが直近解決以降の人間行為なし" の2ケースを判別ユニオンとして補完する(refine — 呼出し元 `humanActedSinceGate` が真偽値へ落とす前段として、拒否理由を型で持たせておくことで将来の監査記録・エラーメッセージ改善が型安全になる):

```ts
type PresenceVerdict =
  | { readonly present: true }
  | { readonly present: false; readonly reason: "ledger-absent" | "no-outstanding-human-act" };
```

- `present: false, reason: "ledger-absent"` — `scanPresenceLedger` が `null` を返したケース(D8 是正の対象そのもの)
- `present: false, reason: "no-outstanding-human-act"` — ledger は存在するが、直近の解決(`res` フィールドを持つイベント)以降に人間行為(`human: true` のイベント)がないケース(既存 `humanActOutstanding` の否定側)

## 既存型の参照(再利用のみ、変更なし)

- `PresenceEvent`(`amadeus-lib.ts:3738-3749` 相当の内部型 — `ts`/`shard`/`pos`/`human`/`delegVerb`/`res`/`block`/`shardPath`)は `scanPresenceLedger` の戻り値要素として既存のまま使う。U6 はこの型を拡張しない
- `humanActOutstanding`(`amadeus-lib.ts:3828-3838`)・`resolutionConsumesHuman`(:3819-3821)は既存の判定ロジックとして `resolveGatePresence` の内部から呼ばれる(再実装しない)
- `Swarm Gated Batch Approvals` state フィールド(`SWARM_BATCH_APPROVALS_FIELD`、`amadeus-lib.ts:5196`)・`GATE_APPROVED` 監査イベントは既存のまま — U6 は新しいフィールド・新しいイベント種別を発行しない(R-1 の帰結)

## 本 unit が扱わないもの(スコープ外の明示)

- **`SWARM_BATCH_APPROVALS_FIELD` のスキーマ変更**: presence 検証の追加は既存フィールドの読み書きロジックを変えない。バッチ承認の記録形式(カンマ区切り 1-origin 番号列)はそのまま
- **C5(mode-authority)の `allowsOccurrence` 新意味論**: presence 検証は「人間が動いたかどうか」の検証であり、「その occurrence が人間ゲートに該当するかどうか」の判定基準そのものは U5 の設計対象(U6 は U5 の確定を段依存として待つのみ — unit-of-work-dependency.md)
- **waiting 状態・非対話中断**(C4/U3): presence なし拒否は即時 loud fail(`error()`)であり、C4 の一級 `waiting` 状態への遷移は起こさない。presence 検証の拒否は「人間ゲートに人間がいない」という既存ゲート違反の一種であり、C4 が扱う「裁定不能で理由付き待機に入る」対話/非対話の裁定順序3とは別の失敗モードである

# Domain Entities — unit grant-ceremony

## 本 unit が扱う型(すべて既存 — 新設なし)

```ts
// amadeus-intent-autonomy-production.ts の既存型をそのまま消費(refine しない)
interface AutonomyGrantPreview {
  readonly intentUuid: string;
  readonly principalId: string;
  readonly scope: GrantScope;                          // 既存型、本 unit では不透明に扱う
  readonly policies: readonly DecisionPolicyInput[];    // 既存型
  readonly displayDigest: string;                       // 印字対象(R-2)
  readonly nonAutoDecidedKinds: readonly InteractionKind[];
}
```

## 本 unit が追加する非構造化出力(型ではなく印字契約)

- `preview-autonomy` の stdout 末尾行: 貼り付け可能な文字列 `bun {{HARNESS_DIR}}/tools/amadeus-bolt.ts set-autonomy --mode <mode> --confirmed-display-digest <displayDigest>`。これは新しいデータ型ではなく、既存 `AutonomyGrantPreview.displayDigest` の別表現(shell コマンド文字列)にすぎない — 独立した型を新設しない(体裁のための微小型の乱造を避ける — project.md Code Style)。

## 不変条件

- 印字されるコマンド文字列中の `<displayDigest>` は `result.preview.displayDigest` と常に同一の値から生成される(JSON 出力とコマンド印字が異なる digest を表示することは構造的に起こらない — 単一のソース値を2箇所で使うのみ)。
- `prepareFullGrantCommand`(`amadeus-intent-autonomy-production.ts:608-636`)の `confirmedDisplayDigest !== expectedDisplayDigest` 判定(:617)は本 unit による変更対象外 — 既存不変条件をそのまま維持する。

## 意図的に NOT モデル化するもの

- semi/none モード用の digest 確認機構 — Q3 の確定により本 unit のスコープ外(ADR-2 の grant-less 裁定と整合する既存設計を変更しない)。
- `nonAutoDecidedKinds` の提示様式(RFC Unresolved Q15 が言及する「発効前プレビュー」の詳細)— 本 unit は既存の JSON フィールドとして無改変で出力するのみで、新たな整形・強調表示ロジックは追加しない(印字改善の対象はコマンド文字列の追加のみ)。
- `set-autonomy` 側の新規フラグ・オプション — 既存の `--mode`/`--confirmed-display-digest`/`--policies-file` 以外を追加しない。

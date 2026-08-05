# Functional Design: ドメインエンティティ — U1 tla-evidence-foundation

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は `unit-of-work.md` の U1 定義(C2 IdentityDigest + C4 EvidenceBundle、evidence store の単一書き手)に基づき、`component-methods.md` の C2/C4 公開契約を実装可能な粒度のエンティティ定義へ具体化する。要求根拠は `requirements.md` FR-006/FR-007/NFR-002、設計根拠は `components.md` §C2/§C4 と `functional-design-questions.md` の Q1/Q2 裁定(人間承認 2026-08-04T18:09:58Z)。functional domain modeling スタイル(ブランド型 + スマートコンストラクタ、判別ユニオン Result — `memory/project.md` § Code Style)を適用する。

## エンティティ一覧

| エンティティ | 種別 | 所有 | 責務 |
|---|---|---|---|
| `StableId` | ブランド型 | C2 | FR/NFR/AC/ADR の恒久識別子。文法検証済みであることを型で運ぶ |
| `StableSection` | 値型 | C2 | stable ID + canonical 正規化済み本文の対 |
| `ContentDigest` | ブランド型 | C2 | ID 単位の SHA-256 digest |
| `AggregateDigest` | ブランド型 | C2 | 辞書順 sort 済み (ID, digest) 集合の SHA-256 集約 |
| `IdentityComparison` | 判別ユニオン | C2 | `current` / `stale`(FR-007 staleness の唯一の根拠) |
| `IdentityFailure` | 判別ユニオン | C2 | `duplicate-id` / `unresolvable-id` / `invalid-grammar` |
| `EvidenceKind` | 判別ユニオン tag | C4 | `authoring-bundle` / `terminal-route-receipt`(ADR-7 の 2 kind) |
| `EvidenceParts` | 判別ユニオン | C4 | kind ごとの必須構成 receipt 集合 |
| `EvidenceEnvelope` | 値型 | C4 | store に永続化される 1 evidence の canonical 直列化単位 |
| `BundleDigest` | ブランド型 | C4 | envelope canonical bytes 全体の SHA-256 |
| `EvidenceBundleRef` | 値型 | C4 | `BundleDigest` による content-addressed 参照 |
| `PredecessorRef` | 判別ユニオン | C4 | `root`(系列先頭の明示 marker)/ `bundle`(直前 evidence の digest) |
| `VerifiedBundle` | ブランド型 | C4 | `verify` を通過した証明を型で運ぶ(parse-don't-validate) |
| `BundleFailure` | 判別ユニオン | C4 | `missing-part` / `digest-mismatch` / `identity-mismatch` / `predecessor-broken` / `io-failure`(※) |
| `EvidenceIndex` | 値型 | C4 | `list` / `head` の戻り値。整合 ref 配列 + corrupted 一覧 |
| `CorruptedEntry` | 値型 | C4 | store 内の不整合ファイルの所在と理由 |

※ `io-failure` は `component-methods.md` §C4 の承認済み 4 variant(`missing-part | digest-mismatch | identity-mismatch | predecessor-broken`)への**申告付き追加**である。build/list の実 I/O 境界(書込失敗・走査失敗)は既存 4 variant のどれにも意味的に写像できず、`memory/phases/construction.md` § Error Handling(統合境界のエラーは伝播、サイレント失敗禁止)が typed な表現を要求するため、Functional Design の詳細化として追加する。上流シグネチャの意味論(4 variant の判定条件)は変更しない。

## C2 所有エンティティ

### StableId(ブランド型)

```typescript
type StableId = string & { readonly __brand: "StableId" };
```

- スマートコンストラクタ `StableId.parse(raw: string): Result<StableId, IdentityFailure>` のみが生成経路。
- 受理文法(Q2 裁定 A — 見出し駆動の閉じた文法): `FR-\d{3}` | `NFR-\d{3}` | `AC-\d{3}` | `ADR-\d+`。文法外のトークンは `kind: "invalid-grammar"` で拒否する。
- 文法外 ID(cid 等)は上流(C1/C7)の明示リスト渡しのみ対象で、その場合も同じ `parse` を通す拡張文法エントリとして Functional Design の改訂で追加する(現時点の閉じた文法には含めない — 曖昧な自動収集をしない)。

### StableSection

```typescript
type StableSection = {
  readonly id: StableId;
  readonly canonicalBody: string; // 正規化済み bytes(business-logic-model.md § 正規化アルゴリズム)
};
```

- `extractStableSections` の出力単位。`canonicalBody` は正規化後のみ格納し、生の Markdown を保持しない(無効状態を表現不能にする)。

### ContentDigest / AggregateDigest(ブランド型)

```typescript
type ContentDigest = string & { readonly __brand: "ContentDigest" };   // "sha256:<hex64>"
type AggregateDigest = string & { readonly __brand: "AggregateDigest" }; // "sha256:<hex64>"
```

- 表記は既存 advisory の spec identity 表記(`sha256:<hex>`)と同形に揃える(`services.md` S6/S7 が扱う既存 identity 語彙との整合)。
- スマートコンストラクタは hex64 の形式検証を行い、不正形式を型で拒否する。

### IdentityComparison / IdentityFailure

`component-methods.md` §C2 の定義をそのまま採用する(再定義しない)。`stale` バリアントは記録側と現在側の両 `AggregateDigest` を保持し、FR-007 の「旧 verdict の存在では解除しない」判定の唯一の根拠となる(`unit-of-work-story-map.md` FR-007 行の「比較関数」補助責務)。

## C4 所有エンティティ

### EvidenceParts(判別ユニオン)

```typescript
type EvidenceParts =
  | { readonly kind: "authoring-bundle"; readonly parts: AuthoringBundleParts }
  | { readonly kind: "terminal-route-receipt"; readonly parts: TerminalReceiptParts };

type AuthoringBundleParts = {
  readonly applicability: ReceiptJson;  // 5 点必須(component-methods.md §C4)
  readonly trace: ReceiptJson;
  readonly proof: ReceiptJson;
  readonly review: ReceiptJson;
  readonly approval: ReceiptJson;
};

type TerminalReceiptParts = {
  readonly applicability: ReceiptJson;  // 2 点必須(ADR-7)
  readonly approval: ReceiptJson;
};
```

- `ReceiptJson` は「canonical 直列化可能な JSON 値」のブランド型。receipt 本文の schema(applicability receipt 等)の意味論は U2(C1)/U3(C5)が所有し、U1 は canonical 直列化・digest・格納のみを所有する(`unit-of-work.md` U1 境界: 他 unit は型と CLI 契約経由でのみ利用)。
- 各 parts 型は必須フィールドの欠落を型レベルで表現不能にする — 「missing-part」は read/verify 時のディスク上破損の検出語彙であり、build 時は型が構造的に防ぐ。

### EvidenceEnvelope(store 永続化単位)

```typescript
type EvidenceEnvelope = {
  readonly schema: 1;                          // envelope schema version(ADR-2 可逆性: 増分で吸収)
  readonly subjectIdentity: AggregateDigest;   // この evidence が束ねる identity(FR-007 staleness 対象)
  readonly evidence: EvidenceParts;            // kind + parts の判別ユニオンをそのままネスト —
                                               // kind と parts の相関を型で保証し、無効組合せ
                                               // (kind="authoring-bundle" × TerminalReceiptParts)を表現不能にする
  readonly predecessor: PredecessorRef;
  readonly generatedAt: IsoTimestamp;          // NFR-002。digest 対象に含む(ADR-3)
  readonly generatedBy: string;                // 生成主体(NFR-002)。digest 対象に含む
};
```

- Q1 裁定 A: 1 envelope = 1 canonical JSON ファイル。パスは `specs/tla-evidence/<bundle-digest-hex>.json`(digest がファイル名。`sha256:` プレフィクスはファイル名に含めず hex64 のみ)。
- `BundleDigest` = envelope canonical bytes 全体の SHA-256(`generatedAt`・`generatedBy` を含む全 bytes — ADR-3 の「完全性を冪等再実行より優先」)。
- kind・parts・predecessor は JSON 本文(`evidence` フィールドの判別ユニオンと `predecessor`)で表現し、ディレクトリ構造に意味を持たせない(Q1 裁定 A が kind 別サブディレクトリ案 B を不採用)。

### EvidenceIndex(list / head の戻り値型)

```typescript
type CorruptedEntry = {
  readonly path: RepoPath;                     // 不整合ファイルの store 内パス
  readonly reason: "digest-filename-mismatch" | "unparseable" | "schema-invalid";
};

type EvidenceIndex = {
  readonly refs: ReadonlyArray<EvidenceBundleRef>;   // 整合する envelope の参照(list = 全数 / head = 系列末端のみ)
  readonly corrupted: ReadonlyArray<CorruptedEntry>; // 黙殺しない不整合一覧(BR-U1-22)
};

// C4 公開面(component-methods.md §C4 の build/verify/read への申告付き追加 —
// application-design レビュー iteration 2 FOLLOW-UP「列挙・系列 head 解決の owner 未宣言」への確定回答):
//   list(): Result<EvidenceIndex, BundleFailure>   // 走査自体の I/O 失敗のみ failure(io-failure)
//   head(): Result<EvidenceIndex, BundleFailure>   // list の refs から predecessor 被参照を除いた末端集合
```

- C9(U2)の `evaluate` が受け取る `evidenceIndex: ReadonlyArray<EvidenceBundleRef>` は `EvidenceIndex.refs` をそのまま渡す(`component-methods.md` §C9 の承認済みシグネチャと整合)。`corrupted` が非空の場合の扱いは C9 側の fail-closed 規則(壊れた evidence を肯定的判定の根拠にしない)に従い、呼び手(checkpoint 実行面)が corrupted 非空を HoldFailure 入力として伝える — この結線の確定は U2 の Functional Design へ引き継ぐ。

### PredecessorRef / EvidenceBundleRef / VerifiedBundle

`component-methods.md` §C4 の定義を採用する。追加の確定事項:

- `PredecessorRef.root` は暗黙 null ではなく明示 marker(requirements-analysis レビュー NIT の対応、`requirements.md` NFR-002 の「直前 evidence への参照」)。
- `VerifiedBundle` は `verify` 通過後のみ生成されるブランド型で、`EvidenceEnvelope` + `EvidenceBundleRef` を内包する。C6(U4)の `commit` は `VerifiedBundle` のみを受理する契約であり、未検証 envelope の登録を型で拒否する。

## ライフサイクルと状態遷移

```
[構成 receipt 群]                (U2/U3 が内容生成、C4 は関与しない)
      │ build(parts, predecessor)
      ▼
[一時領域の envelope]            具体位置: specs/tla-evidence/.tmp/<random>.json
      │ canonical 直列化 → digest 確定 → atomic rename
      ▼
[specs/tla-evidence/<digest>.json]   ← 唯一の観測可能状態(部分書込は観測不能)
      │ verify(ref, expectedIdentity)
      ▼
[VerifiedBundle]                 C6(U4)の commit / C9(U2)の hold 判定の根拠
```

- 状態は「未存在」→「最終配置済み」の 2 状態のみ。中間状態(一時領域)は `.tmp/` 配下に隔離し、list/head 走査の対象外とする(business-rules.md BR-U1-08)。
- evidence は immutable。改訂は新 envelope の追加 + predecessor 連鎖であり、既存ファイルの更新・削除は行わない(`services.md` § 整合性と可視化点の 2 層構造の第 1 層)。

## エンティティ間関係

- `StableSection` ─(contentDigest)→ `ContentDigest` ─(aggregateDigest)→ `AggregateDigest` ─(subjectIdentity として)→ `EvidenceEnvelope`
- `EvidenceEnvelope` ─(predecessor)→ 直前 `EvidenceEnvelope`(または root marker)。連鎖は kind 混在可(ADR-7: terminal route receipt も同じ連鎖に参加)
- `EvidenceBundleRef` は `model-map.json`(U4 所有)からの参照先。U1 は参照される側であり model-map に触れない(`components.md` §C4 境界)

## 上流トレーサビリティ

- `unit-of-work.md`(U1 責務・境界)、`unit-of-work-story-map.md`(FR-004/005/006/007/010 の補助責務行)
- `requirements.md`(FR-006、FR-007、NFR-002、NFR-003)
- `components.md` §C2/§C4、`component-methods.md` §C2/§C4、`services.md` §S3/§整合性と可視化点
- `functional-design-questions.md` Q1/Q2(人間承認 2026-08-04T18:09:58Z)

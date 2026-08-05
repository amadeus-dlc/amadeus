# Functional Design: ドメインエンティティ — U2 applicability-hold

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は `unit-of-work.md` の U2 定義(C1 ApplicabilityJudge + C9 AuthoringHoldEvaluator + 既存 engine advisory checkpoint への結線)のエンティティを実装可能な粒度で確定する。要求根拠は `requirements.md` FR-001/FR-003〜FR-005/FR-007、設計根拠は `components.md` §C1/§C9、`component-methods.md` §C1/§C9、ADR-6 改訂(宣言駆動化 — `functional-design-questions.md` Q1 裁定、人間承認 2026-08-04T18:29:01Z)。functional domain modeling スタイル(ブランド型 + Result)を適用する。

## エンティティ一覧

| エンティティ | 種別 | 所有 | 責務 |
|---|---|---|---|
| `ApplicabilityRoute` | 判別ユニオン tag | C1 | `author-new` / `revise-model` / `impl-only` / `non-target` の 4 経路 |
| `ChangeDeclaration` | 値型 | C1 | 変更対象の宣言(stable ID 集合 + 変更種別 + 根拠) |
| `ApplicabilityInput` | 値型 | C1 | 判定入力(identity + 宣言 + model-map 読取結果) |
| `ApplicabilityReceipt` | 値型 | C1 | 判定 receipt(route・理由・判定主体・承認・生成時刻・predecessor) |
| `ApplicabilityFailure` | 判別ユニオン | C1 | `undecidable` / `missing-evidence` / `approval-missing` |
| `HumanApprovalRef` | 値型 | C1 | 実 HUMAN_TURN への provenance 参照 |
| `HoldVerdict` | 判別ユニオン | C9 | `no-hold`(根拠 ref 付き)/ `hold`(理由全数列挙) |
| `HoldReason` | 判別ユニオン | C9 | `no-applicability-receipt` / `authoring-incomplete` / `stale-evidence` |
| `HoldFailure` | 判別ユニオン | C9 | `evidence-unreadable` / `model-map-unreadable` / `corrupted-evidence` |
| `ModelMapSnapshot` | 値型 | C9 | model-map の読取スナップショット(読取専用) |
| `SubjectSeriesKey` | ブランド型 | C1 | 対象 stable ID 集合のみの digest — 内容に依存しない「同一対象系列」の識別子 |
| `AdvisoryDeclaration` | 値型 | U2(宣言 schema) | plugin.json に宣言する advisory 供給エントリ(ADR-6 改訂の宣言駆動結線) |

## C1 所有エンティティ

### ChangeDeclaration

```typescript
type ChangeKind =
  | "new-subject"          // 未知の状態機械/プロトコル/ワークフロー(FR-002 へ接続)
  | "semantic-change"      // 登録済みモデルに関係する意味変更(FR-003)
  | "impl-only"            // 意味不変の実装変更(FR-004)
  | "non-target";          // 形式検証の非対象(FR-005)

type ChangeDeclaration = {
  readonly subjects: ReadonlyArray<StableId>;   // 変更対象の stable ID 集合(U1 の StableId を型で再利用)
  readonly kind: ChangeKind;                    // 宣言された変更種別
  readonly rationale: string;                   // 宣言の根拠(監査可能な自然文)
};
```

- `subjects` が空の宣言は `ApplicabilityFailure { kind: "undecidable" }` — 対象なしの判定は成立しない(`requirements.md` FR-001 の「判定不能は fail-closed」)。
- 宣言はあくまで入力であり、判定表(`business-logic-model.md` §1)が model-map との突き合わせで宣言と実状態の矛盾(例: kind="new-subject" だが subjects が登録モデルの trace 対象と交差)を `undecidable` として拒否する — 宣言の鵜呑みをしない。

### SubjectSeriesKey(系列キー — 申告付き追加)

```typescript
type SubjectSeriesKey = string & { readonly __brand: "SubjectSeriesKey" }; // "sha256:<hex64>"
// 導出: sha256( sorted(subjects の StableId 群) を LF 連結した UTF-8 bytes ) —
// U1 C2 の digest 原始関数(sha256 + 辞書順 sort)を再利用し、内容(canonicalBody)は一切含めない
```

- **導入根拠(§12a iteration 1 BLOCKER-2)**: 内容 digest(`AggregateDigest`)だけでは「同一対象の内容変化 = stale」を選別できない — 内容一致で選別すると stale evidence が選別段で脱落する。系列キー(ID 集合のみ)で「同一対象」を識別し、内容 digest で鮮度を比較する 2 キー分離が FR-007 / AC-006 の成立条件。
- **所有の裁定**: identity「内容」の語彙(StableId・ContentDigest・AggregateDigest)は U1(C2)所有のまま。系列キーは適用判定・hold 評価だけが消費する「判定系列」の語彙であり C1(U2)が所有する — 導出式は C2 の digest 原始関数の再利用に限定し、U1 の schema(EvidenceEnvelope)には手を入れない(系列キーは receipt 本文内に載り、envelope からは parts 経由で読める)。
- `component-methods.md` §C1 の承認済み ApplicabilityReceipt 型への**申告付きフィールド追加**である(下記)。

### ApplicabilityReceipt / ApplicabilityFailure / ApplicabilityInput

`component-methods.md` §C1 の承認済み型を採用する(`route`・`subjectIdentity`・`reason`(判定表の行 ID 併記)・`judgedBy`・`humanApproval`・`generatedAt`・`predecessor`)。追加の確定事項:

- **申告付きフィールド追加**: `subjectSeries: SubjectSeriesKey` を receipt へ追加する(承認済み型への Functional Design 詳細化。根拠は § SubjectSeriesKey — これがないと C9 の stale 選別が構造的に不能)。
- `reason` の行 ID は `business-logic-model.md` §1 判定表の J1〜J6 を参照する(監査者が判定を機械照合できる — `requirements.md` NFR-002)。
- receipt の永続化は C1 が行わず C4(U1)へ渡す(`components.md` §C1 境界、`services.md` §S1)。terminal 2 経路(impl-only / non-target)は U1 の `terminal-route-receipt` kind、author/revise 経路は将来の full authoring bundle の構成 part となる(ADR-7)。
- `predecessor` は U1 の `PredecessorRef` を型で再利用する(系列先頭は root marker)。

### HumanApprovalRef(実 HUMAN_TURN provenance)

```typescript
type HumanApprovalRef = {
  readonly shard: string;           // 承認 HUMAN_TURN が記録された audit shard 名
  readonly timestamp: IsoTimestamp; // HUMAN_TURN イベントの記録時刻
  readonly eventIdentity: string;   // イベントブロックの SHA-256(改竄検出)
};
```

- 既存 engine の advisory 解除 provenance(`amadeus-advisory-choice.ts` の `recordProtectedAdvisoryChoice` が要求する shard 一致 + timestamp + イベント本文 SHA-256 照合)と**同形**にする — U2 実読確認で機械強制を確認済みの既存契約の再利用であり、新しい承認語彙を発明しない(`memory/phases/inception.md` の再利用棚卸し)。
- 検証(参照先 HUMAN_TURN の実在照合)は receipt 消費側(C9 / C6)ではなく receipt 生成時に C1 `buildReceipt` が行う — 偽装 provenance の receipt を store に入れない(fail-closed を上流で閉じる)。

## C9 所有エンティティ

### HoldVerdict / HoldReason

`component-methods.md` §C9 の承認済み型を採用する。確定事項:

- **申告付きシグネチャ詳細化**: `evaluate` の第 1 引数群に `currentSeries: SubjectSeriesKey` を追加する(承認済みシグネチャは currentIdentity 起点の 4 引数 — 系列キーなしでは stale 選別が構造的に不能なため、§ SubjectSeriesKey と同根の詳細化として追加。`business-logic-model.md` §3 が正本)。

- `no-hold` の `basis` は U1 の `EvidenceBundleRef` を用いる — content-addressed 参照は authoring-bundle / terminal-route-receipt の**両 kind を同一の型で指す**(application-design レビュー iteration 2 NIT「EvidenceRef 系の名称へ」は、kind 非依存のこの参照型の採用で充足する。別名の新設はせず U1 正本の型を再利用)。
- `hold` の `reasons` は該当理由の全数列挙(`components.md` §C9 hold 判定表の複数行該当時に部分報告しない — NFR-003)。

### HoldFailure

```typescript
type HoldFailure =
  | { readonly kind: "evidence-unreadable"; readonly refs: ReadonlyArray<EvidenceBundleRef> }
  | { readonly kind: "model-map-unreadable"; readonly detail: string }
  | { readonly kind: "corrupted-evidence"; readonly entries: ReadonlyArray<CorruptedEntry> };
```

- `component-methods.md` §C9 の「読取不能・検証失敗の evidence は無視せず HoldFailure」を variant へ具体化。`corrupted-evidence` は U1 `EvidenceIndex.corrupted` が非空の場合の受け皿(U1 FD が U2 へ引き継いだ結線の確定 — `domain-entities.md`(U1)§EvidenceIndex)。
- HoldFailure は hold でも no-hold でもない第 3 の結果であり、checkpoint 面では hold と同じく前進を止める(fail-closed — 壊れた店は「安全」の根拠にならない)。

## 宣言駆動結線(ADR-6 改訂)

### AdvisoryDeclaration(plugin.json 宣言 schema)

```typescript
type AdvisoryDeclaration = {
  readonly code: string;                        // advisory code(例: "authoring-hold")。plugin 内で一意
  readonly checkpoints: ReadonlyArray<string>;  // 発火 checkpoint slug(requirements-analysis / functional-design / build-and-test)
  readonly evaluator: {
    readonly argv: ReadonlyArray<string>;       // hold 評価 CLI(例: ["bun", "plugins/formal-model-check/tools/tla-authoring.ts", "hold", ...])
  };
  readonly formalCheck: {
    readonly argv: ReadonlyArray<string>;       // run-now 選択時の実行 CLI(placeholder: {out} {advisory-instance} 等の予約トークンを engine が置換)
  } | null;                                     // 実行面を持たない advisory は null
};
```

- plugin.json の `advisories: AdvisoryDeclaration[]` として宣言する。engine 側の一般化点は 2 箇所に限定: (1) advisory 供給(`amadeus-plugin-activation.ts` 相当の readiness 評価が宣言の `evaluator.argv` を実行し、typed verdict から advisory を構成)、(2) run-now 実行ルート(`amadeus-advisory-choice.ts` の `formalCheckRoute` 相当が宣言の `formalCheck.argv` から構成)。**checkpoint の発火点・directive 契約・解除規則(HUMAN_TURN provenance 検証)・report 拒否は無変更**(ADR-6 改訂注記の境界)。
- 起動は argv 配列のみで shell 展開を持たない(`memory/project.md` gh-scripts-boundary と同じ起動規律)。
- 宣言の parse 失敗・予約トークン解決失敗は当該 plugin の advisory を「not-ready 相当の hold」へ倒す(無音 skip しない — `business-rules.md` BR-U2-14)。
- 既存 formal-model-check の spec-hash advisory は本宣言面へ移行するか併存するかを **code-generation で既存実装の回帰面(`services.md` S6/S7 無変更契約)を実測してから確定**する — FD 時点では「併存(既存ハードコード経路は不変、宣言経路を追加)」を既定とし、移行は別判断とする(FR-013 の保護境界を優先)。

## ライフサイクル

```
[変更宣言 + 現在 identity(U1 C2)]
      │ C1.judge → 判定表 J1〜J6
      ▼
[ApplicabilityRoute] ─ buildReceipt(approval 検証込み) → [ApplicabilityReceipt]
      │                                                       │ C4.build(U1)へ渡す
      ▼                                                       ▼
terminal 2 経路 → terminal-route-receipt          author/revise → bundle part(C7/U5)
      │
      ▼
[C9.evaluate] ← model-map snapshot + EvidenceIndex.refs(U1)+ 現在系列キー + 現在 identity
      ▼
HoldVerdict(no-hold / hold)または HoldFailure → 既存 §11a checkpoint(engine、無変更)
```

## 上流トレーサビリティ

- `unit-of-work.md`(U2 責務・境界・実装注意)、`unit-of-work-story-map.md`(FR-001/003/004/005/007 主担当行、AC-001〜004/006 実装 unit)
- `requirements.md`(FR-001、FR-003〜FR-005、FR-007、NFR-002、NFR-003)
- `components.md` §C1/§C9、`component-methods.md` §C1/§C9、`services.md` §S1/§S7
- `decisions.md` ADR-6(改訂注記 2026-08-04T18:29:01Z)/ ADR-7、`functional-design-questions.md` Q1 裁定

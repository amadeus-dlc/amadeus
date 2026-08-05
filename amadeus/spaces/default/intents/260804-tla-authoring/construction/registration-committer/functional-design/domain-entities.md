# Functional Design: ドメインエンティティ — U4 registration-committer

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は `unit-of-work.md` の U4 定義(C6 RegistrationCommitter — 前提全数検査と `model-map.json` の atomic replace、可視化点の所有者)のエンティティを確定する。要求根拠は `requirements.md` FR-010/FR-013/AC-008、設計根拠は `components.md` §C6、`component-methods.md` §C6、`services.md` §S3/§整合性と可視化点、schema 裁定は `functional-design-questions.md` Q1(人間承認 2026-08-04T19:08:57Z — v2 据え置き + optional `evidenceBundle` key 追加)。functional domain modeling スタイル(ブランド型 + Result)を適用する。

## エンティティ一覧

| エンティティ | 種別 | 所有 | 責務 |
|---|---|---|---|
| `RegistrationPreconditions` | 値型 | C6 | 6 前提(適用判定・coverage・鮮度・proof・review・人間承認)の束 |
| `ReviewReceipt` | 値型 | C6(消費) | 独立 reviewer のレビュー証跡(FR-009 由来。生成は U5 の stage 手順) |
| `ModelMapEntryDraft` | 値型 | C6 | 登録候補エントリ(evidenceBundle 参照込み、validator 未通過) |
| `EvidenceBundleField` | 値型 | C6 | model-map エントリの新 optional フィールドの形 |
| `ModelMapSnapshot` | 値型 | C6 | draft 構築時に読んだ model-map の読取スナップショット(競合検知の基準) |
| `RegistrationReceipt` | 値型 | C6 | 登録成立の証跡(rename 成功のみが根拠) |
| `RegistrationFailure` | 判別ユニオン | C6 | 前提欠落・stale・競合・validator 拒否・I/O の typed failure |

## C6 所有エンティティ

### RegistrationPreconditions / ReviewReceipt

`component-methods.md` §C6 の承認済み型(applicability / coverage / freshness / proof / review / humanApproval の 6 フィールド)を採用する。追加の確定事項:

- **検証前後のセマンティクス(申告付き詳細化)**: 承認済み型 `RegistrationPreconditions` は非 optional の全フィールド具備型 = **手順 1 を通過した検証済み値**を表す。CLI から渡る入力は未検証の候補 `RegistrationPreconditionsCandidate`(全フィールド optional 相当 — JSON parse 由来)であり、`commit` の手順 1 がこの候補を検査して失敗を全数収集し、通過した場合にのみ承認済み型の値が構成されて後段(手順 2 以降)へ渡る(parse-don't-validate — 「不在」の検査対象は candidate であって承認済み型ではない。§12a iteration 2 FOLLOW-UP の確定回答)。

- `freshness: IdentityComparison` は U1 `compareIdentity` の出力をそのまま受ける(`"current"` 以外は拒否 — FR-007、AC-006)。
- `review: ReviewReceipt` の形: `{ reviewer: string; modelAuthor: string; verdict: "READY"; reviewedAt: IsoTimestamp; artifactDigests: ReadonlyArray<string> }` — verdict は READY のみを表現可能にする(NOT-READY の receipt で登録前提を構成できない — 無効状態の表現不能化)。**`modelAuthor` はレビュー対象モデルの作成主体で、レビュー実施時に U5 の stage 手順(独立レビュー段)が authoring 作業の実行主体名から記入する** — 独立性検査(FR-009)の比較基準を receipt 自体が運ぶ(`pre.applicability.judgedBy` は C1 の適用判定主体であり別概念のため比較に使わない)。C6 は `reviewer !== modelAuthor` を検査し、同名・いずれかが空文字なら `reviewer-not-independent` とする(§12a iteration 1 BLOCKER-1 の確定回答)。
- `humanApproval: HumanApprovalRef` は U2 と同形の実 HUMAN_TURN provenance(shard + timestamp + イベント SHA-256)。C6 は登録直前に provenance の実在を再照合する(receipt 生成時の照合(U2)と独立の第 2 照合 — 登録は不可逆の可視化点のため二重に閉じる)。

### EvidenceBundleField / ModelMapEntryDraft(Q1 裁定の形)

```typescript
type EvidenceBundleField = {
  readonly digest: string;        // "sha256:<hex64>" — U1 EvidenceBundleRef の digest 表記と同形。
                                  // store 内パス(specs/tla-evidence/<hex64>.json)は digest から導出可能
};

type ModelMapEntryDraft = {
  readonly name: string;                                  // TLA module 識別子(既存 MODEL_NAME 文法)
  readonly model: { path: string; identity: string };     // 既存 v2 の asset identity 形(無変更)
  readonly cfg: { path: string; identity: string };
  readonly entries: ReadonlyArray<{ implPath: string; sha256: string }>;
  readonly auxiliaries?: ReadonlyArray<{ path: string; identity: string }>;  // 既存 optional(無変更)
  readonly vocabulary?: { namedInvariants: string[]; traceStateVariables: string[] }; // 既存 optional(無変更)
  readonly evidenceBundle: EvidenceBundleField;           // 新規 optional key(authoring 経由の登録では必須)
};
```

- **Q1 裁定の実装形**: `schemaVersion` は 2 据え置き。validator(`amadeus-formal-verif-model-map.ts`)の `MODEL_KEY_SETS`(:214 — 現行 4 集合)へ `evidenceBundle` を含む optional 集合を追加する。既存 4 集合はそのまま残すため、**既存 2 モデル(`FormalElection` / `MirrorLifecycle`)のエントリと既存 map はバイト不変のまま有効**(FR-013、AC-008)。`exactObject` の意味論(完全一致検査)自体は変更しない。
- 新フィールドは「authoring 工程を経た登録では必須、既存エントリでは不在可」— optional にするのは既存互換のためであり、C6 の `commit` は evidenceBundle なしの draft を受理しない(`business-rules.md` BR-U4-05。既存エントリの管理は本 intent のスコープ外)。

### ModelMapSnapshot / RegistrationReceipt / RegistrationFailure

```typescript
type ModelMapSnapshot = {
  readonly bytes: string;          // draft 構築時に読んだ model-map の生 bytes(競合検知の比較基準)
  readonly parsed: ModelMap;       // 既存 validator を通過した解析結果
};

type RegistrationReceipt = {
  readonly entryName: string;
  readonly bundle: EvidenceBundleField;
  readonly registeredAt: IsoTimestamp;   // 記録であって判定入力ではない(NFR-001)
};

// 前提段(手順 1)の個別失敗 — 全数収集の単位
type PreconditionFailure =
  | { readonly kind: "precondition-missing"; readonly precondition: "applicability-route" | "coverage" | "proof" | "review" }  // human-approval の失敗は常に approval-provenance-invalid へ経路づけられるため判別子に含めない(到達不能値を型から排除)
  | { readonly kind: "stale-evidence"; readonly recorded: string; readonly current: string }
  | { readonly kind: "reviewer-not-independent"; readonly reviewer: string; readonly modelAuthor: string }
  | { readonly kind: "approval-provenance-invalid" };

type RegistrationFailure =
  | { readonly kind: "preconditions-failed"; readonly failures: ReadonlyArray<PreconditionFailure> }  // 手順 1 の全数集約(1 件以上)
  | { readonly kind: "validator-rejected"; readonly detail: string }
  | { readonly kind: "concurrent-modification" }        // retryable — 呼び手が再読込から再試行
  | { readonly kind: "io-failure"; readonly detail: string };
```

- **2 層構造の根拠(§12a iteration 1 BLOCKER-2 の確定回答)**: 前提段(手順 1)は 6 前提を独立に検査して**全数を `PreconditionFailure` のリストへ集約**し、`preconditions-failed` 1 kind で返す — 「全数収集」と判別ユニオンが両立する。後段の `validator-rejected` / `concurrent-modification` / `io-failure` は前提段通過後に逐次到達する単発の失敗であり、単一 kind のままでよい(同時発生しない)。
- `concurrent-modification` は retryable な typed failure(`component-methods.md` §C6 の確定事項 — rename 直前再読込で draft 構築時 snapshot と異なる場合に中止)。他の failure は再試行前に原因解消が必要。
- 失敗はどの variant でも旧 model-map を無傷で残す(FR-010「失敗時は未登録または明示的な失敗状態を維持」)。

## ライフサイクル

```
[6 前提の束(U1/U2/U3/U5 の出力)]
      │ commit(draft, verifiedBundle, preconditions)
      ▼
前提全数検査 → draft へ evidenceBundle 参照を構成 → 拡張 validator で draft を検証(書込前)
      │
      ▼
model-map 再読込 + snapshot.bytes と比較(相違 → concurrent-modification で中止)
      │
      ▼
temp-file へ全 bytes 書込 → atomic rename ← 唯一の可視化点(services.md § 整合性と可視化点の第 2 層)
      │
      ▼
[RegistrationReceipt] → 以後の実行は既存 formal-model-check(S6)の責務 — handoff 完了
```

- C6 は evidence store に書き込まない(書き手は U1 C4 単一 — `components.md` §C4 境界)。`commit` は U1 の `VerifiedBundle`(verify 通過をブランド型で運ぶ)のみを受理し、未検証 bundle の参照を model-map へ書けない。

## 上流トレーサビリティ

- `unit-of-work.md`(U4 責務・境界・実装注意)、`unit-of-work-story-map.md`(FR-010/FR-013 主担当、AC-001 登録拒否面 / AC-008)
- `requirements.md`(FR-010、FR-013、FR-007、FR-009、AC-008、NFR-001〜NFR-003)
- `components.md` §C6、`component-methods.md` §C6、`services.md` §S3/§整合性と可視化点/§スケーリングと運用特性
- `functional-design-questions.md` Q1 裁定(人間承認 2026-08-04T19:08:57Z)

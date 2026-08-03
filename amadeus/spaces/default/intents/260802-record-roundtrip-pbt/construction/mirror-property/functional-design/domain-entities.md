# Domain Entities — unit `mirror-property`(U7・Could)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: **worktree HEAD `c8702be09`**(AD 測定 ref `5a6f79727` との対象パス差分は空)。型定義はすべて `packages/framework/core/tools/` の正本を実読して転記した(decisions.md ADR-1 の import 流儀と同じ面)。

---

## 1. 扱う型(既存 — 本 unit は1つも新設しない)

| 型 | 所在(HEAD 実読) | 本 unit での役割 |
| --- | --- | --- |
| `MirrorStateSnapshot` | `amadeus-mirror-types.ts:201-217` | arbitrary の生成対象。プロパティの主語 |
| `MirrorOperationReceipt` | `amadeus-mirror-types.ts`(`MirrorStateSnapshot:205` の `receipts` 値型) | snapshot 内の主要な入れ子。不変量の大半がここに集中 |
| `MirrorEventIdentity` | `amadeus-mirror-types.ts:35` | receipt の識別。map key の導出元 |
| `MirrorBoundary` | `amadeus-mirror-types.ts:23-33`(6 種の判別ユニオン) | `phase-verified` / `parked` だけが追加フィールドを持つ |
| `MirrorStateParse` | `amadeus-mirror-state-codec.ts:111-117` | 読み結果の判別ユニオン(`ok` / `invalid`) |
| `MirrorBlockRange` | `amadeus-mirror-state-codec.ts:109` | `ok` 時のブロック範囲。本 unit では使わない(splice は既存 `:342` の担当 — business-rules.md BR-MP-7) |

`MirrorStateSnapshot` の実文(`:201-217` から要点のみ転記):

```ts
export type MirrorStateSnapshot = Readonly<{
  revision: number;
  issueNumber: number | null;
  provenance: MirrorProvenance | null;
  receipts: Readonly<Record<string, MirrorOperationReceipt>>;
  warnings: readonly MirrorWarning[];
  repairChallenges: Readonly<Record<string, MirrorRepairChallenge>>;
  expectedPrompt?: MirrorExpectedPrompt;
  auditOutbox?: MirrorAuditOutbox | null;
  projectSync?: MirrorProjectSyncLedger | null;
}>;
```

`:209-211` のコメント実文 `// Optional-with-null: the wire block always serialises \`auditOutbox\` (null in` / `// steady state); a snapshot with the key absent is treated as no outbox, the` / `// same convention as \`expectedPrompt?\`. The codec normalises undefined->null.` が、business-logic-model.md §4 で構造比較を退けた根拠である。

`MirrorBoundary`(`:23-33`)の 6 種: `intent-initialized` / `intent-capture-approved` / `phase-verified`(+ `phase`)/ `parked`(+ `stage`)/ `workflow-completed` / `manual`。いずれも `instance: string` を持つ。

## 2. 正規化と検証の所有

「誰が何を保証するか」を明示する(所有の曖昧さが `parse ∘ serialize` の向きを誤らせる)。

| 関心 | 所有者 | 本 unit の扱い |
| --- | --- | --- |
| ワイヤ形の**正規化**(キー順・optional の省略・undefined→null) | `renderMirrorStateJson`(codec `:1898`)。`renderReceipt`(`:1775`)が optional を「未定義なら出さない」形で組み立て、最後に `JSON.stringify` する(`:1924` 実文 `  return JSON.stringify(root);`) | **正規形の生成器**として使う。等式の両辺をこの関数で正規化する |
| ブロック体裁(sentinel 挟み込み) | `renderMirrorStateBlock`(`:1927`) | プロパティの入力文書を作る唯一の手段(`wrap` は使わない) |
| 構文検証(重複キー・深さ・サイズ・C0 制御文字) | `parseJsonStrict`(`:153`。直上の節ヘッダ `:120` 実文 `// Strict JSON tokenizer: rejects duplicate keys, enforces depth/size bounds,`) | 呼ばない。`parseMirrorStateDocument` 経由でのみ通す |
| 意味検証(キー集合・列挙・相互不変量) | `parseMirrorStateDocument`(`:1666`)配下の `validate*` / `check*` 群 | **棄却規則の唯一の所有者**。テスト側で再実装しない(business-rules.md BR-MP-8) |
| 受理キーの導出 | `mirrorEventKey`(`amadeus-mirror-policy.ts:111-124`) | arbitrary が**呼ぶ**。自前で base64url を組み立てない |
| タイムスタンプ文法 | `mirrorTimestampEpoch`(`amadeus-mirror-timestamp.ts:76`)と `RFC3339_RE`(`:7`) | arbitrary は文法を再実装せず、**構成的に妥当な値だけを作る**(§3 の絞り込み) |

注記(実装時に踏みうる罠): `mirrorEventKey`(`:112-119`)がキーへ畳み込むのは `intentUuid` / `boundary.kind` / `boundary.instance` / `operation` の4要素であり、**`phase-verified` の `phase` と `parked` の `stage` は含まれない**。したがって `phase` だけが異なる2つの receipt は同一 map key に落ち、`Record` 上で後勝ちに潰れる。arbitrary が map を `mirrorEventKey(event)` で構築する限りこれは自然に解消される(生成した receipt 数と map サイズが一致しないことはあるが、妥当性は保たれる)。プロパティ側で「生成数 = map サイズ」を仮定しないこと。

## 3. arbitrary の設計(新規ファイル)

配置: `tests/helpers/arbitraries/mirror-snapshot.ts`。requirements.md **FR-4b** が「arbitrary は `tests/helpers/arbitraries/` へ追加する」と定め、components.md U8 が既存様式(`semver.ts` / `manifest.ts` の隣)を定める。unit-of-work.md の Unit 一覧も本 unit を「AD U7(t274 の property 版+snapshot arbitrary、60〜90)」と定義しており、snapshot arbitrary の新規ファイル追加はその内側である。component-methods.md「U8: arbitrary 群のシグネチャ」が列挙する3ファイル(`election.ts` / `state-receipts.ts` / `state-field.ts`)には触れない(unit-of-work-dependency.md が batch 2 の非交差条件として「helpers 内は別ファイル」と定めるため)。

```ts
// tests/helpers/arbitraries/mirror-snapshot.ts
import fc from "fast-check";
import type { MirrorStateSnapshot } from "../../../packages/framework/core/tools/amadeus-mirror-types.ts";

export const mirrorTimestampArb: fc.Arbitrary<string>;          // 構成的に妥当な RFC 3339
export const mirrorEventArb: fc.Arbitrary<MirrorEventIdentity>; // 6 boundary 種 × 3 operation
export const validMirrorSnapshotArb: fc.Arbitrary<MirrorStateSnapshot>;
```

`semver.ts` 冒頭(`:1-6`)の方針「生成器はパーサの入力境界で止め、ブランド型を直接作らない」との関係: `MirrorStateSnapshot` は**ブランド型ではない**素の `Readonly` 構造体で、スマートコンストラクタを持たない(codec は文字列↔構造体の変換のみを担う)。したがって生成器が構造体を組み立てること自体は同方針に反しない。反するのは「パーサ側の判定を生成器が模倣すること」であり、それは business-rules.md BR-MP-8 で禁じている。

### v1 受理ドメインの絞り込み(規模上限 60〜90 行に収めるため)

components.md U7 の推定規模は **60〜90 行**(内訳見積: arbitrary 40〜55 行 + プロパティ 20〜35 行)。この予算内で意味のある被覆を得るため、v1 は次の範囲に絞る。**非対象は「未被覆」であって「検証済み」ではない。**

| フィールド | 対象 / 非対象 | v1 の生成範囲・理由 |
| --- | --- | --- |
| `revision` | **対象** | `fc.nat({ max: 50 })`。I-1(`isNonNegativeInt` codec `:341`) |
| `receipts` | **対象** | 0〜3 件。key は `mirrorEventKey(event)`(I-2、codec `:931-944`) |
| ├ `event.boundary` | **対象** | 6 種すべて。`phase-verified` は `phase`、`parked` は `stage` を必ず付す(I-10、codec `:632-646`) |
| ├ `event.operation` | **対象** | `create` / `sync` / `close`(codec `:88-92` の `OPERATIONS`) |
| ├ `status` + 時刻/失敗フィールド | **対象** | status を先に引き、それが要求する `attemptedAt` / `completedAt` / `failureClass` / `lastEffect` を**同じ生成ステップで**付ける(I-3〜I-5、codec `:950-957` / `:970-979`)。status ごとの必須集合を分岐で書くのは「妥当値の構築」であり棄却規則の再実装ではない |
| ├ `projectSyncHold` | **対象**(限定) | `pending` のときのみ、確率的に付す(I-6、codec `:980-981`) |
| ├ `projectSyncVerified` | **対象**(限定) | `succeeded` かつ `operation !== "close"` のときのみ `true`(I-7、codec `:982-986` / `:915-929`) |
| ├ `createdRevision` / `projectSyncRevision` | **対象**(限定) | 付す場合は `1 <= createdRevision <= projectSyncRevision <= $.revision` を満たす3値を1回の生成で作る(I-8、codec `:1455-1465` / `:1478-1483`) |
| ├ `authorization` | **非対象** | `receiptRevision` と `createdRevision` の相互一致(codec `:1498-1503`)を含み、v1 の予算を超える。既存 example(t274:127 / `:205`)が担う |
| ├ `createIdentity` | **非対象** | 6 キー(codec `:480-487`)の別ドメイン。既存 example が担う |
| `provenance` / `issueNumber` | **対象**(対で) | 両方 null、または両方実値の2形のみ(I-9、t274:265 の SP-C06)。片側だけの形は生成しない |
| `warnings` | **非対象** | 空配列固定。8 キー(codec `:513-522`)の別ドメイン |
| `repairChallenges` | **非対象** | 空オブジェクト固定 |
| `expectedPrompt` / `auditOutbox` | **非対象** | `undefined` 固定(codec が null へ正規化する経路は P-MR1 の等式が両辺で同じく通るため、被覆の主目的にならない) |
| `projectSync` | **非対象** | `undefined` 固定。ledger は 7 キー(codec `:461-469`)+ 3 状態の別ドメイン |

タイムスタンプ(`mirrorTimestampArb`)は**構成的**に作る: 年 2020〜2030 / 月 1〜12 / 日は月別上限(codec 側の `daysInMonth` `amadeus-mirror-timestamp.ts:22-30` と同じ暦規則が要るため、v1 は **日を 1〜28 に限定**して閏判定を持ち込まない)/ 時 0〜23 / 分・秒 0〜59 / 末尾 `Z` 固定。オフセット付き・小数秒・閏秒(`second === 60`)は v1 非対象と明記する。

### 拡張の入口

非対象欄はいずれも「別の arbitrary を足して `validMirrorSnapshotArb` に合成する」形で後から広げられる。v1 が固定値を置く箇所(`warnings: []` 等)を差し替えるだけで済むよう、生成器は**フィールドごとの小さな arbitrary の合成**として書き、単一の巨大なレコード生成器にしない。

## 4. 型の逐語照合(cross-unit)

本 unit は他 unit が定義する型を参照しない(`Election` / `ElectionFile` / `MirrorBoundaryReceipts` はいずれも別 unit の対象で、本 unit の変更面に現れない)。参照するのは既存の正本型のみであり、上記はすべて `packages/framework/core/tools/` の実読からの転記である。したがって `cross-unit-type-verbatim-check` の照合対象は発生しない。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段6(t274 example-based round-trip の property 一般化)に対応する。
- services.md との関係: 本 unit は S1/S2 に非関与。S2 の深掘り対象は「新規 PBT ファイル群」であり、本 unit が着手された場合はその集合に加わる(未着手なら加わらない — Could)。

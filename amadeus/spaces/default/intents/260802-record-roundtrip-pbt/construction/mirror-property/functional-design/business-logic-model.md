# Business Logic Model — unit `mirror-property`(U7・Could)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: 本書の file:line・行数はすべて **worktree HEAD `c8702be09`** の実読。AD 各書の測定 ref である `5a6f79727` との間で `git diff --stat 5a6f79727..HEAD -- packages/framework/core/tools/ tests/` は**空**(exit 0)であり、components.md / component-methods.md / decisions.md が `5a6f79727` で確定した file:line は本 unit でもそのまま成立する。

---

## 1. 対象境界

components.md「U7: mirror property 化(Could)」が指定する所在をそのまま採る — 変更面は `tests/unit/t274-amadeus-mirror-state-codec.test.ts`(既存ファイルへの追記、HEAD で **363 行**)と `tests/helpers/arbitraries/`(新規 1 ファイル)の2つだけで、プロダクションコードは1行も触らない。requirements.md FR-7a が定める射程(`t274` の render→parse round-trip の property 版+妥当 snapshot の arbitrary)の内側に閉じる。

対象の符号化境界(write⇔read の seam ペア)は `packages/framework/core/tools/amadeus-mirror-state-codec.ts` の次の対である:

| 向き | 関数 | 所在(HEAD 実読) |
| --- | --- | --- |
| 書き(正規化) | `renderMirrorStateJson(snapshot) -> string` | `:1898` |
| 書き(ブロック化) | `renderMirrorStateBlock(snapshot) -> string` | `:1927` 実文 `` return `${MIRROR_STATE_SENTINEL_START}\n${renderMirrorStateJson(snapshot)}\n${MIRROR_STATE_SENTINEL_END}`; `` |
| 読み(検証付き) | `parseMirrorStateDocument(document) -> MirrorStateParse` | `:1666` |

参照面は decisions.md **ADR-1**(「新規 PBT(U2 / U3 / U7)と新規 arbitrary(U8)は `packages/framework/core/tools/` の正本を import する」)に従い core 正本に固定する — 上表の3関数はいずれもその面からの実読である。

読み側は既に fail-closed である(`MirrorStateParse` は `:111-117` の判別ユニオンで、検証失敗は `{ kind: "invalid"; issues }`)。したがって本 unit は **プロダクション改修を伴わない純追加**であり、requirements.md FR-1(election の読み側一本化)のような是正は含まない。

## 2. 処理フロー(ASCII — Mermaid 不使用)

```
  validMirrorSnapshotArb                (新規 arbitrary / tests/helpers/arbitraries/)
          |  生成: 妥当な MirrorStateSnapshot 値
          v
  renderMirrorStateJson  ──►  renderMirrorStateBlock  ──►  document(sentinel 付き文字列)
          |                                                        |
          | 正規形 J0                                              v
          |                                        parseMirrorStateDocument
          |                                                        |
          |                                        kind==="ok" ? ──┴── kind==="invalid" → 即 FAIL
          |                                                |
          |                                                v
          |                                        parsed.snapshot
          |                                                |
          |                                     renderMirrorStateJson
          |                                                |
          +──────────────── 比較(文字列同値)◄────────────+ 正規形 J1
```

判定は 2 点のみ: (i) `parsed.kind === "ok"`、(ii) `J1 === J0`。中間表現の構造比較は行わない(§4 の理由)。

## 3. 状態と不変量 — 「妥当 snapshot」の定義

arbitrary が満たすべき不変量を、コーデックの検証実装から実読で導いた。**テスト側で棄却規則を再実装するのではなく、生成側で不変量を満たす値だけを作る**(round-trip プロパティはメタモルフィックであり、独立オラクルを持たない — requirements.md FR-4a / `cid:build-and-test:pbt-oracle-cancellation` に非抵触)。

| # | 不変量 | 実装上の所在(HEAD 実読) |
| --- | --- | --- |
| I-1 | `revision` は非負の safe integer | `:341` `isNonNegativeInt` |
| I-2 | `receipts` の map key は `mirrorEventKey(event)`(`amadeus-mirror-policy.ts:111`)と一致し、`receipt.key` も同値 | `:931-944` `checkReceiptKey` |
| I-3 | `status` が `attempted` / `pending` / `succeeded` のとき `attemptedAt` 必須 | `:950-952` |
| I-4 | `status` が `succeeded` / `skipped-for-event` / `abandoned` のとき `completedAt` 必須 | `:953-957` |
| I-5 | `status` が `pending` / `safety-blocked` のとき `failureClass` 必須(hold 付き `pending` を除く)、`pending` は `lastEffect` 必須(同上) | `:970-979` |
| I-6 | `projectSyncHold` は `status === "pending"` のときのみ | `:980-981` |
| I-7 | `projectSyncVerified === true` は `status === "succeeded"` かつ `operation !== "close"` のときのみ | `:982-986` / `:915-929` |
| I-8 | `createdRevision` / `projectSyncRevision` は正の safe integer、`$.revision` 以下、`projectSyncRevision >= createdRevision` | `:1455-1465` / `:1478-1483` |
| I-9 | `issueNumber` が非 null なら `provenance` が必要 | t274:265 の example がピンする契約(SP-C06) |
| I-10 | boundary が `phase-verified` なら `phase`、`parked` なら `stage` が必須 | `:632-646` `validateBoundary` |
| I-11 | タイムスタンプは RFC 3339 の厳密文法(暦・時計のロールオーバーも棄却) | `amadeus-mirror-timestamp.ts:7` の `RFC3339_RE` と `:53-61` `validTimestampParts` |
| I-12 | 深さ・バイト長は `MIRROR_CODEC_LIMITS`(`:47-53`、`maxDepth: 16` ほか)の内側 | `:47` |

I-2 について: 生成器が `mirrorEventKey` を**呼ぶ**ことは検証規則の再実装ではない — 正本関数そのものを使って妥当値を組み立てているだけである。もし生成器が base64url 符号化を自前で書けばそれは相殺リスクになるが、本設計はそれを禁ずる(business-rules.md BR-MP-5)。

## 4. プロパティ P-MR1(round-trip)

```
// property: for all s in validMirrorSnapshotArb,
//   const j0 = renderMirrorStateJson(s);
//   const parsed = parseMirrorStateDocument(renderMirrorStateBlock(s));
//   parsed.kind === "ok" && renderMirrorStateJson(parsed.snapshot) === j0
```

- **等式の形**: `render ∘ parse ∘ render = render`。すなわち **render を正規形とする「正規化後の同値」**であり、`parse ∘ render = id`(構造同値)ではない。
- **構造同値で張らない理由**(実読に基づく): `MirrorStateSnapshot`(`amadeus-mirror-types.ts:201-217`)は optional-with-null の規約を持ち、`expectedPrompt?`(`:208`)・`auditOutbox?`(`:212`)・`projectSync?`(`:216`)は「キー不在」と `null` を等価に扱う。実際 `EMPTY_MIRROR_STATE`(codec `:1643-1652`)は `expectedPrompt` キーを**持たない**のに、その正規形は `"expectedPrompt":null` を含む(t274:46 の golden 実文がその断面)。`toEqual` 系の構造比較はここで偽の赤になる。
- **既存 example の一般化であること**: t274:58 実文 `  test("round-trip: render -> parse -> equal snapshot", () => {` の判定行は `:68` 実文 `    expect(renderMirrorStateJson(parsed.snapshot)).toBe(renderMirrorStateJson(snapshot));` であり、まさに同じ等式である。P-MR1 は**この example の入力空間を arbitrary へ広げただけ**で、契約の形を変えない(requirements.md FR-7a「`:58` の example-based round-trip の property 版」の直接実装)。
- **オラクル**: なし(メタモルフィック)。本 unit を規定する要件は FR-7a(round-trip property 版+arbitrary のみ)であり、fail-closed 側の非設置は requirements.md Out of scope「mirror / audit のコーデック層の再被覆(既存 t274 等の内側)」が禁じるため — FR-4a の2種書き分け義務は state / election 境界(Must unit)にのみ課される。

## 5. 役割分担 — 重複被覆の禁止(直交2軸)

t274 には既に property が1本ある。HEAD 実読:

- `:341` 実文 `describe("property: arbitrary surrounding bytes round-trip", () => {`
- 生成軸は prefix / suffix の任意テキスト(`:345` 実文 `        fc.stringMatching(/^[a-zA-Z0-9 \n#.-]*$/),` を2つ)と revision(`:347` `        fc.integer({ min: 0, max: 50 }),`)
- 判定は `:357` の `rewritten.startsWith(prefix) && rewritten.endsWith(suffix)` — **ブロック外バイトの保存**のみ

したがって被覆軸は次のとおり直交する。**新旧いずれも相手の軸を振らない**ことを設計制約として固定する:

| property | snapshot 空間 | 周辺バイト空間 | 判定対象 |
| --- | --- | --- | --- |
| 既存 `:342`(外側) | `EMPTY_MIRROR_STATE` + revision のみ(固定に近い) | 任意の非マーカーテキスト | splice 後の prefix/suffix 保存 |
| 新規 P-MR1(内側) | `validMirrorSnapshotArb` 全域 | **空**(prefix = suffix = ""、`renderMirrorStateBlock` 単体) | snapshot 内容の正規形同値 |

P-MR1 が `renderMirrorStateBlock`(`:1927`)を単体で使い、t274 のローカルヘルパ `wrap`(`:39`、既定 prefix `"# state\n\n"` / suffix `"\n\n# end\n"`)を**使わない**のはこの分担のためである。周辺バイトを持ち込むと既存 `:342` と被覆が重なり、しかもランダムテキスト中のマーカー衝突を避けるための skip 分岐(`:352` 実文 `          if (parsed.kind !== "ok") return true; // marker collision in random text: skip`)を新プロパティにも持ち込むことになる — その skip は P-MR1 では**契約違反の見逃し**そのもの(P-MR1 は `kind === "ok"` を要求する)なので、両立させてはならない。

同じ理由で、`describe("codec rejection")`(`:72-313`、example 16 件)が担う棄却契約の property 化は本 unit の射程外とする(business-rules.md BR-MP-7)。

## 6. Could unit としての位置づけ

- unit-of-work.md の Unit 一覧は本 unit を `**mirror-property**(Could)` と明記し、「未実施でも intent 完了(FR-7a)」と定める。requirements.md FR-7a も同文。
- unit-of-work-dependency.md の YAML edge block で本 unit は `depends_on: []`、「並行編成の含意」節では batch 2(state-pbt / scope-ledger と並行)に置かれ、「mirror-property は t274+helpers。helpers 内は別ファイル」として非交差が確定している。本設計はその非交差を壊さない — 触るのは `t274` と新規 helper 1 ファイルのみで、`tests/helpers/arbitraries/` 内の他ファイル(component-methods.md U8 が定める `election.ts` / `state-receipts.ts` / `state-field.ts`)には触れない。
- 着手判断の手続きは business-rules.md BR-MP-1 に置く。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段6(t274 example-based round-trip の property 一般化)に対応する。
- services.md との関係: 本 unit は S1/S2 に非関与。S2 の深掘り対象は「新規 PBT ファイル群」であり、本 unit が着手された場合はその集合に加わる(未着手なら加わらない — Could)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T18:26:05Z
- **Iteration:** 1
- **Scope decision:** none

P-MR1 は t274:68 の一般化として整合、:341 既存 property との直交性・Could 判定・申告4件とも妥当。Minor 1件(FR-4a 誤引用→FR-7a+Out of scope へ差替え是正済み)。GoA 1-2。

### Findings

- [Minor] business-logic-model.md — FR-4a を mirror 境界へ適用するかのような引用(是正: FR-7a+Out of scope 根拠へ差替え済み)

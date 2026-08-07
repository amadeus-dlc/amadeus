# Business Logic Model — landed-report(functional-design)

上流入力(consumes 全数): `unit-of-work` / `unit-of-work-story-map`(スライス順)、`requirements`(FR-1〜FR-5)、`components`(層別)、`component-methods`(契約)、`services`(gh 境界)。型は姉妹成果物 `domain-entities.md` を正本とする。

## 制御フロー(evaluate の改訂 — AD FOLLOW-UP の call-site specify)

現行: 3 verb 共通の `evaluate`(cli.ts:355-381)が `resolveMergeable(gh, options.ref, { fetchRawPrState, sleep })` を **:360-363** で呼ぶ。

改訂後の evaluate(全数列挙 — 制御フロー図の完全性):

```
evaluate(options, seams):
  1. createGhRunner(seams.ghSpawn)            … 既存 :356-358 無変更
  2-4. lifecycle = await resolvePrLifecycle(gh, ref, fetchRawPrState)   … **AD 承認済みの新設名前付き関数**(cli 内)
       resolvePrLifecycle の本体(戻り = 判別 union { kind: "merged"; facts: LandedFacts } | { kind: "active"; first: RawPrState }):
       (2) first = await fetchRawPrState(gh, ref) — 単一事前観測(1回)。gh 失敗 → gh-failure を透過(exit 2 経路)
       (3) state = PrLifecycleState.parse(first.state) — 未知値 throw → 既存 boundary catch(cli.ts:414-415 の parse throw コメント経路 — 実測 verbatim 確認済み)
       (4) state === "MERGED" → { kind: "merged", facts: LandedFacts.parse(first) } / それ以外 → { kind: "active", first }
     lifecycle.kind === "merged":
     → return { verdict: landedVerdict(lifecycle.facts), summary: 空 ledger }
       ※ resolveMergeable 不呼出・sleep 不呼出(AC-2a)・fetchAllReviewThreads 不呼出・latestHumanTurn 不呼出(AC-3b)
  5. lifecycle.kind === "active"(OPEN/CLOSED):
     → resolveMergeable(gh, ref, { fetchRawPrState: primed(lifecycle.first, fetchRawPrState), sleep })
       ※ primed = 初回呼び出しに事前観測値を返し、2回目以降は実 fetch へ委譲する純関数ラッパ
       — resolveMergeable(**predicate.ts**:249-269)のシグネチャ・リトライ意味論は無変更。**conductor 実測**: ループは attempt 0 で sleep なしに `seams.fetchRawPrState` を1回呼び、attempt ≥1 のみ sleep 後に再 fetch(:255-260 実読)— primed の「初回=事前観測値」は呼び出し回数・タイミングを byte 同一に保つ
  6. threads/ledger は既存 :368-373 無変更。**組み立て点(BLOCKER 是正の specify)**: 既存 :374-380 の `const verdict = evaluateConvergence({...})` を `const verdict = labeledVerdict(evaluateConvergence({...}))` に変更 — evaluateConvergence **本体(predicate.ts:180-192)はバイト不変**、変更は cli 側の呼び出し行のラップ1点のみ(domain-entities の EvaluatedVerdict 参照)
```

## verb 別の分岐

| verb | landed 時の挙動 | 既存挙動(非 MERGED) |
|---|---|---|
| status | stdout JSON に `verdict: "landed"`、exit **0**(RA Q1=A) | 無変更(0/1/2) |
| report | landed report を書く(writeReport :384-390 再利用)。audit emit は行わない(landed は裁定を含まない事実記録 — override の emitDecision 経路 :476-497 は不使用) | 非 converged refuse(:438-447)無変更 |
| override | **無変更**(requirements Out of scope「override 経路の変更」に従い、already-landed の refuse 追加はしない — landed が書ける状況での override は運用上不要になるだけで、機構としての防御追加はスコープ外) | 無変更 |

## sensor 検査の対応表(AD FOLLOW-UP — 汎用検査 vs landed 専用規則)

| landed report のフィールド | 検査面 |
|---|---|
| `kind: landed` | kind 閉集合(:66-70 拡張) |
| `pull request` | 既存汎用検査(:73-76 `<repo>#<number>` 形)— landed 専用規則不要 |
| `generated at` | 既存汎用検査(:78-83 parse 可能 timestamp)— 同上 |
| `converged: false` | landed 専用規則 (i): `landed && converged==="true"` → 矛盾 finding |
| `merged at` / `merge commit` | landed 専用規則 (ii): 欠落 → missing finding |
| `check rollup` | 検査しない(informational — Q3=A) |

## 落ちる実証の設計(AC-1b / AC-4b)

- AC-1b: `PrLifecycleState.parse("UNKNOWN_FUTURE_STATE")` が throw することを fixture 固定(t481)。
- AC-4b: renderReport から描画した landed fixture を (a) そのまま → PASS (b) converged を true に改変 → FAILED (c) merged at 行を削除 → FAILED、の3点で両側実測(t450 追補)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T11:19:40Z
- **Iteration:** 1
- **Scope decision:** none

AD FOLLOW-UP 2点の閉包は適切だが、evaluateConvergence 不変性(RA Constraint の中核)について domain-entities と business-rules/logic-model が矛盾(BLOCKER)。AD 承認済み部品名 resolvePrLifecycle の無申告消失(MAJOR)、BR↔AC 対応の欠落2件(MINOR)、新規引用の未検証(FOLLOW-UP)。

### Findings

- BLOCKER | domain-entities.md ConvergenceVerdict 節: evaluateConvergence の戻りへ verdict 付与と記述し :181-185 のみ無変更と限定 — BR-8/logic-model Step 6 の『本体無変更』と矛盾。(a) 外部ラッパで後付けし本体バイト不変、または (b) 明示逸脱申告のどちらかに確定せよ
- BLOCKER | 同上: 組み立て点の specify 欠落(制御フロー全数列挙の自称と矛盾)
- FOLLOW-UP | resolveMergeable 内部の fetch 呼び出しパターン(:249-269)が primed ラッパ前提と整合するか conductor 実測
- FOLLOW-UP | 新規引用 :414-415 / :249-269 / sensor :66-70 :73-76 :78-83 の conductor 裏取り
- NIT | business-rules.md 対応表に AC-1a / AC-3c が不在 — BR への紐付け追加
- BLOCKER | business-logic-model.md: AD 承認済み resolvePrLifecycle が消失し inline 化 — 部品名を復元するか申告付き改訂とせよ(MAJOR 相当を BLOCKER 群へ含めて記録)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T11:22:13Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER 2 + MAJOR 1 はすべて是正され、3成果物が「evaluateConvergence バイト不変・verdict は EvaluatedVerdict ラッパで付与」の単一主張に収斂。NIT/FOLLOW-UP も転記済み。残余 BLOCKER なし。

### Findings

- FOLLOW-UP | landedVerdict が構成する EvaluatedVerdict の各フィールドと predicate.ts 実型の構造一致は tsc --noEmit で機械閉包(実装時)

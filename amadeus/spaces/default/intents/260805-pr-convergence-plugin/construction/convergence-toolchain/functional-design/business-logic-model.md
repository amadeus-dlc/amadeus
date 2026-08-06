# Business Logic Model: convergence-toolchain(U2)

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

フローは unit-of-work の U2 責務(検出+配送、前進判定なし)に閉じ、担当 FR は unit-of-work-story-map の U2 列(FR-3/FR-4/FR-5 CLI 面/FR-7/NFR-2/NFR-3)に対応する。

## 処理フロー(services S2 の CLI 面を関数合成で実現)

### status verb(read-only)

```
createGhRunner()                       — C6: readiness 検査(gh --version / gh auth status)。失敗 → exit 2
  → fetchPrState(gh, prRef)            — C6 経由: mergeable / mergeStateStatus 取得
  → resolveMergeable(gh, prRef)        — C3: UNKNOWN なら interval 注入シームで retry(MAX=5, INTERVAL=10s — ADR-4)。上限到達 → "unknown-exhausted"
  → fetchAllReviewThreads(gh, prRef)   — C4: pageInfo.hasNextPage 全数ページング。gh 失敗 → typed error → exit 2(空台帳を作らない)
  → ReviewThread.parse × N             — parse-don't-validate
  → classifyThread × N → ThreadLedger.build
  → evaluateConvergence(ledger, prState) → ConvergenceVerdict
  → stdout JSON + exit code(0 = converged / 1 = not-converged / 2 = gh 障害)
```

### report verb(record 書込)

```
status と同一の評価列
  → converged なら renderReport({kind:"converged",...}) を <record>/construction/<unit>/code-generation/pr-convergence-report.md へ書込(FR-2b のパス形)
  → not-converged なら書き込まず exit 1+violating 内訳(fail-closed — レポート不在が batch を止める)
```

### override verb(人間裁定の受理 — ADR-3)

```
最新実 HUMAN_TURN の実在検証(audit シャード読取。不在 → 拒否 exit 1)
  → status と同一の評価列(現況の verdict を記録に残すため)
  → verdict.converged === true なら override を拒否し exit 1(「収束済みへの override」は無意味かつ記録を汚す — report verb を案内)
  → renderReport({kind:"override", override:{humanTurnId, reason, recordedAt}, ...}) を書込
  → audit へ override 事実を emit(無音バイパス禁止 — FR-7b)。emit 経路【申告改訂 E-PCP-CGDEV 2026-08-05 2-0】: host の amadeus-log.ts decision verb を外部プロセス spawn(gh と同じ境界 — core import なし)し、override 事実を構造化 decision テキストとして DECISION_RECORDED へ記録。spawn 失敗は override 全体の失敗(loud fail)
```

## classifyThread(C3 — 純関数の決定表)

| isResolved | isOutdated | 非 bot 返信 | ThreadClass |
|---|---|---|---|
| true | — | — | `resolved` |
| false | true | — | `outdated` |
| false | false | あり | `replied-unresolved` |
| false | false | なし | `ignored` |

判定順序は上から(resolved が最優先、outdated が次点)。「非 bot 返信」= `comments` のうち**最初の bot コメント(`authorTypename === "Bot"` の最小 index)より後**の要素に `authorTypename !== "Bot"` が存在すること。境界の全定義: (a) thread に bot コメントが 1 件も無い場合、その thread は本プラグインの収束対象外(人間同士のスレッド)として台帳の `humanOnly` 区分へ分離し、violating に数えない — 収束述語(FR-3b)の分母は bot 起点スレッドのみ(Issue #1971 の述語「非 bot 返信ゼロ+unresolved」の対象が bot 指摘であることによる) (b) 先頭が非 bot で途中に bot コメントがある場合は、最初の bot コメント以降を判定窓とする。この境界は fixture(先頭非 bot ケース・bot 不在ケース)でテスト固定する(BR-U2-2 の排他全被覆は bot 起点スレッド4区分+humanOnly 分離で成立)。

## evaluateConvergence(C3 — FR-3b の単一定義)

```
converged = (count(replied-unresolved) === 0)
          ∧ (count(ignored) === 0)
          ∧ (mergeStateStatus === "CLEAN")
          ∧ (mergeableResolution === "resolved")
```

`statusCheckRollup.state` は使わない(必須/非必須を区別しないため — FR-3b)。

## エラー分類(error-classification 準拠)

| 異常 | 分類 | 挙動 |
|---|---|---|
| gh 不在・未認証 | fault(環境) | exit 2 loud fail → conductor は park 既定(FR-7a) |
| GraphQL 応答の未知様式 | defect 疑い(外部 seam 変化) | parse throw → exit 2(fixture 更新を促す) |
| mergeStateStatus 未知値 | 同上 | throw(fail-closed — ADR-2) |
| UNKNOWN 上限到達 | 正常系の不成立 | verdict "unknown-exhausted" → exit 1 |
| HUMAN_TURN 不在(override) | 認可拒否 | exit 1(記録なしの override を作らない) |

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T08:39:25Z
- **Iteration:** 2
- **Scope decision:** none

BLOCKER 2件は閉包済み、humanOnly分離はFR-3aの空白を埋める整合的な設計判断でREADY。

### Findings

- FOLLOW-UP | business-logic-model.md に unit-of-work / unit-of-work-story-map への本文実参照が無い(冒頭consumes列挙のみ) — domain-entities.md/business-rules.mdは反映済みだが3成果物中1件が未完了
- FOLLOW-UP | domain-entities.md:57 が ThreadComment に terminalRefs フィールドを保持すると記述しているが、直前の ThreadComment 型定義(:34-39)にそのフィールドが無い — 型ブロックへの反映漏れ
- NIT | humanOnly 分離の根拠(Issue #1971 の述語対象が bot 指摘であること)は本レビューの読み取り許可範囲外のため一次資料未照合。次工程で file:line 引用確認を推奨

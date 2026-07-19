# Domain Entities — election-model(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## 判別ユニオン型(functional-domain-modeling-ts — type+コンパニオン、ブランド型+スマートコンストラクタ)

| 型 | 形 | 由来 |
|---|---|---|
| `ElectionKind` | `"clarification" \| "s13" \| "blocker" \| "zero-confirm"`(明確化/§13/ブロッカー/0件確認) | FR-1a の種別4値 |
| `Election` | `{ id: ElectionId; kind; question; choices: Choice[](内部 No 付き・≥2); voters: VoterId[](≥1); deadline方針 }` — `Election.parse` のみが生成(parse-don't-validate) | FR-1a、component-methods C1 |
| `Choice` | `{ internalNo: number; label: string }` — 内部 No は定義順で採番、表示番号は DistributionView 側の写像のみに存在 | FR-1b(No/表示の分離) |
| `DistributionView` | `{ electionId; voter; ordered: Array<{ displayNo; internalNo; label }> }` — **推奨マーカー・先行票・他者回答状況に相当するフィールドを型として持たない**(ADR 委任事項の履行 = FR-1c の構造的保証) | FR-1c、decisions.md 委任 |
| `Ballot` | `OriginalBallot \| AmendBallot` の判別ユニオン(discriminant `kind`)。共通フィールド: `{ electionId; voter; voterKind: "member" \| "subagent"; choiceInternalNo; goa: Goa; reservation?: string; rationale?: string; submittedAt }`。`Ballot.parse` のみが生成 | FR-3a、D-12 |
| `OriginalBallot` | `{ kind: "original"; …共通フィールド }` — 通常票 | FR-3a |
| `AmendBallot` | `{ kind: "amend"; amends: BallotRef; …共通フィールド }` — 明示訂正票(原票と併存 — ADR-5) | ADR-5 |
| `BallotRef` | `{ electionId: ElectionId; voter: VoterId; submittedAt: string }` — 原票の一意参照(reviewer Finding 2 是正で明示定義) | ADR-5 |
| `Goa` | 1〜8 の整数ブランド型 — 数値 parse(文字列入力は Number 変換+整数・範囲検査、verification-numeric-parse) | FR-3a/4a |
| `BallotError` | `"unknown-election" \| "unknown-voter" \| "goa-out-of-range" \| "reservation-missing" \| "parse-failure"`(5クラス — 単票検査)。`"duplicate"` は C2 store 側のエラー語彙(下記注 — U2 FD で定義) | FR-3b |
| `TallyResult` | `established(outcome: "adopted" \| "rejected")` \| `hold(reason: HoldReason)` の判別ユニオン | FR-4b |
| `HoldReason` | `"tie" \| "block" \| "quorum-short" \| "discussion-needed"`(E-ETF-FD Q1=A 裁定 2026-07-19 — norm (iii) の型写像) | FR-4b+norm (iii) |
| `LateBallot` | `{ ballot; lateAt; reexamRequired: boolean(GoA 8 なら true) }` | FR-3d |
| `DefineError` | `"kind-invalid" \| "question-empty" \| "choices-short" \| "voters-empty" \| "parse-failure"` | FR-1a |

## 二重票の所在(AD 契約どおり C2 所有 — reviewer Finding 3 是正)

`Ballot.parse` は単票の構文・意味検査(5クラス)のみを担う。**二重票の reject 判定は AD の割当どおり C2(`Store.appendBallot` — component-methods.md C2 表「二重票は reject — ADR-5」)が所有**し、U1 は型(`AmendBallot`/`BallotRef`)の提供のみ。旧起草の C1 への checkDuplicate 新設案は component-boundary 変更にあたるため撤回(decisions.md の委任4項に含まれない)。amend 票は原票を置換せずタイムライン併存(ADR-5 — 実装・テストは U2 の integration 層)。

## 不変条件

- 内部 No 写像の恒等性: 任意の DistributionView 経由の表示番号入力は internalNo へ一意逆写像(FR-1b 受け入れ)
- 決定性: 同一 `(electionId, voter)` からの shuffleView は常に同一順序(NFR-3、ADR-4)
- Tally の純関数性: 同一票集合→同一 TallyResult(NFR-3)

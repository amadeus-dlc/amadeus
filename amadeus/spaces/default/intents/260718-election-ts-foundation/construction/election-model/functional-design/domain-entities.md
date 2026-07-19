# Domain Entities — election-model(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## 判別ユニオン型(functional-domain-modeling-ts — type+コンパニオン、ブランド型+スマートコンストラクタ)

| 型 | 形 | 由来 |
|---|---|---|
| `ElectionKind` | `"clarification" \| "s13" \| "blocker" \| "zero-confirm"`(明確化/§13/ブロッカー/0件確認) | FR-1a の種別4値 |
| `Election` | `{ id: ElectionId; kind; question; choices: Choice[](内部 No 付き・≥2); voters: VoterId[](≥1); deadline方針 }` — `Election.parse` のみが生成(parse-don't-validate) | FR-1a、component-methods C1 |
| `Choice` | `{ internalNo: number; label: string }` — 内部 No は定義順で採番、表示番号は DistributionView 側の写像のみに存在 | FR-1b(No/表示の分離) |
| `DistributionView` | `{ electionId; voter; ordered: Array<{ displayNo; internalNo; label }> }` — **推奨マーカー・先行票・他者回答状況に相当するフィールドを型として持たない**(ADR 委任事項の履行 = FR-1c の構造的保証) | FR-1c、decisions.md 委任 |
| `Ballot` | `{ electionId; voter; voterKind: "member" \| "subagent"; choiceInternalNo; goa: Goa; reservation?: string; rationale?: string; submittedAt }` — `Ballot.parse` のみが生成 | FR-3a、D-12 |
| `Goa` | 1〜8 の整数ブランド型 — 数値 parse(文字列入力は Number 変換+整数・範囲検査、verification-numeric-parse) | FR-3a/4a |
| `BallotError` | `"unknown-election" \| "unknown-voter" \| "goa-out-of-range" \| "reservation-missing" \| "parse-failure"`(5クラス)+`"duplicate"`(台帳照合 — 下記注) | FR-3b |
| `TallyResult` | `established(outcome: "adopted" \| "rejected")` \| `hold(reason: HoldReason)` の判別ユニオン | FR-4b |
| `HoldReason` | `"tie" \| "block" \| "quorum-short"`【E-ETF-FD Q1 裁定待ち — A 採用時は `"discussion-needed"` を追加】 | FR-4b+norm (iii) |
| `LateBallot` | `{ ballot; lateAt; reexamRequired: boolean(GoA 8 なら true) }` | FR-3d |
| `DefineError` | `"kind-invalid" \| "question-empty" \| "choices-short" \| "voters-empty" \| "parse-failure"` | FR-1a |

## 二重票の所在(FD 精密化 — 逸脱ではない)

`Ballot.parse` は単票の構文・意味検査(5クラス)のみを担い、**二重票(`duplicate`)は台帳照合の純関数 `checkDuplicate(accepted: Ballot[], candidate: Ballot): Result<Ballot, "duplicate">` として C1 に置く**(fs 非依存 — 台帳の実体読取は C2、判定は C1 の純関数)。component-methods C1 表の「概形」に対する検査分担の精密化であり、契約(FR-3b の受理拒否+明示 --amend 再提出 = ADR-5)は不変。amend 票は `{ amends: BallotRef }` を持つ別構築子で受け、原票を置換せずタイムライン併存(ADR-5)。

## 不変条件

- 内部 No 写像の恒等性: 任意の DistributionView 経由の表示番号入力は internalNo へ一意逆写像(FR-1b 受け入れ)
- 決定性: 同一 `(electionId, voter)` からの shuffleView は常に同一順序(NFR-3、ADR-4)
- Tally の純関数性: 同一票集合→同一 TallyResult(NFR-3)

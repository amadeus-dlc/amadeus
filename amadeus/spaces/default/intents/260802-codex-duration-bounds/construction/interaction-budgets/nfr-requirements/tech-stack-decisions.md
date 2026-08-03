# Tech Stack Decisions — interaction-budgets

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## 技術選定

`technology-stack.md` のBun／TypeScript／JSONL auditを維持し、`business-logic-model.md` のC4→C2 reserveInteraction、`business-rules.md` のclosed transition commandを共有coreへ実装する。

| Decision | Selection | Rationale |
|---|---|---|
| Policy | `InteractionBudgetPolicyV1`、Depth別primary＋follow-up＋review | unbounded guidanceをversioned capへ変換 |
| Primary caps | 2/4、5/8、8/12（default/hard） | 既存Depth rangeを有界化し`+`を除去 |
| Follow-up | default=hard 1 batch／stage instance | #1999の最大1ラウンド裁定。複数項目はbatchへ集約 |
| Review | default=hard 2 | 現行reviewer_max_iterationsを正準化 |
| Identity | versioned key material＋C2 opaque ID | renderer／session差でresetしない |
| Persistence | Unit 1 audit＋Unit 2 BudgetSubject | 独自counter storeなし |
| Severity | closed `BLOCKER | FOLLOW-UP | NIT` | 完了条件を反証可能にする |
| Testing | Bun test＋fake renderer／reviewer／effect query | crashと重複をlive modelなしで再現 |
| Distribution | package 7面＋影響self-install 5面 | harness共通semanticsを保証 |
| Answer idempotency | Web Crypto HMAC-SHA-256＋per-intent 256-bit machine-local key | low-entropy回答のoffline推測とscope横断相関を防止 |

数値の測定断面はobserved `6d84d06cb6e0a22626c8227709778215a91bc70f`。primaryは現行Depth rangeの下端／上端、reviewは現行既定2、follow-upは#1999の承認済み1ラウンドから導出し、baseline前の推測値は使わない。

## Rejected Alternatives と Gates

- `ANY ambiguity`、`when in doubt ask`、`8–12+`、無制限follow-upを採用しない。
- 改善可能性、code-judo探索、Minor findingだけでreviewを反復しない。
- Codex専用question gate／review capを作らない。
- prompt guidanceだけでcounterを実装せず、canonical reserve前の表示／dispatchを許さない。

Blocking gateはtypecheck、lint、3 counterの境界/property test、delivery crash matrix、severity／completion contract snapshot、全harness conformance、package/promote driftとする。required-sections／upstream-coverage／answer-evidence sensorを適用する。

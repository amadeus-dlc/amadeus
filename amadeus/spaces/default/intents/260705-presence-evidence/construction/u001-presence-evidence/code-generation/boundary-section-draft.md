# Boundary Section Draft — u001-presence-evidence（260705-presence-evidence）

上流入力: [mockups.md](../../../inception/refined-mockups/mockups.md)、[business-logic-model.md](../functional-design/business-logic-model.md)、[security-design.md](../nfr-design/security-design.md)、[reliability-design.md](../nfr-design/reliability-design.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 位置づけ（非本文プリアンブル。#428 merge 後に本文だけを audit-format.md へ貼り付ける）

本ファイルは record 成果物である。BR-7 により、対象 2 ファイル（`.agents/amadeus/knowledge/amadeus-shared/audit-format.md`、`dev-scripts/data/parity-map.json`）への実書き込みは PR #428 の merge 後にのみ行う。下記「英語本文」節が、merge 後に audit-format.md の末尾説明節群（Format Standards 等の並び）へ追加する独立 H2 節の確定版である。

## FR-2.3 再読了記録（本ステージ実行時点。以前のスナップショットの写経ではない）

以下は、本ドラフト執筆の直前に実施した再読了の記録である。

| 対象 | ファイル | 読了行範囲 | 確認内容 |
|---|---|---|---|
| `verifyDocsOnlyEvidence` | `.agents/amadeus/tools/amadeus-state.ts` | 549–588（関数本体は 558–588） | 検査は (1) `evidence` 文字列の形式チェック（`<DECISION_RECORDED\|GATE_APPROVED> <stage> [detail...]`、eventType が許可集合の要素であること）、(2) `readAllAuditShards` で当該 Intent の audit shard 全体を読み、`**Event**: <eventType>` で始まり `**Stage**: <stage>` が一致するブロックが実在するかの突合、の 2 段のみ。人間起源であることの機械的証明は行っていない（コメント 552–557 行が同じ意図を明記） |
| `GUARD_EXEMPTED` の emit | `.agents/amadeus/tools/amadeus-state.ts` | 905–950（emit 呼び出しは 934–937。§12a review で範囲を再照合し補正） | `verifyStageArtifacts` が `workspace_requires` かつ workspace に作業痕跡がない場合のみ、registry の `docsOnly` 宣言（`declare-docs-only` 経由）の有無を見る。宣言があれば `GUARD_EXEMPTED`（Stage、Evidence フィールド付き）を audit へ記録してから完了を許可し、宣言がなければ従来どおり拒否する。宣言のない自己申告では免除されない |
| `humanActedSinceGate` | `.agents/amadeus/tools/amadeus-lib.ts` | 1437–1498（コメントブロックは 1437 の `// --- Human presence at an approval/interview gate ---` から、関数本体は 1470–1498。§12a review 反復 2 で再照合し補正） | audit shard から `HUMAN_TURN` と gate 解決系イベント（`GATE_APPROVED` / `GATE_REJECTED` / `QUESTION_ANSWERED`）だけを抽出し、`Timestamp` 文字列比較（秒精度の ISO 8601）→ 同秒内は buffer 位置（`pos`）を tiebreak にして時系列順に並べ、直近の解決より後に人間ターンがあるかで判定する。タイムスタンプが秒精度であるため、同秒に複数イベントが起きると `pos` の実行順に依存する（= mockups.md の「same-second timestamp ties」に対応する実装根拠） |

各記載は現行実装と一致することを確認済みである。**mockups.md で確定していた骨子と現行実装の間に不一致は見つからなかった。**

## 英語本文（#428 merge 後に audit-format.md 末尾の説明節群へこの H2 節をそのまま追加する）

```markdown
## Evidence Verification Boundary (docs-only declaration)

- **What is verified**: reference format and existence of the referenced
  `DECISION_RECORDED` / `GATE_APPROVED` event in THIS intent's audit shards.
  `verifyDocsOnlyEvidence` (`tools/amadeus-state.ts`) checks the `--evidence`
  string against the pattern `<DECISION_RECORDED|GATE_APPROVED> <stage>
  [detail...]`, then cross-checks that an audit block for that event type and
  stage actually exists in the intent's audit trail (via
  `readAllAuditShards`) before `declare-docs-only` is allowed to write the
  registry's `docsOnly` exemption.
- **What is deliberately NOT verified**: machine proof that the evidence
  originated from a human. Presence correlation (checking the evidence
  against `HUMAN_TURN` timing) was evaluated and rejected — see "Rejected
  alternatives" below.
- **Defense lines**:
  1. The guard's exemption is always audited: when `verifyStageArtifacts`
     exempts a `workspace_requires` stage because of a `docsOnly`
     declaration, it emits `GUARD_EXEMPTED` with the referenced evidence, in
     the same audit trail as the referenced `DECISION_RECORDED` /
     `GATE_APPROVED` event — so a forged declaration is traceable on audit
     review.
  2. The human-operated PR gate is the final defense: merge is always
     performed by a human (see `team.md`), regardless of what any
     docs-only declaration claims.
  3. Multi-agent operation records an approval transcription only upon
     receipt of a relay-approval fixed phrase (`team.md`, 多体連携の運用) —
     it does not transcribe on peer-consultation replies.
- **Rejected alternatives**:
  - Presence correlation (cross-checking evidence against
    `humanActedSinceGate`-style `HUMAN_TURN` timing): rejected because it is
    a double contract-level cost (a new correlation contract plus an
    extension of the mint discipline to dispatch-receipt time) for limited
    prevention — it can be piggybacked in an environment with frequent
    `HUMAN_TURN` mints, and because audit timestamps have second
    granularity, same-second timestamp ties force window semantics that
    weaken the intended guarantee rather than sharpen it.
  - `GATE_APPROVED`-only evidence (disallowing `DECISION_RECORDED`):
    rejected because it conflicts with the dispatch-transcription operation
    and is a semantic mismatch with how multi-agent approval is recorded.
- The `HUMAN_TURN` mint discipline (#497 decision 8) is unchanged by this
  boundary; presence semantics are not altered.
- Sources: Issue #506; PR #505 Bugbot review (which prompted this
  clarification); `DECISION_RECORDED` requirements-analysis, intent
  260705-presence-evidence, 2026-07-06.
```

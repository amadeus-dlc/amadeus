# Code Generation Plan — fix-2143-phase-boundary-approval(Issue #2143 + #2232)

上流入力: `inception/requirements-analysis/requirements.md`(FR-1〜FR-6 / NFR-1〜4 / C-1〜C-4 / OS-1〜5)。
作業ブランチ: `bolt/2143-phase-boundary-approval`(base = `worktree-sub2` @ `b938898f3`)。

本書は実装**前**に確定する契約である。以下の裁定と slice 表から外れる変更は行わない。

---

## 1. レビュアー FOLLOW-UP の裁定

### 裁定 D-1(FR-5 二重 record の挙動)— 「保存済み receipt を返す冪等」に固定

同一 `--advisory-instance` に対する2回目以降の `record` は、**エラーにせず、保存済み receipt を再掲して exit 0 で返す**。

- 根拠: #2232 の欠陥は「人間の正当な意思表示が無音破棄される」ことである。ここで二重呼出を拒否すると、conductor のリトライ(ネットワーク断・ツール再実行・`next` 再走)が人間に再入力を強いる形へ退行し、同じ欠陥を別の顔で再生産する。冪等なら、conductor は結果を確かめるために安全に再実行できる。
- 明示拒否を採らない理由: 拒否は「未記録」と区別できない stderr を返しうるため、conductor 側で「本当に記録されたのか」を判定するための追加往復が必要になる。冪等は判定を不要にする。
- 出力契約: 1行 JSON。初回は `{"recorded":true,"idempotent":false,...}`、2回目以降は `{"recorded":true,"idempotent":true,...}`。`choice` が保存済みと異なる場合のみ **拒否**(typed error)する — 同一 instance に対する矛盾する意思表示は冪等の対象ではなく競合であり、無音で先勝ちにしてはならない。
- store スキーマは変えない(A-3 維持)。冪等経路は receipts へ**追記しない**。

### 裁定 D-2(FR-3 受け入れ基準への追記)

FR-3 の受け入れ基準に次の一文を加えた形でテストを設計する:

> **初回の有効承認が error 化しない導線**: phase-check artifact が存在する状態から始めた場合、**1回の** `approve` が成功して phase が Verified に遷移すること。artifact 著述後に「もう一度承認し直す」必要が生じないこと(= #2143 が報告した「正当な承認が typed error になる」の逆側の実証)。

これは各境界の positive アームに `expect(r.threw).toBe(false)` + Phase Progress の Verified 検証として組み込む。単に「拒否される」だけをテストして満足しない。

### 裁定 D-3(OQ-1 呼び順の固定)

`await-advisory-choice` の conductor 手順を次の順序で固定する(既存の `advisory-decision` 提示記録は残す):

1. `amadeus-log.ts advisory-decision --stage <stage> --instances <ids>`(DECISION_RECORDED の提示記録)
2. `AskUserQuestion` で `directive.question` / `directive.options` を提示
3. 回答を受けて `amadeus-advisory-choice.ts record --advisory-instance <id> --choice <run-now|defer-with-risk>`
4. `next` を再実行

理由: `record` の受理条件が「DECISION_RECORDED 提示が記録済みであること」なので、提示記録が先行しなければならない。既存の prompt 完全一致 hook 経路は 3 を経ずとも成立するため、後方互換として無変更で残る(FR-5c)。

---

## 2. 触るファイル目録(正本のみ / C-3 遵守)

| # | パス | 変更種別 | FR |
|---|------|---------|-----|
| F1 | `packages/framework/harness/claude/skills/amadeus/SKILL.md` | 節追加 + `await-advisory-choice` 行改訂 | FR-1a/b, FR-5e |
| F2 | `packages/framework/harness/codex/skills/amadeus/SKILL.md` | 同上 | FR-1a/b, FR-5e |
| F3 | `packages/framework/harness/kimi/skills/amadeus/SKILL.md` | 同上 | FR-1a/b, FR-5e |
| F4 | `packages/framework/harness/kiro/skills/amadeus/SKILL.md` | 同上 | FR-1a/b, FR-5e |
| F5 | `packages/framework/harness/kiro-ide/skills/amadeus/SKILL.md` | 同上 | FR-1a/b, FR-5e |
| F6 | `packages/framework/harness/pi/skills/amadeus/SKILL.md` | `await-advisory-choice` 記述のみ改訂(順序節は既存で無変更) | FR-5e |
| F7 | `packages/framework/core/amadeus-common/protocols/stage-protocol.md` | HARD STOP RULE 節へ auto-approve × phase_boundary の順序を追記 | FR-4a |
| F8 | `packages/framework/core/tools/amadeus-advisory-choice.ts` | `recordAdvisoryChoiceDecision` 追加 + CLI に `record` サブコマンド追加 | FR-5a〜d |
| F9 | `tests/unit/t-harness-approval-order-contract.test.ts` | 新設 | FR-2 |
| F10 | `tests/unit/t-phase-check-gate-seam.test.ts` | ケース追加(既存 16 は不変) | FR-3 |
| F11 | `tests/integration/t-advisory-choice-record.test.ts` | 新設 | FR-5 |
| F12 | `tests/fixtures/state-ideation-boundary.md`, `tests/fixtures/state-construction-boundary.md` | 新設 | FR-3b |

**変更しないもの(制約の明示)**:
- `packages/framework/core/tools/amadeus-state.ts` — `verifyPhaseCheckArtifact`(:379-395)と呼出4箇所(C-1)
- `hasMatchingAdvisoryPresentation` / `recordProtectedAdvisoryChoice` / `choiceFromExactPrompt` / mint-presence hook(FR-5c 後方互換)
- codex / kimi の `question-rendering.md` の直接 report 契約(C-2)
- cursor / opencode(commands 形式、承認儀式なし — OS-3)
- `dist/` / `.claude/` 投影 — `bun run build` で再生成(C-3)

---

## 3. TDD slice 表(C-4: 各 slice で Red を実測してから最小実装)

| Slice | seam(検証点) | Red テスト | 最小実装 | FR |
|-------|--------------|-----------|---------|-----|
| **S1** | skill-bearing ハーネス SKILL.md 群の順序契約文言 | F9 新設。`packages/framework/harness/*/` を `readdirSync` で全数走査し、`skills/amadeus/SKILL.md` を持つものだけを対象に(ハーネス名ハードコード禁止 / cursor・opencode は走査条件で自然に除外)、`phase_boundary` + `phase-check-` + 順序語(`before reporting approval` 相当)の共起を検査。**Red 期待: pi 以外の5面が fail** | F1〜F5 に pi 正本と等価な段落を追加 | FR-1a/b, FR-2 |
| **S2** | `approveUnderLock` の phase-boundary 分岐(`amadeus-state.ts:3466-3473`)の production path | F10 にケース追加: (a) Ideation→Inception の approve 両アーム、(b) Construction→Operation の approve 両アーム、(c) FR-3c: canonical 終端(`delivery-planning`)が SKIP された scope で実効終端(`requirements-analysis`)にガードが発火、(d) 非境界 approve では artifact 不在でも通る負の対照。**Red 期待: 新規 fixture 不在で fail → fixture 追加後に (a)(b) の negative アームが Red のまま実装検証** | F12 fixture 新設のみ(guard 本体は C-1 で不変。既存 guard が既に正しく発火することを production path で実証する) | FR-3a/b/c, D-2 |
| **S3** | autonomy `full` の auto-approve × `phase_boundary` | F10 に `autonomy_auto_approve` 相当(人間提示なしで `approve` を呼ぶ)文脈のケース: artifact 不在 → fail-closed 拒否 / 著述後 → 成功 | F7 に順序を追記 | FR-4a/b |
| **S4** | `record` サブコマンドの受理・拒否判定 | F11 新設: 正常記録 / HUMAN_TURN 不在拒否 / pending 不在拒否 / shard 不一致拒否 / 非 grounded 拒否 / 同一 HUMAN_TURN 二重消費拒否 / DECISION_RECORDED 提示なし拒否 / **介在ターン・複数行メッセージがあっても受理**(隣接順序を課さない) / 二重 record 冪等 / choice 矛盾拒否。**Red 期待: `recordAdvisoryChoiceDecision` 未実装で import エラー** | F8 に `recordAdvisoryChoiceDecision` + CLI `record` を追加 | FR-5a〜d, D-1 |
| **S5** | conductor 手順の文言 | F9 に `await-advisory-choice` 行が `record` を名指すことの検査を追加。**Red 期待: 6面すべて fail** | F1〜F6 の当該行を D-3 の順序へ改訂 | FR-5e, D-3 |

各 slice は `bun test <file>` の Red 出力(コマンド・失敗数・代表メッセージ)を `code-summary.md` に実測記録する。

---

## 4. FR-5 `record` の受理判定契約(実装仕様)

```
record --advisory-instance <id> --choice <run-now|defer-with-risk> [--project-dir <path>]
```

`withAuditLock` 下で以下を順に判定する。いずれかで落ちたら理由付き typed error を stderr に出し exit 1(無音 false を返さない = FR-5d)。

| # | 判定 | 拒否理由(stderr) |
|---|------|------------------|
| 1 | store が読める | store parse の reason |
| 2 | `--choice` が `ADVISORY_CHOICE_OPTIONS` のいずれか | `unknown choice: <v>` |
| 3 | 当該 `advisory-instance` の open な pending が存在 | `open advisory instance not found: <id>` |
| 4 | 既存 receipt がある場合 → **D-1 冪等分岐**(choice 一致なら成功終了 / 不一致なら拒否) | `advisory instance already recorded with a different choice` |
| 5 | audit から**直近の real HUMAN_TURN** を解決できる | `no human turn is recorded in the audit trail` |
| 6 | `humanTurn.shard === auditShardName(projectDir)` | `human turn shard mismatch` |
| 7 | `isGroundedHumanTurn` が真 | `human turn is not grounded in the audit trail` |
| 8 | その HUMAN_TURN が既存 receipt に消費されていない | `human turn is already consumed by another advisory receipt` |
| 9 | 当該 pending の `DECISION_RECORDED` 提示が audit に**記録済み**(隣接順序は課さない) | `advisory presentation was never recorded for this instance` |
| 10 | `acceptsFreshChoice` が真(run-now の model-check 未消化を再消費しない) | `advisory instance does not accept a fresh choice` |

- 5 の「直近の real HUMAN_TURN」は `findAllEvents(audit, "HUMAN_TURN").at(-1)` で解決し、`{timestamp, shard, eventIdentity}` を既存 `HumanTurnProvenance` と**同形**で receipt に束縛する(FR-5b)。
- 9 は既存 `hasMatchingAdvisoryPresentation` の「直前の HUMAN_TURN 以降に隣接して提示があること」を、「audit 全体に当該 pending の提示フィールド一致 `DECISION_RECORDED` が1件以上あること」へ緩める。**既存関数は変更せず、新しい述語を別に足す**(prompt 経路の既存テストを不変に保つため = FR-5c)。
- 成功出力(1行 JSON): `{"recorded":true,"idempotent":<bool>,"advisory_instance":"<id>","choice":"<c>","human_turn":{"shard":"...","event_identity":"...","timestamp":"..."}}`

---

## 5. FR-1 追加文言(pi 正本からの移植形)

各ハーネスの `## Execution Quality` 直前、または承認契約を述べている節に、次の趣旨の段落を各面の語彙で置く:

> When a `run-stage` directive carries `directive.phase_boundary`, load the governance companion and write `<record>/verification/phase-check-<phase>.md` **before reporting approval**. The field is computed after scope overrides, so it also covers an early phase exit where the phase's usual final stage was skipped. Never report first and try to repair a rejected transition afterward.

- codex / kimi はこの段落の直後に「この順序は annex の直接 report 契約の**前提条件**であって、それを置き換えない」旨を一文添える(FR-1b / C-2、順序循環の回避)。
- 各面のツールパス(`.claude/` / `.codex/` / `.kimi-code/` / `.kiro/`)はその面の既存記法に合わせる。

## 6. FR-4 追記文言(stage-protocol.md)

HARD STOP RULE 節の `autonomy_auto_approve` の文の直後に:

> When that directive also carries `phase_boundary`, the auto-approve route does not skip the phase-check artifact: the conductor writes `<record>/verification/phase-check-<phase>.md` **before** reporting approval. The state guard is fail-closed and does not know about autonomy, so an auto-approve that reports first is refused, not waived.

---

## 7. 検証(完了条件)

1. `bun run build`(= `bun scripts/package.ts` && `bun run promote:self`)で投影を再生成
2. `bun run typecheck`
3. `bun run lint`
4. 新規・改訂テスト green(S1〜S5 の Red 実測記録付き)
5. `bun run distribution:check`
6. `bun run source-only:check`
7. `bun tests/complexity-gate.ts --check`
8. 必要時 `bun tests/no-silent-drop-gate.ts check --base-revision $(git rev-parse origin/main)`

`amadeus-state.ts` / election 系に触れないため TLA model map は不変の想定(触れた場合のみ `amadeus-sensor-model-completeness.ts updateModelMap --impl-only`)。

## 8. コミット計画(論理単位 / Conventional Commits / 英語)

1. `test(harness): assert every skill-bearing harness states the phase-boundary order` — S1 Red
2. `docs(harness): state the phase-boundary artifact order in every skill-bearing SKILL.md` — S1 Green
3. `test(state): cover the phase-boundary approve gate on all three boundaries` — S2
4. `docs(protocol): require the phase-check artifact before an auto-approved boundary report` — S3
5. `feat(advisory): add a record subcommand that binds a choice to the latest human turn` — S4
6. `docs(harness): route await-advisory-choice through the record subcommand` — S5
7. `chore(dist): regenerate harness projections` — C-3 の投影同期

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T01:58:52Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜FR-6は要件→計画→実装記録まで一貫トレース可能。C-1/C-3/C-4の遵守は内的に裏取り済み。4件のFOLLOW-UPは記録・トレーサビリティ上のギャップでありBLOCKER相当の契約違反ではない。

### Findings

- FOLLOW-UP | code-generation-plan.md S3配置 | FR-4テストが計画のF10追記でなく新規integrationファイルになった配置逸脱がsummaryの逸脱記録に無い
- FOLLOW-UP | NFR-3適用の非対称 | FR-2はintegrationへ移設・FR-3はunit層に残る非対称の説明が成果物内に無い
- FOLLOW-UP | 裁定D-2のpositiveアーム | 1回のapprove成功→Verified遷移のRed→Green実測が明示されていない
- FOLLOW-UP | no-silent-drop-gate exit 2 | base側既存問題の切り分けは妥当だがチェックリスト項目8が未閉包でありconductorエスカレーションが必要

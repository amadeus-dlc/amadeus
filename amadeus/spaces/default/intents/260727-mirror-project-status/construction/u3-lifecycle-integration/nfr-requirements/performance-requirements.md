# Performance Requirements — u3-lifecycle-integration

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

U3 は既存 boundary への配線であり、新しい API 呼び出し面を追加しない。性能規定は「配線が U1/U2 の呼び出し予算を破らないこと」と「completion ゲート評価がオフラインであること」の2点。常駐サービスなし(technology-stack: Bun/TypeScript ESM の CLI)のためレイテンシ SLO は置かない。

## 呼び出し回数予算の維持(requirements NFR-3)

- boundary 別同期(business-logic-model の boundary 別挙動表)は各 boundary で U1/U2 と同一の同期経路を1回実行するのみ — U3 が Project API 呼び出しを追加しない(boundary 種別も新設しない — business-rules BR-U3-7)。
- parked boundary / park 中 manual sync は Status mutation 0 回(business-rules BR-U3-3 — requirements FR-4 受入基準)。mutation 0 はテストで assert。

## completion ゲート評価のコスト(business-rules BR-U3-8)

- `completionProjectGate` は台帳のみを入力とする決定的・オフライン評価 — Project API を直接照会しない。ゲート評価自体の API コストは **0 回**であり、障害・レイテンシの影響を受けない(requirements FR-8 の判定材料は同期時に取得済みの台帳)。

## 実行時間の境界

- gh サブプロセスの deadline/stdout cap は既存 profile を維持(実装直読: amadeus-mirror-runner.ts:29 `single: { deadlineMs: 30_000, stdoutLimitBytes: 1 * MiB }`)。U3 で新しいタイムアウト・throttle を導入しない(requirements NFR-3 後段)。

## 非目標

- レスポンスタイム SLO・スループット目標: N/A(根拠: requirements FR-1b — daemon・polling・GitHub Actions を導入しないチェーン内実行のみ。cid:observability-setup:c3 の N/A 規律)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T09:05:33Z
- **Iteration:** 1
- **Scope decision:** none

実装 file:line・BR/FR 導出は概ね正確だが、consumes 外 domain-entities への無引用断定2箇所と FR-8a/8b 受入条件番号の取り違え1箇所の Major 3件。

### Findings

- [Major] security-requirements.md:18 domain-entities の blocking 列構成を無引用断定(consumes 外)
- [Major] tech-stack-decisions.md:12 expectedProjectStatus シンボルと domain-entities 不変条件を無引用断定(consumes 外)
- [Major] reliability-requirements.md:9 FR-8b へ受入条件7を混入(正: FR-8a=7 / FR-8b=10 — requirements.md:76-77・:129)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T09:09:52Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major 3件は consumes への verbatim 接地に差し替えられ実測で全閉包。新規矛盾なし。

### Findings

- None

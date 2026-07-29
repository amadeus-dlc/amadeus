# Reliability Design — U1: otel-walking-skeleton

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

reliability-requirements.md の耐久性契約・障害隔離・復旧の要件に対する設計。中核は FR-EVT-3/4/5 の失敗契約を構造で強制すること。

## 耐久性契約の設計

- canonical Event は `emitEvent` 完了時点で audit JSONL に同期永続化される。即時 process 終了でも残る（NFR-2）。永続化完了前に emit が return する経路を作らない
- 書込失敗時は AuditLogExporter が同期例外を送出し、かつ FatalLatch を set する。例外送出と latch set のどちらか片方だけの経路を作らない（FR-EVT-3）

## latch による mutation 拒否

- canonical state mutation entrypoint は処理前に `assertMutationAllowed()` を呼ぶガード契約とし、latch set 済みなら例外で拒否する（business-logic-model.md § 状態遷移のガード、FR-EVT-4）
- latch の解除 API は提供しない。中間層が emit 例外を catch しても latch は残ることをテストで固定（VER-3 の「例外を握りつぶす中間層」ケース）
- 新 process は Journal health 検証（非破壊 probe）成功後にのみ mutation を許可する（FR-EVT-5。検証方式の具体は Phase 1 ADR）

## fail-open の設計

- LocalSpanExporter／LocalLogExporter の保存失敗は例外を投げず latch も set せず、即時 return で呼出し側へ成功同様に返る（FR-EVT-6）。失敗の記録は diagnostic 経路に留め、canonical 経路へ波及させない
- Collector・ネットワークへの依存を持たないため、Collector 停止は workflow 結果に影響しない（FR-RLY-3 の前提を U1 側で保つ）

## 復旧と撤回

- 既存 state recovery／doctor が v1 Journal をそのまま読めることを U1 完了条件に含める（現行 reader 維持）
- hard gate 不合格時は代表接続のみの範囲に限定して撤回できるよう、U1 の本番正本への接続は `amadeus-log.ts` の代表 event に留める（AH-4）

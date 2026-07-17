# Unit of Work — eoc1-gate-check

## 上流入力(consumes 全数)

`../application-design/component-methods.md`(述語+配線+テスト設計)、`../requirements-analysis/requirements.md`(FR-1〜5)、`../../ideation/scope-definition/intent-backlog.md`(単一ユニット想定)、`../user-stories/stories.md`(US-1〜3)。

## ユニット定義(単一 — 規模の正当化)

| Unit | 内容 | 推定規模 |
|------|------|---------|
| eoc1-gate-guard | lib 述語(checkQuestionsEvidence ~80行)+state 配線(~10行)+テスト(unit 6ケース+integration 3本)+dist 8コピー同期 | 小(1 Bolt) |

再利用棚卸し(reuse inventory): error()/emitError(既存 fail-closed)、stage 解決 lookup(既存)、既存テストランナー・registry 機構 — 新規機構ゼロ(検査述語1関数のみ新設)。

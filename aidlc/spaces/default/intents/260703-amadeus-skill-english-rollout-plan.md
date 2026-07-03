# インテント：Amadeus skill 英語化実施計画

## 概要

Amadeus skill の `SKILL.md` 英語化を、小さい土台 PR から段階的に進め、全面英語化の完了まで管理する。

GitHub Issue #399 を親タスクとして扱い、#395、#400、#401、#402 の順序、依存関係、完了境界、完了状態に加えて、#391〜#394 の差分対応と RU002〜RU006 の段階的英語化完了を追跡できる状態にする。

## 依存

| 依存 | 理由 |
|---|---|
| 260703-aidlc-v2-full-compliance | 現在の `aidlc/` 構造、`aidlc-state.md`、skill 昇格契約を前提にするため。 |

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | Amadeus skill と Issue 管理の実施計画であり、自己開発の追跡能力を扱うため。 |
| scope | feature | 子 Issue の順序、依存関係、検証方針を追跡できる新しい計画管理能力を作るため。 |
| labels | skill-english, rollout-plan, issue-399 | Amadeus skill 英語化と親 Issue の追跡用。 |

# Intent Capture 質問 — plugin host delivery(Issue #1543)

> 回答方式: ソロモード・ユーザー直接回答(AskUserQuestion、選挙不要 — 人間本人の裁定)。
> 承認: ユーザー直接回答 2026-07-26T13:50:00Z 頃(AskUserQuestion、3問一括)

> 事前整理済みの裁定(intent-capture:c1 に基づき質問から除外 — Issue #1543 本文がユーザー起草の確定裁定):
> - 問題: 上流 v2.3.0 の「インストールするだけで通常ワークフローが拡張される」UX を追従できていない(neutral-only packaging、compose 到達不能、`--single` 必須 UX、適合テスト不在)
> - 対象: 6ハーネス全数(Claude Code / Codex / Cursor / Kiro CLI / Kiro IDE / OpenCode)の能力マトリクスと配布→trigger→compose→compile 経路。silent skip 禁止、非対応は明示 degrade 契約
> - 実装方針: ハーネス中立正本からの投影、ホストフックは既存 atomic compose engine を呼ぶ(弱い合成の重複実装禁止)、compose 後自動再コンパイル、additive contribution、冪等、doctor/drop、既存安全契約(atomic/trust/drift/no-clobber)維持
> - 適合テスト: 上流ケースID・期待挙動・Amadeus テストの対応表 + Packaging/Composition/Lifecycle/Harness matrix の4面自動検証。native hook の実起動必須(verification theatre 禁止)
> - 非目標: プラグイン独自 scope、`adds.scopes`/`adds.requires_stage`、`when:` 一般評価エンジン、agents/memory/knowledge 投影、lockfile(別 Issue)
> - スコープ: `amadeus-feature`(project.md Scope Overrides 既決)

## Q1. epic(#1543)の進め方 — 本 intent の守備範囲は?

Issue #1543 は epic ラベル(複数の子 Issue を束ねる親)が付いている。本 intent でどこまで扱うか。

- A. 本 intent で受け入れ条件全体を1つのワークフローとして扱う — Units/Bolt 分割は units-generation / delivery-planning に委ね、子 Issue 分割はしない
- B. 本 intent は「能力マトリクス+設計+activation policy 承認」までとし、ハーネス別実装・適合テストは裁定後に子 Issue+後続 intent へ分割する
- C. まず ideation/inception を回し、units-generation の Unit 構成を見てから子 Issue 分割の要否をユーザーへ再諮問する
- X. その他(自由記述)

[Answer]: X(ユーザー直接回答 2026-07-26T13:50Z 頃 — 「Intent First なんだから Issue #1543 は気にしなくてよい。Intent が作られたら破棄してよい(Intent Mirror が gh にできるため)。小分けにせず全体を 1 intent とする。複雑なタスクは Unit を使えばよい」— 子 Issue 分割なし、Units/Bolt 分割は units-generation / delivery-planning に委ねる)

## Q2. ミラー Issue の扱いは?

intent-first ノルムではミラー Issue を新規起票するが、本 intent は既存の #1543 を起点とする。

- A. #1543 をそのままミラー Issue として紐付ける(record → #1543 の一方向同期、状態行更新・完了時クローズは epic 全体の着地に従う)
- B. #1543 は親 epic として温存し、本 intent 用のミラー Issue を別途起票する
- C. ミラー同期は行わず、#1543 へは節目に手動コメントのみ
- X. その他

[Answer]: X(ユーザー直接回答 2026-07-26T13:50Z 頃 — 「コメントしたとおり」= Q1 裁定に従い、本 intent の Intent Mirror を新規作成し、#1543 は intent 成立後に破棄(クローズ)してよい。ミラーは record → Issue の一方向同期)

## Q3. `formal-model-check` activation policy の裁定タイミングは?

Issue は「決定的な activation policy を別途設計・承認する」と規定。どの段階で裁定するか。

- A. application-design ステージで代替案比較(ADR)を作り、その承認ゲートで裁定する — 本 intent 内で完結
- B. いま方向性だけ先に決める(例: インストール済み+並行プロトコル spec 変更の検出時のみ activate 等)。設計ステージは方向性の具体化に専念
- C. activation policy は本 intent から切り出し、別 intent で扱う
- X. その他

[Answer]: A(ユーザー直接回答 2026-07-26T13:50Z 頃 — 「コメントしたとおり」= 本 intent 内で完結。application-design で代替案比較(ADR)を作り、その承認ゲートで裁定する)

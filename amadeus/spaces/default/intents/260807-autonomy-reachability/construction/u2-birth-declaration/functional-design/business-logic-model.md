# Business Logic Model — u2-birth-declaration

上流入力(consumes 全数): requirements.md(FR-1a〜1d)、components.md(C1)、component-methods.md(契約方向)、unit-of-work.md(境界)、unit-of-work-story-map.md(1コマンド物語)、services.md(engine 主導直列 — conductor 判断を挟まない)。

## フロー: birth 同時宣言(ADR-1 Option A)

```
/amadeus --scope <name> --autonomy semi "<説明>"(または既知 scope の bare positional / --new-intent 確定済み)
  → C13: takeAutonomyFlag(argv 抽出 — 不変)
  → 分岐選択が birth print directive(Branch 7b :3151-3168 / 9a :3223-3237 / 4a)に到達
      → emit 点で carry 確定: intent-birth コマンド行に --autonomy semi を付与
  → conductor が directive どおり実行(run-then-continue — 判断なし)
  → intent-birth:
      1. 既存: intent 生成・state 初期化
      2. 新設: --autonomy <none|semi> → applyProductionAutonomyMode(canonical、u1)
         — audit transaction + state 3フィールド(u1 の canonical 化に依存)
         — provenance = 宣言打鍵の HUMAN_TURN(latestHumanTurnId)
      2'. --autonomy full → 適用せず、birth 成立+儀式手順(preview → 確認 → set-autonomy full)を
          印字して fail-closed 停止(責務は intent-birth 側で一意 — ADR-1)
      3. 適用失敗時: birth は成立済み・mode は none のまま loud error
         (再宣言 = 次の next --autonomy で回復可能 — first-declaration ラッチは
          適用失敗時に消費されない)
  → 次の next: 最初のステージ directive が intent_autonomy_mode を搬送(e2e 固定点)

/amadeus --autonomy semi "<scope 未確定の自由記述>"
  → 分岐選択が Branch 8(ask — scope 確認)に到達
  → 宣言は loud 拒否+案内: 「--scope を明示するか、birth 後に --autonomy で宣言」
     (ask は返さず error directive — 無音消失なし。ユーザー裁定 2026-08-07 FR-1a 精密化)
```

テキストfallback: birth に到達する呼び出し形でのみ carry が確定し、ask に落ちる形は案内つき loud 拒否。semi/none は birth 直後に canonical 適用、full は birth 成立+儀式待ち停止。適用失敗は mode 未設定のまま loud で宣言し直しで回復。

## テスト契約の明示改訂(FR-1c)

| テスト | 現行ピン | 改訂後 |
|---|---|---|
| `t450-branch:83`("without a state file the flag is refused") | state 不在 → 拒否 | state 不在+birth 非到達(記述なし/Branch 8 ask 経路)→ 拒否(前者は文言維持・後者は案内つき新文言)/ birth 到達形(--scope 明示・既知 scope・--new-intent 確定)→ carry の新ケース追加 |
| `t450-apply:95`("H0: no active intent is loud") | 同上(純関数) | 同上の分岐追加(H0a: birth 非到達 loud / H0b: birth 到達形 carry) |
| **新規: Branch 8 消失検出** | — | ask 経路で --autonomy が error directive(案内文言)になり、ask directive に化けない・無音で落ちないことを固定(Review iteration 1 NIT 是正) |
| `t450-branch:119`(provenance 要求) | **不変** | 不変(フラグは provenance にならない) |
| `t449` 全部 | **不変** | 不変(argv 抽出は変わらない) |

改訂の赤/緑記録: builder が (a) 改訂前×修正後 (b) 改訂後×修正後 (c) 改訂後×修正前 の対角を code-summary に記録(requirements Constraints の実施責任どおり)。

## e2e(FR-1d)

新規 intent の実 CLI 連鎖: `next --new-intent --autonomy semi "<説明>"` → birth print → intent-birth 実行 → `next` → 最初の run-stage directive の `intent_autonomy_mode === "semi"` を assert(integration、実 FS)。

## エラー分類

- 値域外・値なし = 呼び出し欠陥 → loud(既存)
- 適用失敗(u1 canonical のエラー)= 回復可能 → loud+再宣言可能(ラッチ非消費)
- birth 失敗 = 既存の birth エラー様式(宣言は未消化)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T15:37:46Z
- **Iteration:** 1
- **Scope decision:** none

実コード照合で BLOCKER 2: (1) scope 未確定 freeform は Branch 8(ask)へ落ち宣言の搬送手段が未設計 — 無音消失の回帰パス (2) full の実装責務が ADR-1/component-methods(intent-birth 側)と FD(C13 側)で正反対に矛盾

### Findings

- BLOCKER | domain-entities.md:11, business-logic-model.md:9-10 — carry-to-birth 条件が実分岐(birth print は 7b/9a/4a のみ、freeform 未知 scope は Branch 8 の ask へ)と不整合 — ask 経路での宣言消失は t450-branch:83 の不変条件違反。ask 経路の扱いの設計が必要
- BLOCKER | domain-entities.md:22 vs decisions.md ADR-1/component-methods C1 — full の処理主体(intent-birth が preview 指示を print するか、intent-birth は値域エラーで C13 側か)が正反対 — 一意化が必要
- NIT | business-logic-model.md:28-37 — Branch 8 経路の宣言消失検出ケースがテスト契約表に欠落

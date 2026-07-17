# Integration Test Instructions — answer-tag-vocab-fix(Issue #1127)

> 上流入力(consumes 全数): `../answer-tag-vocab-fix/code-generation/code-generation-plan.md`(検証列・統制)、`../answer-tag-vocab-fix/code-generation/code-summary.md`(出荷物・実測)。測定 ref: bolt head 66f8c885b(PR #1153、origin/main a4a33e59a 起点)。2026-07-17。

## 追加テスト(3本 — 消費者2面ピン)

- `tests/integration/t-eoc1-gate-evidence.test.ts`: **#1127 trigger 形**(HTML コメント内指示行+承認プレースホルダ+空欄実答 → `pass:answer-blank`)+blockquote 裸トークン反例(→ `no-answer-tag`)
- `tests/integration/t-answer-evidence-sensor.test.ts`: sensor seam 側の同 trigger(→ pass)

実行: `bun test tests/integration/t-eoc1-gate-evidence.test.ts tests/integration/t-answer-evidence-sensor.test.ts` → 39 tests / 0 fail(実測)

## 落ちる実証(実施済み・1セット非コミット)

pre-fix dist への一時 checkout で新規テスト **2 fail** を実測 → 復元 → 全 green(code-summary 参照)。e1 レビューが起票時 fixture の verbatim 再適用で偽赤閉包を独立実証(fix-review-replays-origin-repro)。

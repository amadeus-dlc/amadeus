# Business Rules — u2-birth-declaration

上流入力(consumes 全数): requirements.md(FR-1 の規則化)、components.md(C1 境界)、component-methods.md(契約)、unit-of-work.md(境界)、unit-of-work-story-map.md(物語保証)、services.md(直列フロー契約)。

## 規則

- **BR-U2-1(carry の条件)**: carry は「同一 `next` 呼び出しが birth print directive の emit に到達する」場合のみ、emit 点で確定する(Branch 7b/9a/4a)。Branch 8(ask)へ落ちる呼び出し形では**案内つき loud 拒否**(ユーザー裁定 2026-08-07 — 無音消失なし、確認フロー搬送機構は作らない)
- **BR-U2-2(provenance 不変)**: フラグ自体を provenance にしない。適用の provenance は実 HUMAN_TURN(t450-branch:119 のピン維持)
- **BR-U2-3(full の fail-closed・責務一意)**: `--autonomy full` は intent-birth が受理し、mode 未適用のまま birth を成立させ、儀式手順(preview → 明示確認 → set-autonomy full)を印字して停止。grant 儀式(FR-GRT-006)を一切バイパスしない。処理主体は intent-birth 側で一意(ADR-1 と同一)
- **BR-U2-4(部分適用なし)**: birth 失敗時は宣言未消化。適用失敗時は mode 未設定のまま loud エラーで、first-declaration ラッチを消費しない(再宣言で回復)
- **BR-U2-5(テスト契約の明示改訂)**: t450×2 の該当ケースのみ改訂し、t449 全部と t450-branch:119 は不変。対角実測(改訂後×修正前 = 赤)を code-summary に記録
- **BR-U2-6(適用は canonical 経由)**: intent-birth は state を直書きせず u1 の `applyProductionAutonomyMode` を呼ぶ(書込1箇所原則 — BR-U1-1 の遵守側)
- **BR-U2-7(e2e 固定)**: 「1コマンド → 最初のステージ directive が mode を搬送」を integration e2e で固定(完了条件1 の実測固定)

## 受け入れ基準への写像

| BR | FR | 検証形 |
|---|---|---|
| BR-U2-1/3 | FR-1a/1b | unit(judgment 純関数)+integration(CLI 分岐) |
| BR-U2-2 | FR-1a(provenance) | 既存 t450-branch:119 の green 維持 |
| BR-U2-4 | FR-1b/1d | failure injection(birth 失敗・適用失敗の2点) |
| BR-U2-5 | FR-1c | 対角実測の記録(builder → reviewer 検証) |
| BR-U2-6 | FR-2c 整合 | 書込点 grep(1箇所)テスト(u1 と共有) |
| BR-U2-7 | FR-1d | integration e2e |

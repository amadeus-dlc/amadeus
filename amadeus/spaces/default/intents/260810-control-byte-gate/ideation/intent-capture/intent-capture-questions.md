# Intent Capture — 明確化質問

> **E-OC1 選挙不要判定(0問様式)**: 本 intent の入力は (1) Issue #2814 本文(完了条件・対象範囲・代替案却下理由まで逐語確定) (2) クロスレビュー2件(reviewer-1 / reviewer-2、いずれも CONFIRMED_WITH_REFINEMENTS、収束 ESTABLISHED_WITH_REFINEMENTS) (3) ユーザー起動指示(scope=self-feature・autonomy=full・レビュー訂正 (a)〜(f) を要件段一次入力とする指定)の3点で事前裁定済みであり、intent-capture 段で人間裁定を要する未決事項は 0 件と判定する(執行クラス — 一次証拠からの一意導出、cid:requirements-analysis:c1-xrev-verdict-not-ruling-authority / cid:intent-capture:c1)。
> ユーザー承認: 2026-08-10T08:32:03Z(起動指示の実 HUMAN_TURN、audit seq 19)

## 質問一覧(0問)

質問なし。設計判断を要する下記の事項は、Issue 本文とクロスレビューが該当ステージへの送付を明示しているため、intent-capture では問わず後続ステージの正本入力として固定する:

- ゲートの実装形態(sensor / test / CI script)— reviewer-1「未確定」明記 → 設計段
- `tests/` を対象に含めた場合の落ちる実証 fixture との自己衝突の解消方式 — reviewer-2「設計時に決めてください」 → 設計段
- `docs/` を含める場合の `scripts/detect-ci-changes.sh` 分岐追加 — reviewer-2 指摘 → 要件段で完了条件へ昇格
- 対象範囲とタイトル「tracked ソース」の齟齬解消(`amadeus/` の扱い)— reviewer-1 訂正提案 6 → 要件段

## 裁定の記録

- 判定: 0問(選挙不要 — 執行クラス)。根拠種別: 権威ある一次証拠(Issue #2814 本文 + クロスレビュー2件 + ユーザー起動指示)からの機械的適用。
- ユーザー承認: 2026-08-10T08:32:03Z(起動指示ターン、HUMAN_TURN audit seq 19。autonomy full グラント intent-grant-a62c587cfa45e9316dc381840bdf7745 発行済み)

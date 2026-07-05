# Requirements Analysis 質問（260705-jump-phase-guard）

対象 Issue: [#481](https://github.com/amadeus-dlc/amadeus/issues/481)

Maintainer の包括委任（sub 経由の割り当て、agmsg 2026-07-05T08:08:49Z）に基づき、推奨案で自己回答する。

---

## Q1. backward jump の扱いは？

A. phase 境界イベントを emit せず、Phase Progress を巻き戻さない（Issue 記載の推奨方針）
B. Verified を巻き戻す
X. Other (please specify)

[Answer]: A（sub 指示: Issue 記載の推奨方針を採用で構わない、と明示あり。台帳は追記型のため）

## Q2. forward jump で「実行済みステージの無い phase」を閉じる/跨ぐ場合は？

A. PHASE_VERIFIED ではなく PHASE_SKIPPED を emit し、Phase Progress を Skipped にする（state.md「phase 遷移」の既存規定と一致。phase-check も要求しない）
B. 一律 PHASE_VERIFIED + phase-check 要求
X. Other (please specify)

[Answer]: A（state.md の文書化済み契約「scope が phase 内の全ステージを SKIP にする場合…PHASE_SKIPPED を記録して Skipped にする」に合わせる。B は空の phase に phase-check を要求することになり成立しない）

# Intent Capture — 質問票

Stage: intent-capture (ideation)
Depth: Standard（目安 5-8 問）
Context: 親 Issue #1672（設計レビュー済み）、Phase 1 #1678（walking skeleton、hard gate）。設計の技術的内容は確定済みのため、ここではビジネスフレーミング（問題・顧客・成功指標・トリガー）を確認する。

## 判定と根拠（E-OC1 3段順序）

- Q1: 選挙不要 — ソロ運用。ユーザー本人が AskUserQuestion で直接回答（HUMAN_TURN 実測）
- Q2: 選挙不要 — 同上
- Q3: 選挙不要 — 同上
- Q4: 選挙不要 — 同上（自由記述回答をそのまま採用）
- Q5: 選挙不要 — 同上。会話内でユーザーが既に明示した方針の確認
- Q6: 選挙不要 — 同上。#1678 の hard gate 方針の確認
- leader 承認: ユーザー本人の直接回答をもって承認済み 2026-07-29T05:45:39Z

---

## Q1. この取り組みが解決する問題は何か？

現行方式（#1628: audit Journal と独自 timing buffer から Projector が OTLP Span を事後生成）のどの限界が、最も解くべき問題か。

- A. 因果関係の不正確さ — async 処理・並行 Bolt・subagent・複数 clone/worktree の親子関係を時刻包含で推測しており、正確に表現できない
- B. 語彙の乖離と発行漏れ — TypeScript ロジックのイベント語彙と OTel Signal が別系統で、下流 Projection の欠落・ずれが起きうる
- C. Context の分断 — TypeScript 内部で OTel Context を使わないため、実行時に親子・相関が確定しない
- D. 上記すべてが同等の問題（#1672 の背景記述どおり）
- E. 問題は別にある（次の質問で特定する）
- X. Other (please specify)

[Answer]: D. すべて同等の問題（#1672 の背景記述どおり）

## Q2. 顧客は誰で、どんな痛みを抱えているか？

- A. Amadeus を使う開発チーム — ワークフロー実行の因果が追えず、障害解析・並行 Bolt のデバッグが困難
- B. Amadeus 自体の開発者（この repo の保守者）— audit 基盤と observability の二重系統の保守コストと語彙 drift
- C. 両方 — 利用者には可観測性の欠落、保守者には基盤の二重保守が痛み
- D. 外部の AI-DLC 利用者（harness 配布先）— Collector 依存なく OTLP 相関を得たい
- E. 特定の社内ステークホルダーがいる
- X. Other (please specify)

[Answer]: C. 両方 — 利用者には可観測性の欠落、保守者には基盤の二重保守が痛み

## Q3. 成功はどう測るか？（測定可能な指標）

#1672 の完了条件は設計上のもの。ビジネス／運用上の成功指標として最も重視するものを選ぶ。

- A. 因果の正確性 — 並行 Bolt・subagent・子 process を含む実行で、trace の親子関係が推測なしに 100% 実行時確定する
- B. 基盤の単一化 — イベント発行 API が OTel API ファミリーのみ（appendAuditEntry 直接 call site ゼロ）になり、語彙 drift が drift guard で CI 拒否される
- C. 耐性の維持 — 短命 process が network flush を必要とせず、Collector 停止中でも workflow 結果が変わらない（現行の強みを失わない）
- D. A-C すべて（#1672 完了条件どおり、すべて必須）
- E. 別の指標を置く
- X. Other (please specify)

[Answer]: D. A-C すべて（#1672 完了条件どおり、すべて必須）

## Q4. トリガーは何か？（なぜ今やるのか）

- A. 技術的負債の解消 — #1628 の Projector 方式の推測ロジックが保守限界に近い
- B. 並行実行の拡大 — Bolt swarm・subagent 利用が増え、時刻包含による推測の誤りが実害になり始めた
- C. 観測性の戦略投資 — OTel 標準語彙へ寄せて外部 backend との統合価値を高めたい
- D. A と B の複合
- E. 別のトリガーがある
- X. Other (please specify)

[Answer]: X. Other — 本来の意味での可観測性を獲得すること。現行は半分しか達成できていないため、その是正

## Q5. スコープの単位は適切か？

6 Phase（#1673-#1678）を 1 Intent で回し、並行化は Unit/Bolt で行う方針（会話で合意済み）で確定してよいか。

- A. 確定 — 1 Intent（amadeus-feature、18 ステージ）で全 6 Phase を扱い、Phase 内 module 分割を Unit/Bolt で並行実装する
- B. Phase 1（#1678 walking skeleton）だけをこの Intent で扱い、合格後に後続 Phase を別 Intent にする
- C. その他の分割単位にする
- X. Other (please specify)

[Answer]: A. 確定 — 1 Intent（amadeus-feature、18 ステージ）で全 6 Phase を扱い、Phase 内 module 分割を Unit/Bolt で並行実装する

## Q6. hard gate の扱いは適切か？

Phase 1 が不合格（Provider／Logs API／Bun Context／同期 I/O／bundle のいずれかが許容不能）の場合の撤回方針。

- A. 確定 — 不合格なら本番正本へ変更を波及させず撤回し、#1628 方式へ戻す。恒久 dual upstream へ妥協しない（#1678 どおり）
- B. 不合格時は部分採用（例: Trace API だけ先行）を検討する
- C. 不合格の判定基準そのものを再議論する
- X. Other (please specify)

[Answer]: A. 確定 — 不合格なら本番正本へ変更を波及させず撤回し、#1628 方式へ戻す。恒久 dual upstream へ妥協しない

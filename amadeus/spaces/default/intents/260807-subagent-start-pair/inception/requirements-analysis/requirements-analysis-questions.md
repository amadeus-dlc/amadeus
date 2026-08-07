# Requirements Analysis 質問記録

上流入力(consumes 全数): business-overview、architecture、code-structure

## 対話モード

- 選択: 自律モード full（intent-grant-cb0b65b381d407d45943784ba517851b、HUMAN_TURN 2026-08-07T13:41:58Z（RE 承認+full 設定確認）で承認）— 質問は decide-question（auto-decision 記録、後日レビュー可能）で確定
- 質問予算: 最大8問（Minimal depth）/ 起草4問（クロスレビュー4 verdict と RE が残置した真の未決のみ）
- 既決事項は質問化しない: 両欠陥の実在・機序・重畳関係・matcher 修正不要・kimi 短絡保全の必要性 — いずれも4 verdict と codekb で確定済み

## 質問と裁定

### Q1. #2297 修正方式（dispatcher スロット vs 直接パス）

RE 実測: live は 11 エントリ 100% dispatcher 形。dispatcher HOOK_PATHS は10スロットで、example との差分2件（log-subagent-start / plugin-compose）= live 欠落2件と完全一致。ensureCompleteHookTree は部分欠 throw（スロット追加は対応 hook ファイルの build 生成とセット — 両ファイルとも正本・self-install 面に実在確認済み）。

- A. dispatcher へ `log-subagent-start` スロットを追加し、live は既存11件と同じ dispatcher 形で PreToolUse{^Task$} を配線 — live の形式統一を保ち、再発防止ガードが「example の hook 集合 ⊆ dispatcher スロット集合」の単一述語で閉じる
- B. live に example と同じ直接パス形で配線 — dispatcher 無改変だが live に形式混在が生じ、包含ガードが2項述語になる
- X. Other

[Answer]: A — auto-decision-a163dcf12cc068d29610f7550c82e46e（basis: agent-recommendation、grant intent-grant-cb0b65b381d407d45943784ba517851b、reviewState: unreviewed）。根拠: live の形式統一（100% dispatcher 形）の維持が P5 surgical と整合し、包含ガードが単一述語で閉じる。スロット追加の制約（対応 hook ファイルの build 生成）は実在確認済みで充足。

### Q2. 同根欠落 plugin-compose（SessionStart）の扱い

RE 実測: live 欠落は #2297 本文（PreToolUse のみ）より1件広い。包含ガードを入れると plugin-compose 欠落も検出して赤くなる。同梱は #2297 スコープの拡大（grant prohibitedEffects: scope-out — 本 intent では不可、ユーザー専権）。

- A. 同梱しない。plugin-compose 欠落は Issue-first で新規起票し、本 intent の包含ガードは既知欠落を **Issue 番号参照付きの暫定 allowlist**（1件・理由必須・fail-closed の新規欠落検出は有効のまま）で容認する。allowlist の解消条件は当該 Issue のクローズ
- B. ガード自体を PreToolUse 1件の存在検査に絞る（包含述語を導入しない — 再発防止が弱い）
- X. Other

[Answer]: A — auto-decision-c8fb1f3b9b4757f19ea25070813945ee（basis: agent-recommendation、reviewState: unreviewed）。根拠: 同梱は grant の scope-out 禁止に抵触（ユーザー専権）。same-root-inventory の Issue 化経路が scope 内の正規形。Issue 参照付き・理由必須・新規欠落検出有効の暫定 allowlist は no-silent-drop の grant 様式と同型で検証劇場に当たらない。

### Q3. #2303 修正候補（C1 単数置換 / C2 両語彙受理 / C3 拒否リスト）

RE 材料: C2 は t189 の既存前例と整合し既存15ピン緑のまま + 後方互換（旧版が Task を送っても受理）だが、**「Agent を受理する」新テストなしでは偽 green**（corpus-sweep 両側実測が必須）。C1 は15箇所全改訂 + 旧版 Claude Code の後方非互換が未実測。C3 は phantom emit リスク大。

- A. C2: 集合定数 `SUBAGENT_DISPATCH_TOOLS = ["Task", "Agent"]` へ型変更し includes 判定。**受け入れ基準に「tool_name:"Agent" でフィールド返却」「"Task" でも返却（後方互換）」「TaskUpdate/Write で null」の3面 pin を必須化**（偽 green 封じ）。coverage-registry の unitId 同期を含む
- B. C1: 定数を "Agent" 単数へ置換、15ピン全改訂
- C. C3: 拒否リスト化
- X. Other

[Answer]: A — auto-decision-0dc58b0aaf45de56e40edf8e66b428bd（basis: agent-recommendation、reviewState: unreviewed）。根拠: t189 の既存前例と整合し後方互換を保つ。偽 green リスクは「Agent 受理の新規 pin 必須」の AC 化（corpus-sweep 両側実測）で封じる。C1 の後方非互換は未実測（external-seam-vocab-measurement 違反リスク）、C3 は phantom emit リスク大。

### Q4. 閉包検証の形

RE 実測: Unit B は t-log-subagent-start の taskDispatch を live 語彙へ切替えれば SUBAGENT_STARTED 1行の emit を決定的に実証可能。Unit A の live 配線はテストが settings.json を読まないため**テスト内では構造的に閉包不能** — drift ガード（正規化包含）が担う。真の end-to-end（実セッションの dispatch → 監査行）はテスト外。

- A. Unit B = t-log-subagent-start に "Agent" ケースを追加して emit 1行を実証 + Unit A = 新規 drift ガードテスト（正本 example を ground truth、(event, matcher, hook script 名) の3つ組正規化で live との包含を検査、落ちる実証必須）。end-to-end live 観測は B&T verdict の未検証面として明示し（verdict-names-unverified-facets）、マージ後の実セッションで SUBAGENT_STARTED 出現を人間が確認する申し送りとする。修正後に audit 全数 census を再実行し新規 emit の経路正当性を確認（例外5件の機序未解明への防御）
- B. drift ガードは導入せず手動確認のみ（再発防止なし — #2297 完了条件2に反する）
- X. Other

[Answer]: A — auto-decision-adae9a62589cf4829d66b66a1e689c5c（basis: agent-recommendation、reviewState: unreviewed）。根拠: emit 1行の実証が元欠陥への貫通（fix-review-replays-origin-repro）。live 配線の構造的閉包不能は verdict の未検証面として明示（verdict-names-unverified-facets）。ガードの落ちる実証は Mandated。census 再実測は例外5件未解明への防御。

## 完全性確認

- 空の回答タグ: なし（4問すべて auto-decision 記録付きで確定）
- 未解決の Requirements 判断: なし

## 裁定の記録

- 経路: intent autonomy full の decide-question 正規経路（cid:requirements-analysis:c1-pcp-autonomy-grant-question-boundary）
- grant: intent-grant-cb0b65b381d407d45943784ba517851b — full グラント承認: 2026-08-07T13:41:58Z の実 HUMAN_TURN（RE 承認+full 設定確認、set-autonomy INTENT_AUTONOMY_TRANSACTION_COMMITTED）
- Q1 = auto-decision-a163dcf12cc068d29610f7550c82e46e / Q2 = auto-decision-c8fb1f3b9b4757f19ea25070813945ee / Q3 = auto-decision-0dc58b0aaf45de56e40edf8e66b428bd / Q4 = auto-decision-adae9a62589cf4829d66b66a1e689c5c（いずれも reviewState: unreviewed — list-auto-decisions / review-auto-decision で後日人間レビュー可能）

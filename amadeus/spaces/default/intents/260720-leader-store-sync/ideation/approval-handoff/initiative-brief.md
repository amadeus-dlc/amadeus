# Initiative Brief — 260720-leader-store-sync(#1281)

上流入力(consumes 全数): intent-statement.md(問題・成功指標)、feasibility-assessment.md(GO+方式実現可能性順)、scope-document.md(Must 5/Won't 6・境界1基準)、constraint-register.md(C-1〜C-8)、raid-log.md(R-1〜R-3)、intent-backlog.md(risk-first B-1〜B-4)

## 提案骨子

leader 所有物(選挙 store・監査シャード・norm 差分)の main 同期を構造化する。intent-statement.md の実測(51本中40本・531ファイル滞留)を再発させないため、scope-document.md の Must(方式裁定従属)を inception の分析へ引き渡す。

## 承認対象(このゲートで確約する資源)

Inception の分析工程(RE 差分リフレッシュ+requirements の方式選挙+設計)のみ。Construction の staffing・schedule は Units/依存確定後の delivery-planning で承認する(approval-handoff:c3 — 未確定の named mob・schedule を捏造しない)。

## SKIP された上流の扱い(approval-handoff:c4)

market-research / team-formation / rough-mockups は compiled scope で SKIP。存在しない競合分析・チーム評価・wireframe は補完せず、代わりの内部証拠: feasibility の内部 seam 実測5点(c1)+#1280 の是正実績(実運用の対照)+クロスレビュー見立て(e1/e2)。UI 不在につき mockup 系は CLI 出力契約として design 段で扱う(ui-less-mockups-as-output-contract)。

## リスクと緩和(raid-log 参照)

R-1(境界誤判定)= 決定的述語+落ちる実証 / R-2(PR 巨大化)= 同期契機の requirements 確定 / R-3(並行交差)= B-4 の着手前目録確認。緩和が弱い場合の代替: 方式 A(ノルムのみ)への縮退が常に可能(feasibility の実現可能性順)。

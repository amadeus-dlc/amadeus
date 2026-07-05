# Scope Definition 質問（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md)

範囲の骨子（①台帳整備 → ②手動 sync → ③hook 結線、④は後続）は確定済みである。
残る確認は out-of-scope の明示、優先度、台帳変更の承認タイミングの 3 点である。

---

## Q1. 次をすべて out-of-scope として確定してよいですか？（select all that apply = out にするもの）

A. ④ GitHub Actions による merge 後の整合回復（後続 Intent）
B. statusline への同期遅延表示（必要になったら後続）
C. 双方向 sync（board 側の編集をローカルへ反映すること。鏡は一方向を維持）
D. amadeus 以外の workspace / 他 repo の Intent の掲載（当面 default space のみ）
X. Other (please specify)

[Answer]: A, B, C, D（すべて out-of-scope として確定）

## Q2. MoSCoW の整理はこれでよいですか？

Must = カードと列表示、カードフィールド（担当、ホスト、worktree、scope、Issue）、Issue/PR リンク、鮮度表示、冪等 sync、hook 結線。
Should = completed の auto-archive 設定。
Won't（暫定機構のため）= 確認時間短縮の計測、通知系、統計、リトライ戦略の作り込み。

A. この整理でよい
B. 修正したい（Other で指定）
X. Other (please specify)

[Answer]: A

## Q3. 段階 ①（intents.json への issues フィールド追加）の Maintainer 承認はいつ行いますか？

A. 今この場で承認する（構造: 各 entry に任意フィールド `issues: [<番号>...]` を追加。無い場合は空扱い。既存の読み手には影響しない追加的変更）
B. requirements-analysis で要求として明文化した上で、そのゲートで承認する
X. Other (please specify)

[Answer]: A（今この場で承認。各 entry に任意フィールド issues: [<番号>...] を追加する。無い場合は空扱い）

# Code Summary — fix-1749-phase-check-name

上流入力(consumes 全数): requirements.md(当該 FR の充足対照)。functional-design 系は self-fix の SKIP により設計どおり不在。

## 結果
- PR: https://github.com/amadeus-dlc/amadeus/pull/1776 — **マージ済み**、#1749 クローズ(着地確認済み)。
- 正本1行+docs 2面是正、dist/self-install 再生成同期。t368(完全テンプレート `verification/phase-check-<phase>.md` 検証へ強化済み)2 pass、落ちる実証(正本旧文 checkout → 0/2 → 復元 2/2)。検証 exit 全 0。residual 3件は記録面(project.md 既決 cid+intent 履歴)で除外スコープどおり。

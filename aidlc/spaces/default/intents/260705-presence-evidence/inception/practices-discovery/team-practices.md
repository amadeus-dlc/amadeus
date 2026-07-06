# Team Practices：Presence Evidence（260705-presence-evidence）

上流入力: [initiative-brief.md](../../ideation/approval-handoff/initiative-brief.md)

## プラクティス

| 領域 | プラクティス | 出典 |
|---|---|---|
| presence 規律 | HUMAN_TURN は中継承認定型文の受信直後だけ mint（ピア回答では mint しない） | team.md 多体連携の運用、#497 確定判断 8、Corrections（cid:reverse-engineering:c1） |
| エンジン変更 | エンジンツール修正時は parity-map の engineFileExceptions 宣言 + skills/ 正準ソース同期 | Corrections（cid:code-generation:c3） |
| TDD | 先に失敗する検証 → 失敗確認 → 最小実装。中断時は遡及 RED 検証 | dev-scripts.md、Corrections（cid:code-generation:c6） |
| eval 素材 | eval の試験材料は merge 済みの固定 record を隔離 workspace へコピーして使う | Corrections（cid:code-generation:c7） |
| 検証入口 | 標準検証は npm run test:all | project.md |

## 本 Intent への適用

- 候補 1 採用時のエンジン変更（amadeus-state.ts）は parity-map 例外 + skills 同期 + TDD が必須。eval の audit fixture は固定 record（例: 260705-steering-learnings）から作る。
- 不採用時の文書化も、既存文書（audit-format.md 等）の見出し・語彙に合わせる（生成前チェック）。

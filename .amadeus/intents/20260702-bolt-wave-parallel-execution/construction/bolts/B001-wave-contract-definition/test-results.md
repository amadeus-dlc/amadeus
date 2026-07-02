# テスト結果

## 検証結果

| 種別 | コマンドまたは確認 | 結果 | 証拠 |
|---|---|---|---|
| 契約定義 | `skills/amadeus-construction/SKILL.md` の `内部プロセス` 直後に `Bolt の wave 実行` を追加し、BR001〜BR007 の規則（導出、適用条件、直列既定、worktree 分離、統合と検証、まとめ承認、state 非追加）を反映 | pass | SKILL.md の差分（2026-07-02） |
| 昇格同期 | `bun run dev-scripts/promote-skill.ts amadeus-construction --replace` と `npm run test:it:promote-skill` | pass | 実行結果（2026-07-02、promote: ok、eval: ok） |
| 標準検証 | `npm run test:all`（`test:e2e:construction:*` の mock eval を含む） | pass | exit code 0（2026-07-02） |

## 安全性確認

| 観点 | 結果 | 根拠 |
|---|---|---|
| 入力 | 問題なし | skill 文書の契約追加であり、新しい入力面を追加しない。 |
| 権限 | 問題なし | アクセス制御や権限の変更を含まない。 |
| 秘密情報 | 問題なし | 秘密情報や個人情報を扱わない。 |
| 破壊的変更 | 問題なし | 新見出しの追加のみで、内部プロセスの順序、Task Generation Gate、既存の見出しと本文を変更しない（INV002）。`npm run test:all` で非破壊を確認した。 |

## CI確認

| 入口 | 結果 | 根拠 |
|---|---|---|
| GitHub Actions（mock）、Cursor Bugbot | 未実行 | PR 未作成のため。PR 作成後に確認し、結果は pr.md と PR 説明から追跡する。 |

## 受け入れ証拠

| 要求 | タスク | 証拠 | 要約 |
|---|---|---|---|
| R001 | B001/T001 | SKILL.md の `Bolt の wave 実行`（導出規則、決定論、循環時の扱い） | wave 導出の契約が skill から読める。 |
| R002 | B001/T001 | 同（worktree 分離、統合と検証、進行条件、policy 一般形参照） | wave 単位の実行と統合と検証の手順が skill から読める。 |
| R003 | B001/T001 | 同（まとめ承認、Bolt ごとの Gate 契約と記録の維持） | まとめ承認の運用が skill から読める。 |
| R004 | B001/T001, B001/T002 | 同（適用条件と直列既定、INV002）、promote 同期、`test:all` pass | 直列実行の既定が維持され、既存契約と検証に矛盾しない。 |

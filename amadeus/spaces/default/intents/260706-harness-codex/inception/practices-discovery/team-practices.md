# Team Practices — 260706-harness-codex（Issue #552）

## 上流入力

codekb 6 docs（基準 9dd93f50）を入力にした: [code-structure.md](../../../../codekb/amadeus/code-structure.md)、[technology-stack.md](../../../../codekb/amadeus/technology-stack.md)、[dependencies.md](../../../../codekb/amadeus/dependencies.md)、[code-quality-assessment.md](../../../../codekb/amadeus/code-quality-assessment.md)、[architecture.md](../../../../codekb/amadeus/architecture.md)、[business-overview.md](../../../../codekb/amadeus/business-overview.md)。

## プラクティス

| 領域 | プラクティス | 出典 |
|---|---|---|
| skill 昇格 | `skills/amadeus-*` → `.agents/skills/` の同期は `dev-scripts/promote-skill.ts` のみ（手動 cp / rsync 禁止）。昇格後は `npm run test:it:promote-skill` | `.agents/rules/amadeus-artifacts-and-examples.md` |
| 上流取り込み | 純正性検証（#541）= fresh clone + provenance 照合。適応差分は parity-map へ宣言 | 前例 #428、#553。ディスパッチ指示 4 |
| rename 契約 | aidlc-* → amadeus-*、/aidlc → /amadeus、.aidlc-* → .amadeus-*（#553 で確立、rename-leftovers eval が旧名残存を検出） | PR #553、`dev-scripts/evals/rename-leftovers/` |
| スクリプト実装 | 新規は Bun + TypeScript、TDD（先に失敗する検証）。本 Intent は新規スクリプトなし見込み（設計確定 Q3 = tooling 不変） | `.agents/rules/dev-scripts.md` |
| 検証 | 標準検証 `npm run test:all`（typecheck / lints / contracts / parity / wiring / evals / engine-e2e / diff）+ validator（Intent 指定込み） | `package.json`、team.md |
| ブランチ / PR | ロール名 prefix（`eng4/`）、PR は Issue と Intent をリンクし日本語。CI 先行、全コメント対応（pr-gate-discipline.md）、merge は人間 | team.md、`.agents/amadeus/knowledge/amadeus-shared/pr-gate-discipline.md`（#534 = 当方の前 Intent） |
| 多体連携 | 技術確認はピア協議（全メンバー同報、15 分・1 件成立）、gate は auto 委任の中継承認。reviewer（Codex）への直接依頼可 | team.md、leader 周知 05:52:06Z |
| 互換性 | 後方互換は既定で維持せず現在の契約へ寄せる | `.agents/rules/backward-compatibility.md` |
| Walking Skeleton | steering に明示規定なし（scope-dependent。feature scope はエンジン既定 skeleton on） | memory/ 不在確認（前例 260705-engine-installer と同じ分類） |

## 本 Intent への適用

- openai.yaml の追加は promote 経路（skill 昇格プラクティス）にそのまま乗る（設計確定 Q6 = B）。
- 取り込みは fresh clone（b67798c3）+ 全件照合で行い、provenance を source yaml と harness/codex README に残す。
- Walking Skeleton は Construction の最初の Bolt gate で stance 分類を行う（scope-dependent → feature 既定 = on）。

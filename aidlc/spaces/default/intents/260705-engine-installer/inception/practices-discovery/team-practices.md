# Team Practices：Engine Installer（260705-engine-installer）

上流入力: [initiative-brief.md](../../ideation/approval-handoff/initiative-brief.md)

## プラクティス

| 領域 | プラクティス | 出典 |
|---|---|---|
| スクリプト実装 | 新規スクリプトは Bun + TypeScript の .ts で作り、TDD で進める（先に失敗する検証 → 失敗確認 → 最小実装） | `.agents/rules/dev-scripts.md` |
| スクリプト実装 | shell に複雑な処理を書かず TypeScript へ寄せ、一時ディレクトリを作る検証は成功・失敗どちらでも片付ける | `.agents/rules/dev-scripts.md` |
| 検証入口 | `package.json` から呼ぶ検証入口は短い名前にし、標準検証は `npm run test:all` とする | `.agents/rules/dev-scripts.md`、`aidlc/spaces/default/memory/project.md` |
| 隔離 eval | 一時ディレクトリへの隔離 workspace 構築と決定論的検証は engine sandbox e2e（`dev-scripts/evals/engine-e2e/check.ts`）と pdm-scope eval の前例に従う | `dev-scripts/evals/` |
| ブランチ / PR | ロール名 prefix（`eng2/`）、PR は Issue と Intent をリンクし日本語で書く。CI 先行確認、merge は人間 | `aidlc/spaces/default/memory/team.md`（多体連携の運用、Git Branching Policy） |
| 多体連携 | 技術確認はピア協議（15 分・1 件成立）、承認系は leader 経由。gate 承認は包括委任の auto 中継（本 Intent 中の運用変更） | `aidlc/spaces/default/memory/team.md`、leader 周知（2026-07-05T19:07:51Z） |
| 品質 | `tsc --noEmit`、lint（public-type-file、ts-complexity）、`git diff --check` を CI mock が実行 | `package.json`、`.github/workflows/ci.yaml` |
| 互換性 | 後方互換は既定で維持せず、現在の契約へ寄せる | `.agents/rules/backward-compatibility.md` |
| Walking Skeleton | steering に Walking Skeleton の明示規定なし（scope-dependent。feature scope は skeleton on がエンジン既定） | `aidlc/spaces/default/memory/`（grep で不在を確認済み、260705-steering-learnings の分類前例） |

## 本 Intent への適用

- インストーラ本体と専用 eval は dev-scripts ルールの TDD 対象そのものであり、専用 eval を先に書いて RED を確認してから実装する（ディスパッチ作業指示 4 と一致）。
- `package.json` への scripts 追記は追記型接触（CON-8）として union 解消可能な形に保つ。

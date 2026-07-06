# claude-host-wiring evals

## 検査条件

`dev-scripts/check-claude-host-wiring.ts` は、次を満たすことを確認する。

- Bun で TypeScript として実行できる。
- `.claude/skills/*` と `.claude/rules/*` の配線がそろった workspace では成功する。
- `.agents/skills/*` に対応する `.claude/skills/*` symlink の欠落を検出する。
- 参照先が存在しない宙吊り symlink を検出する。
- symlink が実体ディレクトリへ置き換わった状態を検出する。
- 別の昇格先を指す誤参照 symlink を検出する。
- `.agents/rules/*` に対応する `.claude/rules/*` symlink の欠落を検出する。
- `.claude/settings.json` の欠落を検出する。
- `.claude/settings.json` が valid JSON でない状態を検出する。
- 実リポジトリの配線では成功する。

## 境界

- `core/skills/` と `.agents/skills/` の内容一致は、この eval では扱わない。
  promote-skill evals が一時ディレクトリへの再昇格と差分比較で確認する。
- `.claude/settings.json` の内容一致は扱わず、存在と JSON 妥当性に留める。

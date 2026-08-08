# Code Summary — u6-plugin-docs-drift

上流入力(consumes 全数): code-generation-plan.md(本 unit の受け入れ基準と実装方針)、functional-design/business-rules.md(BR-U6-1〜4 の充足判定)。

## 着地内容

- builder コミット `1d0fc407d`(worktree 隔離 builder、base = origin/main 断面 `a5f297c2b`)→ conductor ブランチへ cherry-pick `8a31b975a`
- 変更2ファイル(+13/-4): `plugins/formal-model-check/stages/formal-model-check.md` / `plugins/pr-convergence/stages/pr-convergence.md`
- 文言: none = 人間が起動判断 / semi・full = advisory が `question` occurrence として autonomy ladder に掛かり(`amadeus-advisory-choice.ts`)、`run-now` 裁定で無人起動、それ以外は human fallback
- pr-convergence 側は `plugin.json` に advisories 宣言が現存しないため「an engine advisory raised for this plugin is routed…」の条件形で記述(builder 申告済みの事実整合 — 挙動の発明なし)

## 検証実測(exit code は各コマンド単独捕捉)

- 是正前 grep: 各ファイル1件 → 是正後: 両ファイル 0 件(conductor ツリーでも `grep -c` = 0/0 を再実測)。repo 全域 grep で pin するテスト・fixture なし
- builder 側: `bun run typecheck` 0 / `bun run lint` 0 / plugin テスト8ファイル 79 pass / 0 fail(初回 run の path 誤りを実在検査で検出し全8ファイル補完実行)
- conductor 側取込後: full CI(`bash tests/run-tests.sh --ci`)RESULT: PASS / typecheck 0 / lint 0 / `bun run build` 後の追跡ファイル不変
- fidelity diff: u6 変更 hunk は忠実適用。残差は base 前進差(origin/main の inputs パス表記・landed 節)のみで u6 変更面に非交差 — PR 再接地時に解消される

## 逸脱

なし(FR-6b 遵守 — 新 occurrence kind 追加なし。`scopes: []` 記述不変)。

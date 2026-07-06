# Code Quality Assessment

> Reverse Engineering 成果物 — 分析対象: main @ 14c40c9c(現 HEAD 8d73e463)

## テスト

| 層 | 本数 | 対象 |
|---|---|---|
| smoke | 12 | 構造検証 |
| unit | 117 | 単一コンポーネント |
| integration | 100 | コンポーネント間契約 |
| e2e | 64 | ライフサイクル全体(claude-agent-sdk + node-pty + xterm/headless でターミナル駆動) |

- 実行: `tests/run-tests.sh`。デフォルト / `--ci` = smoke+unit+integration、リリース前 `--release` = 全層
- **既知失敗ベースライン**: t11 / t38 / t65 / t66 / t140 / t174 ほか(main 由来)。グリーン基準が「全緑」でない点は変更検証時のノイズ源
- ドリフトガードとしてのテスト: t68 が version.ts / CHANGELOG / README の三者同期を強制

## リンティング・型検査

- Biome 2.4(フォーマッタ無効)— ただし **lint 対象は tests/ のみ**。core/ / scripts/ はリンター保護外
- `tsc --noEmit` ×2 構成(本体 + tests)。`bun run check` = typecheck + lint
- TODO / FIXME は core に 0 件(良好)

## CI/CD・ドリフトガード

- **`.github/workflows` が不在** — team.md の「CI で実行」言明と実態が乖離(要修正シグナル)
- ローカル/レビュー時ガードは充実: (1) `package.ts --check`(dist バイト diff)、(2) `promote:self:check`、(3) `runner-gen check`、(4) t68 バージョン同期
- デプロイ基盤なし(配布 = dist コピー方式)。リリースはバージョンタグ

## ドキュメント品質

- `docs/`(guide / harness-engineering / reference 00-17)が充実。コントリビューションチェックリスト(11-contributing)あり
- 「ファイル・コマンドの改名時は docs/ と README を grep して同一コミットで更新」が team ルール化済み
- CLAUDE.md / memory 5層により、方法論とリポジトリ規約が機械可読に文書化されている

## 技術的負債(優先度付き)

| # | 負債 | 影響 | grilling 統合との関係 |
|---|---|---|---|
| 1 | 既知失敗テストのベースライン(t11 ほか) | リグレッション検出の信頼性低下 | 変更後の green 判定に既知失敗リストの照合が必要 |
| 2 | CI 定義不在(.github/workflows なし) | ドリフトガードが人間の実行規律頼み | PR 検証はローカル実行に依存 |
| 3 | read-only スキル配布の手動 N×M(4 manifest への行追加) | 抜け漏れリスク | **grilling スキル新設時に直撃** — 4 manifest 追加を忘れるとハーネス間パリティ崩壊 |
| 4 | lint 範囲が tests/ のみ | core/ の品質はレビュー頼み | stage-protocol 等の Markdown 変更はセンサー(required-sections)が唯一の自動検証 |
| 5 | ルートに tmp/ と roadmap.html 残骸 | 軽微(衛生) | なし |
| 6 | stage-protocol.md 1000行単一ファイル | モード追加の影響面が広い | **第4モード挿入(L258-298)の主リスク** — 既存3モードへの非干渉を差分レビューで保証する必要 |
| 7 | amadeus-log.ts answer 在席ゲートの「1 human turn = 1 answer」前提 | 高頻度連続回答と衝突しうる | **grilling の連続質問フローで設計時検証必須**(例外スイッチ追加 or ゲート緩和の ADR が必要) |

## 総合評価

決定論的ガード(ドリフト検査・イベントホワイトリスト・在席ゲート)への投資が厚く、生成物パリティの規律は高水準。一方で CI の実体不在と lint 範囲の狭さにより、その規律が人間の手順遵守に依存している点が最大の構造的弱点。grilling 統合においては負債 #3・#6・#7 が直接の設計制約となる。

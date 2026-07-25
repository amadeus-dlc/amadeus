# Practices Evidence — 260725-teamup-launch-hardening

上流入力（consumes 全数）: `amadeus/spaces/default/codekb/amadeus/code-structure.md`、`amadeus/spaces/default/codekb/amadeus/technology-stack.md`、`amadeus/spaces/default/codekb/amadeus/dependencies.md`、`amadeus/spaces/default/codekb/amadeus/code-quality-assessment.md`、`amadeus/spaces/default/codekb/amadeus/architecture.md`、`amadeus/spaces/default/codekb/amadeus/business-overview.md`

- `code-structure.md` — 正本 `packages/framework/core/` と生成物 `dist/` / self-install の構造境界を引き、配布同期の実務が現行構造と整合することを確認した。
- `technology-stack.md` — Bun / TypeScript / Biome / `tests/run-tests.sh` の4層プロファイルを引き、テスト・lint・型検査の現行実務の裏付けとした。
- `dependencies.md` — 外部依存（agmsg / herdr / git）の境界を引き、本 intent が repo 外を変更しない方針の根拠とした。
- `code-quality-assessment.md` — 同日 RE が記録した現行の欠陥・技術的負債4件を引き、差分ギャップの候補として既存ルールと照合した。
- `architecture.md` — actas 移行後の launch シーケンスと `mux_attach` 順序を引き、検証・ガードに関する実務ルールの適用先を確認した。
- `business-overview.md` — Team Mode の利用者価値（複数エージェントへアタッチして作業を開始できること）を引き、実務ルールが守るべき成果を確認した。

測定 ref: HEAD `4a0f91ad0`（同日 RE の observed）。

## スキャン方式

`cid:practices-discovery:c1` に従い、**同日の RE（observed `4a0f91ad0`）が CI・テスト・コードスタイル・セキュリティのスキャン面をカバーしている**ため、それを証跡として代用し、affirm 済み `team.md` / `project.md` との**差分ギャップのみ**を対象とした。独立のフルスキャンは実施しない。

## 実務の証跡（RE 由来 + 直接実測）

| 面 | 証跡 | affirm 済みルールとの一致 |
|---|---|---|
| CI | `.github/workflows/` が push / pull_request で typecheck・lint・dist/self-install drift guard・smoke+unit+integration tests を実行 | `project.md` Deployment と一致 |
| テスト | `bash tests/run-tests.sh --ci` = Test files 546 / assertions 7565（前 intent の実測）。4層（smoke / unit / integration / e2e） | `project.md` Testing Posture と一致 |
| 型検査 | `tsc --noEmit`（`bun run typecheck`） | `project.md` Code Style と一致 |
| リンター | Biome 2.4系、フォーマッタ無効 | `project.md` Code Style と一致 |
| 配布同期 | 正本 `packages/framework/core/` → `dist/` 6面 + self-install 4面。`dist:check` / `promote:self:check` がドリフトガード | `project.md` Mandated と一致 |
| リリース | `release.yml` の workflow_dispatch 一本、release-it | `project.md` Deployment と一致 |
| 運用形態 | `AMADEUS_OPERATING_MODE` 未設定 = ソロモード | `team.md` § Operating Modes と一致 |

## 差分ギャップの検討

同日 RE の `code-quality-assessment.md` が記録した負債（#1384 の保護不在、テストが sentinel を自前で書く構造、`CLAUDE_MONITOR_PROMPT` の4箇所散在、worktree 直列作成）を、**既存の affirm 済みルールで説明できるか**を照合した。

| 負債 | 既存ルールでの説明 | 新規ルールの要否 |
|---|---|---|
| #1384 の保護が不在 | `org.md` Forbidden（検証劇場）+ `cid:application-design:external-seam-vocab-measurement` で説明可能。本 intent が是正する | 不要 |
| テストが sentinel を自前で書く | 同日 RE の §13 で `cid:reverse-engineering:cite-shift-vs-nonshift-separation` ほか3件を persist 済み。加えて前 intent が `cid:reverse-engineering:seam-writer-mode-precondition` を persist 済み | 不要（既決） |
| `CLAUDE_MONITOR_PROMPT` の散在 | `construction.md` § Code Completeness（canonical な1定義から導出）で説明可能 | 不要 |
| worktree 直列作成 | 性能特性であり実務ルールの欠落ではない | 不要 |

**結論: 実務ルールの追加・変更を要するギャップは検出されなかった。**

## 判定

`team.md` / `project.md` の affirm 済みルールは現行の実務と整合しており、本 intent のために新設・変更すべきルールはない。

上流入力(consumes 全数): intent-statement, feasibility-assessment, constraint-register

# Scope Document — 260725-kimi-harness

## 目的と境界の根拠

intent-statement の成功指標(dogfood完結)と、feasibility-assessment の GO 判定・constraint-register の制約(TC-1: プロジェクト config なし、TC-2: 既存 `[[hooks]]` 14件との共存、OC-1: ユーザー config への明示承認境界)を受けて、Kimi Code CLI 上で AI-DLC ワークフローが hooks 連携込みでフル機能動作するための**利用者体験の最小実行可能単位**を Must として定義する(scope-definition:c2、ux-first-scope-for-distribution-intents の既定)。

## In Scope(Must)

| # | proto-capability | 内容 | 対応する成功指標 |
|---|---|---|---|
| M1 | ハーネス定義 | `packages/framework/harness/kimi/`: manifest.ts・orchestrator SKILL.md + question-rendering annex(claude 型)・onboarding fills・dot-gitignore | 指標1 |
| M2 | hook adapter | `hooks/amadeus-kimi-adapter.ts`(+lib): kimi payload → Claude 契約正規化。9 target(session-start/session-end/mint/audit-and-sensors/state-sync/runtime-compile/validate-state/log-subagent/stop)。live capture 駆動 | 指標4 |
| M3 | hook 配線マージ機構 | ユーザー `~/.kimi-code/config.toml` への managed block 冪等マージ(マーカー囲み・バックアップ・dry-run 表示・除去手順)。setup CLI への実装 + 手動 fallback 手順 | 指標4、OC-1 |
| M4 | コア編集(サンクション済み3箇所) | doctor arm(kimi 版: adapter 実在・managed block 有無・`kimi --version` フロア=実測版・機能 probe)・swarm `HARNESS_VALUES` へ kimi 追加・`KNOWN_HARNESS_DIRS` へ `.kimi-code` 追加 | 指標4 |
| M5 | 配布・CI 列挙 | packages/setup(harness.ts/engine-layout/reporter)・plugin-projection・promote-self(SELF_INSTALL 含む)・detect-ci-changes | 指標1,3 |
| M6 | dist 生成 + dogfood | `bun scripts/package.ts kimi` → `dist/kimi/` コミット → `promote:self` でルート `.kimi-code/` セルフインストール | 指標1,3 |
| M7 | 決定的テスト | adapter 契約テスト(live-capture payload 駆動)・dist 構造 smoke・setup マージ単体・swarm resolve 分岐。t145 parity は manifest 追加で自動カバー | 指標2 |
| M8 | ドキュメント | `docs/guide/harnesses/kimi-code.md` + `.ja.md`・README 表追加。hook 配線手順(自動/手動)・前提(kimi 0.28.1+・bun)・制約(ユーザーレベル config)を明記 | 指標4 |
| M9 | live driver + journey | `kimi -p` 駆動の driver 新規作成。`AMADEUS_KIMI_*_LIVE=1` ゲートで journey 1本以上、ローカル実走 green | 指標5 |
| M10 | セッションスキル全量同梱 | 6本(session-cost/replay/outcomes-pack/grilling/mirror + 派生)。runner-gen デフォルト | 指標1 |

## Out of Scope(Won't)

| # | 除外項目 | 理由 |
|---|---|---|
| W1 | Kimi plugin(`kimi.plugin.json`)経由の配布 | per-user・全プロジェクト適用で、バージョンをプロジェクト固定する思想と不合(将来の追加チャネル候補) |
| W2 | `kimi-ultra` swarm ドライバ | subagent フロアで十分。ultra 系の effort 実効は telemetry で検証不能(既知の証拠限界) |
| W3 | PostCompact での mission 再注入 | codex 固有の拡張。まずは PreCompact のみ(validate-state)で運用し、必要なら将来追加 |
| W4 | `.kimi-code/mcp.json` 連携 | amadeus は MCP 非依存。必要になった時点で検討 |
| W5 | 外部プロジェクトへの npm 導入 E2E 検証 | intent-capture Q1=A で配布完結を不採用。インストーラ対応(M3/M5)は Must に含むが、外部実機検証は後続intent |
| W6 | カスタム statusline | Kimi に statusline 拡張点が存在しない(docs に該当機構なし) |

## スコープ vs タイムライン検証

締切は存在しない。Must は全て「公開契約の完結」に必要な最小単位で、削ると Kimi ユーザーがワークフローを hooks 込みで実行できない(M2/M3)・drift guard が赤くなる(M5/M6)・品質ゲートが効かない(M7/M9)。矛盾検出: なし(Q1〜Q2 の回答は intent-capture / feasibility の決定と整合)。

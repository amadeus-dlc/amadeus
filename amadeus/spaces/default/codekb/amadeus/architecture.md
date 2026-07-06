# アーキテクチャ：amadeus

## 層構成

| 層 | 場所 | 責務 |
|---|---|---|
| エンジン | `.agents/amadeus/tools/`（26 CLI） | 状態機械、stage graph、audit、Bolt / swarm / worktree、scope 解決。routing の正はエンジンで、skill 側 prose では再導出しない。`workspace_requires` ガード（`amadeus-state.ts verifyStageArtifacts`）は、registry の docsOnly 宣言（`declare-docs-only`、非空 evidence 必須で人間承認イベントを参照）がある場合に限り免除され、免除発動は `GUARD_EXEMPTED` として audit へ記録される（#499）。宣言なしは従来どおりの拒否経路（#366 の抜け検出を保全） |
| hooks | `.agents/amadeus/hooks/`（11 本） | session start/end、stop 督促、presence mint、sensor fire、runtime compile、subagent 記録。fail-open（失敗は .amadeus-hooks-health/*.drops へ記録し、doctor が表面化する = #432）。完了済み Intent へは audit を書かない完了ガードを mint-presence / stop（#479）と log-subagent（#555。agent_type 空文字は unknown 既定）が持つ。audit-logger と SESSION_* 系は理由付きで見送り（#555 の FR-3.2 実測）。runtime-compile hook の command filter は正準経路 .agents/amadeus/tools/ を含む path alternation で transition を検知し、learnings surface は graph 不在・slug 不在時に 1 回だけ自動 compile → 再解決 → 不能時は復旧手順つき fail fast する（#558） |
| stage 定義 | `.agents/amadeus/amadeus-common/stages/`（5 phase / 32 stage） | frontmatter（produces / consumes / scopes / sensors）と stage 本文。scope membership は frontmatter → `amadeus-graph.ts compile` で scope-grid.json へ転置 |
| method rules | `amadeus/spaces/<space>/memory/`（org / team / project / phases/*） | compile 時に各 stage の rules_in_context へ焼き込む |
| skills | `skills/amadeus*`（source）→ `.agents/skills/`（昇格先） | 単独実行用 stage runner と補助入口。同期は promote-skill.ts のみ。各 skill は agents/openai.yaml（Codex harness 用の適応取り込み = #552 Phase 1）を持ち、harness/codex が新設された（#565） |
| 台帳 | `intents/intents.json`（registry、正準）+ 各 record の `amadeus-state.md` / `audit/` | `active-intent` が現在対象を示す。人間向け索引は廃止（GD009）。台帳は生きた台帳で PR 断面と一致しない（docs/amadeus/lifecycle/state.md） |
| 可視化 | `dev-scripts/kanban/` + hooks 結線（#470） | GitHub Projects v2 への一方向鏡（Maintainer 専用の表示鏡） |
| model overlay | `dev-scripts/apply-model-overrides.ts` + `dev-scripts/data/model-overrides.json`（#554） | project-local な modelOverride 固定（設計系 2 agent → fable）。parity は管理値集合 {model} ∪ {fallbacks[model]} のトークン一致に限り base へ逆変換して比較（管理外値は fail）。doctor が乖離を警告（overlay は任意・fail-open 読み取り、読み取り失敗は「model overlay state unknown」1 行）。promote-skill は実昇格時のみ fail-soft で再適用。配布対象外（installer 許可リスト方式） |
| 検証（reference-resolution） | `skills/amadeus-validator/` → 昇格先 | completed な reverse-engineering 段の record 成果物が、共有 `amadeus/spaces/<space>/codekb/<repo>/` 配下の正準 `.md` への reference-stub（相対リンク + 採用根拠）である場合、参照先の実在を検査する。ダングリング参照は fail、非 stub（実体成果物）は存在チェックのみで従来どおり（#501）。record stub 不在時は共有 `codekb/<repo>/<artifact>.md` の実在で直接解決する（stub 9 件の作成が不要になった = #548） |

## scope 体系

scope 数は現在 10（bugfix / enterprise / feature / infra / mvp / pdm / poc / refactor / security-patch / workshop）。pdm は Amadeus 独自追加 scope（企画・要求定義止まりで Construction / Operation を持たない。上流パリティ例外 = parity-map engineFileExceptions、Issue #429）。scope とは別に、produces が amadeus/ 内文書だけの Intent に対する docs-only 宣言機構（#499）があり、`amadeus-state.ts declare-docs-only`（非空 evidence 必須、人間承認 audit イベントの実在照合つき）で宣言済みの Intent では workspace_requires ガードのステージ完了拒否が免除される。免除時は GUARD_EXEMPTED が audit へ記録される（audit イベント総数 71）。Adaptive Workflows（上流 2.2.0 = b67798c3）により、amadeus-composer-agent が `/amadeus compose` をトリガーにディスパッチされ、`recompose`（`amadeus-state.ts`）で実行中 workflow の pending ステージ suffix を flip する。`validate-grid`（`amadeus-graph.ts`）が合成 grid の論理整合を検証し、既存 scope の grid と composed scope は暫定 entry として共存する。RECOMPOSED イベントが audit へ記録される。

workspace 名前空間は #526 の全面 rename により Amadeus 固有（amadeus/、amadeus-state.md、/amadeus、.amadeus-*）となった。構造・意味論は v2 互換のまま、上流との名前対応は parity-map の nameMappings（12 系統）が機械的に定義する。

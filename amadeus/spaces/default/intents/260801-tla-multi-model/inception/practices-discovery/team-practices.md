# Team Practices — 260801-tla-multi-model(practices-discovery 確定分)

上流入力(consumes 全数): codekb `technology-stack.md` / `code-quality-assessment.md` / `code-structure.md` / `architecture.md` / `business-overview.md` / `dependencies.md`(RE 現在節)+ 4スキャン(pipeline-deploy / quality / developer / devsecops)

## Way of Working

トランクベース開発 + PR 必須・squash マージ(org.md:7、team.md:47-49、直近7日 merge commit 0件で実測)。worktree 既定 `--base main --target main --strategy squash`。Operation フェーズは本 intent では全 SKIP。

## Walking Skeleton

org.md 既定: greenfield スコープ(mvp/enterprise/feature/poc/workshop/infra)は常に最初に walking-skeleton Bolt、incremental(bugfix/refactor/security-patch)はセレモニースキップ。project.md: greenfield 要素(新パッケージ・新配布経路)を含む intent のみ最初の Bolt をスケルトン化。**本 intent は self-feature だが新規パッケージ・配布経路を伴わない brownfield plugin 拡張のため、スケルトン off を推奨**(インタビュー Q1 で確定)。

## Testing Posture

fail-closed 一貫。project gate(低下 0.02pp のみ許容)+ patch gate(PR diff 0-hit 不許容・allowlist は reason+expiry 必須)+ relative gate。Tests/coverage はハードブロック(ci-success 集約)。テストは修正と同 PR で運ぶ。「検知テスト0件」を欠陥クラスとして閉包。本 intent の必須面: model-map スキーマ表テスト・loader 契約ピン改訂・両モデルの注入 red 実証・drift ガード赤実証。

## Deployment

npm(`@amadeus-dlc/setup`、provenance)+ GitHub Release の2面のみ、手動ワンボタン(workflow_dispatch)、数日おき patch。環境階層なし。本 intent は配布面変更不要(plugin 内完結、dist 再生成は `bun scripts/package.ts` 経由)。

## Code Style

Biome(lint のみ有効・formatter 無効・complexity warn)。実質ゲートは tsc 両 tsconfig + 独自 ratchet ガード。KB 規範: 30行関数・Result 的明示失敗・Trust the boundary・周囲スタイル厳密一致(Brownfield ルール優先)。dist/ 手編集禁止。

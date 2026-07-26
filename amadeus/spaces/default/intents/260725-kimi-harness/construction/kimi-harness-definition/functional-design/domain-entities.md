上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Domain Entities — kimi-harness-definition

requirements.md の FR-1 と components.md C1 の構成要素をエンティティとして定義する(型の正本は `scripts/manifest-types.ts`)。

## Entity: HarnessManifest(kimi 行)

型の正本は `scripts/manifest-types.ts`(実測: `DirMap` :12、`FileMap`+`projectRoot` :20、`EmitContext` :27、`EmitResult` :54、`OnboardingSpec` :70、`HarnessManifest` :79-122・`frontmatterAdditions` :101・`rulesRename` :107・`authoredExempt` :110・`skipRunnerGen` :119・`emit` :121)。

- `name: "kimi"` / `harnessDir: ".kimi-code"` / `rulesRename: null` / `emit: null`
- `coreDirs: DirMap[]` — { src, dst } の8+6行(rules→rules は rename なし)
- `harnessFiles: FileMap[]` — orchestrator SKILL.md・question-rendering.md・dot-gitignore(projectRoot: true)・snippet.toml
- `authoredExempt: RegExp[]` — `^hooks/amadeus-kimi-[^/]+\.ts$`(Bolt 2 の adapter/lib 用に予約)
- `onboarding: OnboardingSpec` — dst AGENTS.md・projectRoot: true・fills 参照

## Entity: dist/kimi ツリー(生成物)

- `.kimi-code/` — 投影された core dirs + `tools/data/{stage-graph.json, scope-grid.json, harness.json}` + `VERSION`
- `.kimi-code/skills/` — orchestrator + stage/scope runners は runner-gen 生成、session skills 6本は coreDirs 投影(役割の二重配置なし)
- `amadeus/` — workspace shell(active-space + memory seed)
- `AGENTS.md` — onboarding(projectRoot)
- `.gitignore` — projectRoot の dot-gitignore 由来

## Entity: Managed Block(snippet の中身)

- `# >>> amadeus-kimi-hooks >>>` / `# <<< amadeus-kimi-hooks <<<` のマーカーコメントで囲まれた TOML 断片
- 内訳: `[[hooks]]` 群(SessionStart・SessionEnd・UserPromptSubmit・PostToolUse×4・PreCompact・SubagentStop・Stop)と `[[permission.rules]]` 群(allow: `Bash(bun .kimi-code/tools/*)`・`Bash(bun .kimi-code/hooks/*)`・git worktree/commit/add)
- イベント↔matcher の対応表は Bolt 2 の live capture で最終確定する(本 Bolt では骨格のみ)。骨格の7イベント種は adapter の9 target への配線で、unit-of-work.md の U2「全9イベント」との件数差(1イベントが複数 target を駆動するかは matcher 次第)は U2 で突合して確定する。component-methods.md の C2 インターフェース(routeTarget)がこの対応表を吸収する設計。services.md の PreToolUse 言及は Kimi の blockable イベントの説明であり、骨格への PreToolUse 配線は要否を U2 で判断する

## 適用範囲

- U1 の完了定義(unit-of-work.md)と unit-of-work-story-map.md の FR-1/FR-7b/FR-10 行に対応するエンティティ
- services.md の判定(常駐サービスなし)により、エンティティ間の共有状態は導入しない

## 関係

- HarnessManifest --(packager が投影)--> dist/kimi ツリー
- snippet.toml --(Bolt 3 のマージモジュールが managed block 化)--> ユーザー config.toml

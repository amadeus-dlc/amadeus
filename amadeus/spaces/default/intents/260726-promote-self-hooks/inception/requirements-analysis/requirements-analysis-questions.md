# Requirements Analysis 質問 — promote-self の kimi hooks 配線欠陥

上流入力 (consumes 全数): business-overview.md, architecture.md, code-structure.md (codekb、RE 差分リフレッシュ済)

背景: doctor が「kimi managed block 未配線」を検出したが、修復アドバイス (bunx インストーラ再実行 / 手動コピー) はこの自己開発リポでは誤り。正本の昇格経路は `scripts/promote-self.ts` だが、これは dist→ルート同期のみでユーザー級 `~/.kimi-code/config.toml` に触れない。RE で特定された設計論点4件をユーザーに裁定いただく。

leader 承認: 2026-07-26T13:13:19Z — Q1-Q4 の設計論点は選挙不要 (solo 運用の leader 直接裁定) と判定し、Q1=A / Q2=A / Q3=A / Q4=A のユーザー裁定を承認

## Q1: promote-self へのマージ追加の実現手段 (再利用 seam)

promote-self --apply に managed block マージを追加する際、どの層を再利用するか。

- A. `runHooksMerge` (packages/setup/src/modules/kimi-hooks.ts) を auto-confirm ports 注入で再利用 — バックアップ作成・pre-write TOML guard・冪等 noop が module 実装に一元化される (推奨)
- B. domain 純粋関数群 (`renderManagedBlock` + `planMerge` + `applyMerge`) を直接利用し、バックアップ・書込は promote-self 側に実装
- C. 現行どおり setup CLI のみがマージを持ち、promote-self は doctor 文言の誘導先として名前だけ出す
- X. Other (please specify)

[Answer]: A

## Q2: マージの実行契約

promote-self のどのモードでマージを実行するか。

- A. `--apply` で常時実行 (kimi harness ペイロード dist/kimi が存在する場合のみ)。`--check` はユーザー級 config を検査しない (hermetic 維持) (推奨)
- B. 新フラグ (例: `--wire-kimi-hooks`) 指定時のみ実行
- C. `--apply` 常時 + `--check` にもユーザー級 config の drift 検査を含める (非 hermetic 化: CI/他マシンで config 不在時に FAIL しうる)
- X. Other (please specify)

[Answer]: A

## Q3: doctor 修復アドバイス (`KIMI_MANAGED_BLOCK_FIX`, packages/framework/core/tools/amadeus-utility.ts:855-856) の文言

- A. 自己開発リポ (scripts/promote-self.ts が存在するワークスペース) では `bun scripts/promote-self.ts --apply` 誘導に分岐し、配布ユーザには現行 bunx 誘導を維持 (推奨)
- B. 分岐せず文言一本化 (両経路を併記: 配布は bunx install、self-dev は promote-self --apply)
- C. doctor 文言は現行のまま (promote-self 側の修正のみ)
- X. Other (please specify)

[Answer]: A

## Q4: ユーザー級 config 書込の承認ポリシー

promote-self --apply は非対話実行されうる。`~/.kimi-code/config.toml` への managed block 追加/更新をどう承認するか。

- A. promote-self の実行自体がリポ所有者の明示的昇格操作なので暗黙承認。ただしバックアップ作成と変更内容 (diff) の表示は必須、失敗時は promote-self 全体を非ゼロ終了 (推奨)
- B. 対話実行時のみ確認プロンプト、非対話時はスキップして警告表示 (未配線のまま昇格が通りうる)
- C. 常に表示のみで書き込まない (本 intent の欠陥が解消しない)
- X. Other (please specify)

[Answer]: A

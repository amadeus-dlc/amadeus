# Business Logic Model — U3 cursor-port

intent: `260715-opencode-cursor-harness` / Unit: U3
上流入力: unit-of-work.md(U3)、unit-of-work-story-map.md(視点2)、requirements.md(FR-3 / AC-3a〜3d)、application-design の components.md(C2・AC-3d 実測記録)/ component-methods.md(C2 emit 構成・tool_name 実装前提)/ services.md(機能単位表 ⚠ 行)。

## 処理フロー(Bolt 3 冒頭 — 語彙実測、実装前提の確定)

1. **外部実測**(E-OC9 / external-seam-vocab-measurement — 2026-07-15 時点 PR #1024 で persist 審議中、裁定確定済み): Cursor 公式 docs(hooks 仕様)+可能なら実機で (a) `preToolUse`/`postToolUse` が stdin に渡す `tool_name` の値集合と Claude 語彙(`Bash`/`Write`/`Edit` 等)との対応表 (b) exit コード意味論(AC-3d 記録: exit 2=deny / その他=fail-open — 版付き再確認)を実測して確定する
2. 実測結果で分岐:
   - 写像可能 → アダプタの正規化写像表(モジュールスコープ定数)に固定し、hooks.json.example の該当エントリを出荷
   - 写像不能なイベント → その hooks.json エントリを**出荷せず**、services.md 機能表の該当行を「未対応」へ降格(偽グリーン排除 — 設計済みの降格ルール)
3. 実測記録(照会日・出典・値集合)を本 Unit の code-summary / diary に残す(AC-3d の「確定」証跡)

## 処理フロー(ビルド時)

1. `discoverHarnessNames()` が `harness/cursor/manifest.ts` を自動発見 → coreDirs 写像(rules → amadeus-rules)で `dist/cursor/.cursor/` 生成
2. emit(emission table 駆動、write⇔check 対称 — U1 と同一様式): `.cursor/rules/amadeus.mdc`(alwaysApply エントリ)/ `hooks.json.example`(実測確定分のみ)/ AGENTS.md / `.cursor/commands/amadeus.md` / `tools/data/harness.json`
3. `hooks/amadeus-cursor-adapter.ts` は harnessFiles で配置(authoredExempt regex で orphan 除外 — codex 同型)

## 処理フロー(実行時 — hooks)

1. Cursor が hook イベント発火 → hooks.json の command が `bun .cursor/hooks/amadeus-cursor-adapter.ts <core-hook 名>` を起動
2. アダプタ: stdin の Cursor envelope(hook_event_name / workspace_roots / tool_name 等)を parse → tool_name を正規化写像表で Claude 語彙へ変換 → core hook スクリプトの期待 stdin 形へ再構成して pipe
3. エラー方針: parse 失敗・写像表未登録の tool_name は**非ゼロ(2 以外)の exit**(Cursor 契約の AC-3d 実測: exit 2=deny、その他=fail-open = 動作続行。codex アダプタは exit 0 で fail-open — 値は異なるが advisory 側に倒す意図は同一)。exit 2 は使わない。ゲート強制・監査整合はツール所有 emit が正のため fail-open が安全側

## 処理フロー(利用時 — 到達ライン)

dist/cursor/ 手動配置 → `--version` / `--doctor`(advisory 劣化)/ `.cursor/commands/amadeus.md` から orchestrator 起動 → directive 受領(AC-3b、実測記録は AC-6b 様式)。

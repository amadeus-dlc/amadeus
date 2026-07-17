# Unit of Work — opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness`(Issue #626)
上流入力: application-design の components.md(C1〜C5)/ component-methods.md / services.md / component-dependency.md / decisions.md(ADR-1〜5)、requirements.md(FR-1〜7)。2026-07-16。

## U1: opencode-skeleton(walking skeleton — Bolt 1、単独ゲート)

- **内容**: `packages/framework/harness/opencode/manifest.ts`(authoredExempt 明示含む — 型契約表準拠)+ 最小 emit(emission table 骨格+write⇔check 対称+`.opencode/commands/amadeus.md` 起動導線+harness.json 同梱)→ `dist/opencode/` 生成
- **対応 AC**: AC-1a(dist 生成+dist:check exit 0)、AC-1b(意味論照合済み様式)、AC-1d(harness.json)、AC-2a の一部(--version / --doctor が dist 手動配置で動く)
- **完了条件**: `bun scripts/package.ts` exit 0 / `bun run dist:check` exit 0 / 手動配置で `--version`・`--doctor` 実測(AC-6b 手順)/ **AC-2b の最小疎通確認 — `.opencode/commands/amadeus.md` 経由で `amadeus-orchestrate.ts next` を1回起動し directive(JSON)受領を実測**(完全実測 — エラーケース・workflow start 全経路 — は U2 に残す。reviewer Major #1 反映: walking skeleton の最大未知数をゲート前に検証)/ 全 CI 基準 green
- **規模**: M(manifest ~70行 + emit 骨格 ~120行 + 検証)

## U2: opencode-surface(opencode 完成)

- **内容**: emit 完成 — AGENTS.md / opencode.json.example(permission 例)/ skills 合成(`.opencode/skills/`)。basic workflow start(AC-2b)の実測
- **対応 AC**: AC-2a/2b/2c、FR-1 完成、AC-6b(opencode 分の実測記録)
- **依存**: U1(同一 emit ファイルを拡張 — 直列)
- **規模**: M(emit 追加 ~130行 + AGENTS.md/設定例)

## U3: cursor-port(Cursor 一式)

- **内容**: (a) **tool_name 語彙の実測**(公式 docs+可能なら実機 — external-seam-vocab-measurement 準拠、写像不能イベントは出荷せず機能表降格) (b) `harness/cursor/manifest.ts` + emit(`.cursor/rules/amadeus.mdc` エントリ / hooks.json.example / `hooks/amadeus-cursor-adapter.ts`(tool_name 正規化写像表付き)/ AGENTS.md / commands)→ `dist/cursor/` 生成 (c) basic workflow start 実測
- **対応 AC**: AC-3a/3b/3c/3d、FR-3 完成、AC-6b(cursor 分)
- **依存**: U1(walking-skeleton ゲート通過後に着手 — ファイルは非交差だが Bolt 1 単独ゲートの規律)
- **規模**: L(manifest ~70行 + emit ~300行 + アダプタ ~150行 — 語彙実測を含むため最大)

## U4: verification-docs(検証と文書の統合)

- **内容**: (a) smoke test 1本(dist/opencode/・dist/cursor/ の構造検証、fs 直読 seam) (b) README / harness guide 更新(機能単位表 — services.md の原型を転記、⚠ 行は U3 実測結果で確定) (c) installer 別 Issue 起票(AC-6a 留保: 台帳 verbatim+再現実測付き) (d) opencode hooks(plugins)将来 Issue 起票(ADR-3)
- **対応 AC**: AC-5b/5c、FR-7 AC-7a/7b、AC-6a(Issue 起票)
- **依存**: U2・U3(両ハーネスの実測結果が文書の入力)
- **規模**: M(テスト ~120行 + docs 差分 + Issue 2本)

## 横断制約(全 Unit)

- Bolt=PR 1:1(スカッシュ)。dist/self-install 再生成同期・deslop・push 前 lcov・AC-4d の core-neutrality grep をレビュー観点に含める
- 逸脱は実装前停止(deviation-stop-before-implement)。実装時の第3独立再列挙(enumeration-reverify-at-implementation)を U1/U3 で必須

## Review

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-16T00:00:00Z
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Recommendation |
| --- | --- | --- | --- | --- |
| 1 | Major | unit-of-work.md:6-10 (U1 完了条件) vs requirements.md AC-2b | FR-2 の見出し自体が「walking skeleton の到達ライン」であり、AC-2b は文字どおり「$amadeus 相当の command/skill から orchestrator を起動でき…到達する(basic workflow start)」をその到達点と定義している。しかし U1(walking-skeleton・単独ゲート Bolt)の**完了条件**は `--version`/`--doctor` の手動配置実測のみで、AC-2b(実際に command から orchestrator を起動できることの実測)は U2 に先送りされている(unit-of-work.md:15 "basic workflow start(AC-2b)の実測")。org.md の walking-skeleton 規律は「Bolt 1 を単独・ゲート付きで実行し、残りの Bolt の実行前にユーザーが明示的に承認する」ことで最もリスクの高い統合点を先に検証する設計であるが、本分割では最大の未知数(opencode の `.opencode/commands/*.md` が実際に `amadeus-orchestrate.ts next` を起動できるか)が未検証のままゲートが通過し、U2 と並行して U3(cursor-port)が batch 2 で着手されうる(unit-of-work-dependency.md のバッチ構成)。U2 で command 起動が機能しないと判明した場合、並行着手済みの U3 やゲート運用そのものの手戻りにつながる | U1 の完了条件に AC-2b(command からの orchestrator 起動・intent-capture の run-stage directive 受領までの実測)を含める。ファイル規模が理由で U1 に同居させにくい場合は、少なくとも「U1 ゲートは AC-2a のみでなく AC-2b の最小疎通確認(directive 受領の1回実測)まで含む」旨を明記し、AC-2b の完全実測(エラーケース等)のみ U2 に残す形で分割する |
| 2 | Minor | unit-of-work.md:11,18,25,32(規模欄) | ステージ定義(units-generation.md)は unit-of-work.md に "Relative complexity estimate per unit (S/M/L/XL)" を要求しているが、本成果物は各 Unit の規模欄を行数見積り(例: "manifest ~70行 + emit 骨格 ~120行")のみで表現しており、S/M/L/XL のカテゴリラベルが存在しない。memory.md にもこの様式変更を「逸脱」として記録した形跡がない(Deviations 節は空) | S/M/L/XL の相対規模ラベルを各 Unit に併記するか、行数見積りへの置き換えを memory.md の Deviations 節に理由付きで明記する |
| 3 | Minor | unit-of-work-story-map.md:25 と unit-of-work.md:36 の整合 | AC-4d(core-neutrality の per-PR grep 検証)は unit-of-work.md の横断制約節で正しく「全 Unit」に一般化されているが、story-map の視点3テーブルでは "新ハーネスが manifest 1組で増える open-set の実証 \| U1 \| AC-1a(core 編集ゼロ)、AC-4d(neutrality grep)" として U1 の行にのみ記載されており、読み手が U1 限定の検証項目と誤解しうる | story-map の当該行に「(U1〜U4 の各 PR で反復)」等の注記を追加し、横断制約節との整合を明示する |

### Validation Tool Results

| Tool | Result | Interpretation |
| --- | --- | --- |
| `runtime-graph.json` の `bolt_dag` 直読(`bun .claude/tools/amadeus-runtime.ts compile` 済み出力) | PASS — `units`(4件: opencode-skeleton→[], opencode-surface→[opencode-skeleton], cursor-port→[opencode-skeleton], verification-docs→[opencode-surface, cursor-port])と `batches`(3段: [opencode-skeleton], [cursor-port, opencode-surface], [verification-docs])が unit-of-work-dependency.md の YAML edge block・バッチ表と完全一致 | L-FD1 のエンジン読み取り機械検証を実測で確認。エッジブロックは非循環かつ全 unit 名が宣言済みで整合 |
| FR/AC カバレッジの手動突合(requirements.md の 7 FR・全 AC を grep し units-generation の3成果物と照合) | PASS(AC-2b の扱いを除く) | AC-1a/1b/1c(FR-1完成経由)/1d、AC-2a/2b/2c、AC-3a-3d、AC-4a-4d、AC-5a-5c、AC-6a/6b、AC-7a/7b すべてがいずれかの Unit に到達可能。AC-4c(promote:self 対象外の明記)は AC-7a(promote:self の対象/非対象記載)に包含されて U4 で満たされる。AC-6a の Issue 起票内容(留保 i/ii/iii)も U4/U1-U3 に正しく分配。唯一 AC-2b の**検証タイミング**(walking-skeleton 完了条件への算入可否)に finding #1 の懸念あり |
| 依存の正しさ(U2直列/U3ゲート依存の区別、batch 2 並行度) | PASS | U2 の U1 直列は「同一 emit ファイル拡張」という c6 準拠の交差理由、U3 の U1 依存は「ファイル非交差だが walking-skeleton 単独ゲート規律」という別理由として、依存図とテキストで明確に書き分けられている(memory.md にも同旨の Interpretation エントリあり)。batch 2 の並行数は 2 で team.md の parallel-bolts 上限(4)内 |
| 隠れた欠落の走査(application-design の C1〜C5・ADR-3/5・authoredExempt・write⇔check・tool_name 写像表・installer 別 Issue・opencode hooks 将来 Issue) | PASS | いずれも U1〜U4 のいずれかに明示的に割当済み(authoredExempt→U1、write⇔check→U1横断制約、tool_name写像表→U3、installer別Issue→U4(c)、opencode hooks将来Issue→U4(d))。C3(harness.json)は既存機構の再利用としてU1/U3のemitに暗黙包含 |

### Summary

FR/AC の全数カバレッジ・依存グラフの機械的整合(runtime-graph.json 直読で L-FD1 実証)・application-design 設計要素の割当漏れなしは確認できた。唯一の実質的懸念は、FR-2 自身が「walking skeleton の到達ライン」と命名する AC-2b(command からの orchestrator 起動)が、単独ゲートである U1 の完了条件に含まれず U2(batch 2 で cursor-port と並行)に先送りされている点(Major #1)。Major は1件のみで READY の閾値(Critical 0件・Major ≤2件)は満たすが、次工程(delivery-planning / build-and-test)で U1 のゲート実測範囲を明確化することを強く推奨する。

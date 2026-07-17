# Requirements — opencode-plugins-hooks(Issue #1049)

> 上流入力(consumes 全数): `../../ideation/intent-capture/intent-statement.md`(成功の姿4点)、`../../ideation/scope-definition/scope-document.md`(In 4/Out 5・受け入れ境界=配線0許容)、codekb の business-overview.md / architecture.md / code-structure.md(re-scans/260716-opencode-plugins-hooks.md で鮮度確認)、`../practices-discovery/team-practices.md`(live 温存)、RE `../reverse-engineering/scan-notes.md`(フォーカス1〜6+Architect 合成 — 8点再照合全一致)、`../../ideation/feasibility/constraint-register.md`(C-1〜C-6)。2026-07-16。
> 既決照合: 配線集合の導出規則・写像の実測様式・非目標は Issue #1049+ADR-3+E-OC1 承認(22:06:53Z)で既決。

## FR-1: 写像対応表の確定(工程0 — 実測規律)

Cursor 8 target(reconstruct case 一覧、scan-notes フォーカス2: session-start / mint / runtime-compile / audit-and-sensors / log-subagent / validate-state / session-end / stop)× opencode plugins フックの対応表を成果物として確定する。

- AC-1a: 表の各行は「配線(一次ソース verbatim 根拠付き)」または「未対応(反証可能根拠付き)」のいずれか — 空欄・推測 ✅ 禁止(external-seam-vocab-measurement。一次ソース = @opencode-ai/plugin packages/plugin/src/index.ts — **conductor 提供の外部実測**(当ツリーに opencode 依存なく in-tree 再実測不可、出典 scan-notes:156-165・agmsg-git-evidence-split 準拠): chat.message の UserMessage 直接観測(:162)・tool.execute.before/after の payload フィールド構造(:163-164)。chat.message の input/output フィールド構造自体は未転記 — 実装時 in-tree 再実測の対象)
- AC-1b: 実装時実測で確定する条件付き行は ⚠ 表記+確定条件を明記(E-OC9 様式)
- AC-1c: 一次ソース実測(conductor 提供・外部実測 — 当ツリー未検証につき**実装時の in-tree 再実測が確定条件**)の高確度分を要件として固定: **chat.message → mint-presence(HUMAN_TURN)写像候補**(UserMessage 直接観測 — scan-notes 外部実測節)/ **tool.execute.after → audit-logger+sensor-fire**(input = { tool, sessionID, callID, args } — tool vocab→tool_name と args→file_path/command の**二段写像**が必要、Architect 合成 C-4)

## FR-2: 配線プラグインの実装(Cursor 同型)

- AC-2a: `packages/framework/harness/opencode/` に plugin 本体(JS/TS module、`export const AmadeusPlugin = async (ctx) => ({ ...hooks })` 形式 — C-5)+写像 lib を実装。写像ロジックは純関数 seam(cursor-lib `reconstruct` 同型 — in-process テスト可能、spawn 盲点回避)
- AC-2b: core hooks 11本は**無改変**(RE 区間差分: 本作業は plugin 新設のみ)。呼び出しは既配布の `.opencode/hooks/*.ts` への subprocess spawn(cursor `defaultSpawn` 同型、`env: process.env` 明示 — bun-spawn-env-snapshot)
- AC-2c: **advisory 徹底**: プラグインは失敗を握りつぶさず stderr へ記録するが、opencode の動作をブロックしない。core stop hook は exit 2 を出さない(RE で全 hook grep 実証)— stop は advisory 降格(Architect 合成 B の意味論精査を要件化)
- AC-2d: 未実測の tool 語彙は ToolNameMap 相当へ登録しない — 実測確定値のみ登録し、未登録は advisory reject(cursor :60-67/:130 前例)
- AC-2e: manifest 整合: plugin 配置が core-copied `hooks/` 配下なら authoredExempt(現状 `[]` — manifest.ts:61)への正規表現追加が必須、別 dir なら不要 — 配置の選択は AD 段 ADR(要件はこの整合制約のみ固定)

## FR-3: 検証(偽グリーン排除)

- AC-3a: 写像 lib の純関数テスト(in-process)— 配線各行の入出力+未登録語彙の advisory reject+エッジ(payload 欠落フィールド)を最低2系
- AC-3b: 落ちる実証は**実行時に消費される行**へ注入(E-PM7 M3 — 型注釈のみの変更は偽陰性)
- AC-3c: phantom HUMAN_TURN の防止: chat.message 写像で machine 注入マーカー(mint-presence :65 の抑止対象)が判別不能な場合、**mint 配線を見送り根拠付き未対応とする**(誤 mint は #708/#755 クラスの presence 汚染 — fail-open 禁止。Architect 合成 C-3)
- AC-3d: 全検証コマンド同期実行+exit code 記録(typecheck / lint / dist:check / promote:self:check / --ci / patch gate、push 前ローカル lcov)

## FR-4: 配布(regen 経路)

- AC-4a: 配布は manifest 経由(harnessFiles または emit — AD 段で確定)で `dist/opencode/` へ regen(`bun scripts/package.ts` — package.ts は harness 自動発見につき無改変、scan-notes フォーカス6)。dist 手編集禁止
- AC-4b: `.opencode/plugins/` ディレクトリ名は公式 docs 実測どおり複数形 `plugins`(scan-notes 注意点: docs 単数/複数の齟齬は実装時に dist レイアウトで再実測)

## FR-5: docs 機能単位表の更新

- AC-5a: per-harness 機能表の「opencode hooks: 未対応」行を、配線確定分は対応へ、写像不能分は根拠付き未対応へ更新(検証時点・opencode バージョンを明記 — measurement-ref-in-artifacts)
- AC-5b: 配線数 0 に終わった場合も表の根拠更新のみで Issue スコープ(1)(3)(4)は充足(scope-document 受け入れ境界)

## 横断(品質契約)

- 逸脱は実装前停止 / per-PR マージ伺い / worktree 隔離(c2)/ deslop / PR 1:1(closing keyword = `Fixes #1049`、クローズは着地検証後)
- テスト配置層のサイズ純度(隣接 intent 260716-installer-new-harnesses の C-2 の類推 — 本 intent の constraint-register C-2 とは別物)— 実 FS を使うテストは integration 層(#1048 t230 前例)

## トレーサビリティ

| Issue #1049 スコープ / scope In/Out / 制約 | FR / 対応 |
|---|---|
| 写像可否の実測調査(In 1) | FR-1 |
| Cursor 同型の薄い実装(In 2) | FR-2 |
| 偽グリーン排除(In 3) | FR-1 AC-1a/1b・FR-2 AC-2d・FR-3 |
| 機能単位表(In 4) | FR-5 |
| Out 1: 全 stage 完全互換・core 分岐直書き | 対象外 — 該当 AC なし(AC-2a は表層限定で遵守) |
| Out 2: gate 強制の置換 | 対象外 — AC-2c の advisory 徹底が遵守を担保 |
| Out 3: 他ハーネス hooks 変更 | 対象外 — 変更目録に cursor/claude/codex 面なし |
| Out 4: グローバル plugins 配置 | 対象外 — AC-4a はプロジェクトローカル配布のみ |
| Out 5: release/npm publish | 対象外 — 該当 AC なし(project.md Mandated 遵守) |
| C-1(配線限定) | FR-1 AC-1a/1b・FR-2 AC-2d |
| C-2(ツール所有 emit が正) | FR-2 AC-2c |
| C-3(core 分岐直書き禁止) | FR-2 AC-2a(表層限定) |
| C-4(payload 未文書 → 一次ソース直読) | FR-1 AC-1a/1c(実装時再実測条件) |
| C-5(JS/TS module 形式) | FR-2 AC-2a |
| C-6(regen 8ミラー) | FR-4 AC-4a |

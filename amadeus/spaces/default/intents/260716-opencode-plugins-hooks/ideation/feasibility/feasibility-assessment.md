# Feasibility Assessment — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`(成功の姿4点・非目標・制約)。

## 判定: **GO(条件付き)**

## 実測結果(2026-07-16、c1 — 実ツール・公式文書で直接検証)

### 実測1: opencode plugins 機構(公式 docs https://opencode.ai/docs/plugins/ — WebFetch 実測)

- 配置: `.opencode/plugins/`(プロジェクトローカル)+ `~/.config/opencode/plugins/`(グローバル)— 「Files in these directories are automatically loaded at startup」と明文
- 形式: JavaScript/TypeScript module、`export const MyPlugin = async (ctx) => ({ /* hooks */ })`。型は `@opencode-ai/plugin` パッケージ
- イベント一覧(docs 記載 verbatim): session.created / session.compacted / session.deleted / session.diff / session.error / session.idle / session.status / session.updated、tool.execute.before / tool.execute.after、message.updated / message.part.updated ほか、permission.asked/replied、file.edited、tui.* 等
- **payload スキーマ: 未文書**(例: tool.execute.before の input/output の具体構造が docs に不記載)— 確約(✅)を書ける水準にない(external-seam-vocab-measurement)

### 実測2: 現行配布物(dist/opencode — ls 実測)

- `.opencode/hooks/` に core hooks 10 ファイルが**配布済み・未配線**(plugins ディレクトリは不存在 — `ls dist/opencode/.opencode/plugins` は not found)
- つまり本 intent の実装面 = 「配線プラグイン(JS)1枚+manifest への plugins/ 追加」であり、hook スクリプト自体の新規開発は不要

### 実測3: Cursor アダプタ同型の対照(repo 実測)

- Cursor は 8 イベント配線(hooks.json.example 実測: sessionStart / beforeSubmitPrompt / afterShellExecution / afterFileEdit / subagentStop / preCompact / stop / sessionEnd)、adapter 24行+lib 264行の薄い表層
- opencode 候補写像(確信度付き推定 — c1): session.created→session-start(高)、session.idle or session.deleted→stop/session-end(中 — 意味論の実測要)、tool.execute.after→audit+sensor-fire(中 — payload 未文書)、session.compacted→preCompact 相当(中)。**beforeSubmitPrompt(HUMAN_TURN mint)相当のイベントは docs の一覧に見当たらない**(低 — message.updated の role 判別で代替可能かは公開ソース直読が確定条件)

## GO の条件(下流ステージへの引き渡し)

1. **C-核心**: HUMAN_TURN(mint-presence)相当イベントの存在・payload は @opencode-ai/plugin 公開ソースの一次直読で確定する(saas-undocumented-source-read)— 写像不能なら該当面は根拠付き「未対応」維持(偽グリーン排除 = Issue スコープ(3)がこの帰結を明示的に許容)
2. 配線は payload が文書化(または一次ソースで確定)されたイベントのみ(PR #1046 U3 工程0 前例)
3. ゲート強制の置換はしない — hook は補助、ツール所有 emit が正(ADR-3)

## 見積り

S〜M(プラグイン1枚+manifest+regen+テスト)。Cursor 前例(初期到達 8 イベント中、実測確定分のみ配線)と同規模以下。

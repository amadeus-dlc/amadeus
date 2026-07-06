# Team Practices — 260706-journal-logger（Issue #557）

## 上流入力

codekb 6 docs（基準 19662e50）を入力にした: [code-structure.md](../../../../codekb/amadeus/code-structure.md)、[technology-stack.md](../../../../codekb/amadeus/technology-stack.md)、[dependencies.md](../../../../codekb/amadeus/dependencies.md)、[code-quality-assessment.md](../../../../codekb/amadeus/code-quality-assessment.md)、[architecture.md](../../../../codekb/amadeus/architecture.md)、[business-overview.md](../../../../codekb/amadeus/business-overview.md)。

## プラクティス

| 領域 | プラクティス | 出典 |
|---|---|---|
| validator 拡張 | 先に失敗する eval を書き RED を確認してから最小実装（TDD）。skill 変更は promote-skill.ts 経由 + test:it:promote-skill | .agents/rules/dev-scripts.md、amadeus-artifacts-and-examples.md |
| 追記型台帳 | audit / timestamp と同じ規律（記録済みを書き換えない、conflict は面の分割か union） | org.md、team.md 共有成果物の統合 |
| 新設ロール | agmsg の join / spawn / actas 機構（前例: 本チームの 7 名運用、reviewer 直接利用） | agmsg スキル、leader 周知 05:52:06Z |
| 検証 | test:all + validator（Intent 指定込み）を PR 前に実行・記録 | team.md、ディスパッチ指示 5 |
| PR | draft 作成 → 3 条件で ready 化 + merge 依頼。pr-gate-discipline.md の監視規律 | 恒常ルール 06:38:33Z、#534 |
| 言語 | amadeus/**/*.md（journal 含む）は日本語。契約 doc も日本語 | AMADEUS.md 作業言語 |
| Walking Skeleton | steering 規定なし = scope-dependent（feature 既定 = on。最初の Bolt gate で分類 report） | memory/ 不在確認（前例 3 件と同じ） |

## 本 Intent への適用

- validator の journal 検査は eval fixture をエンジン実出力形（実ファイル）で作る（fixture 手書き合わせの禁止 = project.md Testing Posture）。
- journal/README.md（契約）と journal/<YYMMDD>.md（#556 移行分）は日本語。手順書も日本語（repo 内運用文書）。
- logger の役割 prompt は agmsg 前例（役割固定・定型応答）に合わせる。

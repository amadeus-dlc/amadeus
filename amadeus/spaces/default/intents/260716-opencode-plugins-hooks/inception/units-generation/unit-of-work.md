# Unit of Work — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../application-design/components.md`(C1〜C5)、`../application-design/component-methods.md`、`../application-design/services.md`、`../application-design/component-dependency.md`(直列依存)、`../application-design/decisions.md`(ADR-1〜5)、`../requirements-analysis/requirements.md`(FR-1〜5)、`../user-stories 非実行(amadeus スコープ)につき story 面は requirements のトレース表を正とする`。

## U1: opencode-plugin-adapter(規模 S〜M — 単一 unit)

- **範囲**: C1〜C5 の全変更面(工程0 写像表+plugin 2ファイル+テスト2ファイル+manifest+docs 機能表+dist regen)
- **検証列**: typecheck / lint / dist:check / promote:self:check / --ci / patch gate / 落ちる実証(実行時消費行 — E-PM7 M3)
- **規模の正当化**: 推定 ~250行 lib+~24行 entrypoint+~150行テスト+manifest 4行(components.md の cursor 対照見積り)。全変更が同一検証列・直列依存(C3→C2→C1→C4→C5)に閉じ、分割は交差を生むだけ。reuse inventory = core hooks 11本無改変・package.ts 無改変・cursor-lib 様式流用・既存テストランナー(新規機構ゼロ)
- **デプロイモデル**: embedded — plugin は既存 dist/opencode 配布経路へ(新規デプロイ単位なし)
- **Bolt 対応**: Bolt 1 = U1(1:1)

## 分割しない判断の根拠

工程0(C3)の実測結果が C2 以降の実装範囲を決める直列構造のため、unit を割ると「実測前に凍結できない仕様」を跨ぐ手戻りが生じる。単一 PR 規模(#1048 Bolt 1 = 27ファイルより小)で Bolt 単位 PR 原則と両立。

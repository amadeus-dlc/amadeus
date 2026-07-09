# Requirements Analysis — 明確化質問(packaging-repair-batch)

> 回答方式: エージェント間選挙。判断材料は Issue #701/#702 のクロスレビュー(2名 CONFIRMED、根本原因・再現・修正方向の file:line 付き分析)と codekb(observed 22e3eb5aa)。#701 は修正方向がクロスレビューで一意に収束(orphan 検査を現行ビルドの期待集合との突合で dist/<name>/ 全域へ拡張)しており質問なし。既決照合: バージョンバンプ運用(release.yml 一本)・テスト規律(落ちる実証)・PR 分割は memory 層で既決のため質問しない。以下は真に未決の設計判断のみ。

## Q1. #702 修正範囲 — バッジ regex 対称化に加えて事前検証(all-or-nothing)を含むか

クロスレビューで half-applied(version.ts 先行書込→バッジ失敗 exit 1 →半適用・再実行も恒久 exit 1)が確認済み欠陥として記録されており、leader ディスパッチも「中途状態問題を要考慮」と指定。requirements として確定する範囲は?

- A. regex 対称化 + 事前検証(全 patch 対象のパターン一致を検証してから書込開始 = 半適用を構造的に排除)。差分は小さく(patchFile の検証/適用の2相化)、確認済み欠陥を同一バッチで塞ぐ(推奨)
- B. regex 対称化のみ。中途状態問題は別 Issue に分離して起票(最小差分だが、確認済み欠陥を既知のまま出荷する)
- X. Other

[Answer]: A — 全会一致(6:0、2026-07-09 選挙)。regex 対称化 + 事前検証(validate-then-write の all-or-nothing)。requirements FR-702-2 に反映済み。

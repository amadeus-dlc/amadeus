# Performance Test Instructions

Unit: docs-codekb-guards（Test Strategy: Minimal）

## 適用判断

不適用とする。

## 根拠

本 Intent の変更は、開発時に人間・エージェントが単発実行するエンジン CLI（codekb-path 解決、宣言 subcommand、stage 完了検査）と validator の検査 1 段の追加であり、性能要求（NFR）は requirements.md に存在しない。追加された処理は git subprocess 1 回（B001）、registry の線形走査（B002）、record 内 9 ファイルの読み出しとリンク解決（B003）で、いずれも既存検査と同オーダーである。

Testing Posture（project.md）の規約に従い、不適用の instruction は空ファイルにせず本判断を記録する。

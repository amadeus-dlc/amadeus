# Performance Test Instructions

Unit: persist-cid-metamain（Test Strategy: Minimal）

## 適用判断

不適用とする。

## 根拠

本 Intent の変更は、単発実行のエンジン CLI（persist の marker 照合 1 段と、モジュール末尾のガード分岐 1 行 ×5）であり、性能要求は requirements.md に存在しない。追加処理は文字列比較と分岐のみで、既存処理と同オーダーである。

Testing Posture（project.md）の規約に従い、不適用の instruction は空ファイルにせず本判断を記録する。

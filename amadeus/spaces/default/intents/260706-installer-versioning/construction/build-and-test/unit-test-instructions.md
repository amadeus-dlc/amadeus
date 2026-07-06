# Unit Test Instructions

Unit: u001-installer-versioning（feature scope）

## 適用判断

独立した unit test ファイルは作らず、eval 内の隔離 workspace 実走行 + 純関数検証で担う（#451 と同じ構成。[code-generation-plan.md](../u001-installer-versioning/code-generation/code-generation-plan.md)）。

## 対応

3-way 判定の各象限は eval の実走行シナリオ（b / c / d / h / i 系）が判定表の全行を実ファイルで検証する。判定ロジック（trackedWrite / judgeObsolete）は InstallRecorder に閉じており、eval の期待値語彙（backed up / restored / obsolete / skip）と 1:1 対応する。

# Security Design — U5 completeness-sensor

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## File boundary

- POSIX相対pathだけを受理し、repository root realpath包含を検査する。祖先・末端symlinkと非regular fileを拒否する。
- `open`後のfdを`fstat`し、列挙時dev/inodeと一致した同一fdからreadする。1 file 16MiB、総量64MiBを上限とする。

## 情報管理

- 内部比較値はhash evaluator内に閉じ、外部findingsはrelative pathと固定reason codeだけを持つ。expected/actual hash、file内容、absolute pathをaudit/verdictへ出さない。
- sensorはread-onlyとし、更新は別subcommandのworkspace lock下atomic renameに限定する。

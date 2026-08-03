# Reliability Design — u5-agents-import

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。唯一の`business-logic-model`をfallback入力とする。

## 失敗契約

- suffix生成元不在はbuild非0。空ファイルを生成しない
- import行不整合、CLAUDE byte不整合は整合テスト非0
- outputは一時fileへ完成後renameし、中断時にpartial suffixを残さない
- build再実行は同一byteへ収束し、追跡fileのgit statusを変えない

## 復旧

正本修正後に全buildを再実行する。root指示fileだけ、または生成suffixだけを手修正しない。u6着地後に実diffへ再接地し、同一promote-self.tsの変更を黙って上書きしない。

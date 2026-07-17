# Reliability Requirements — U3 cursor-port

intent: 260715-opencode-cursor-harness / Unit: U3
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)(R-U3-4/R-U3-6)。

## 要件

- RL-U3-1(前提: business-rules R-U3-1 の Bolt 3 冒頭再実測 — fail-closed へ変わっていれば設計停止): アダプタの回復可能性分類 — parse 失敗・未登録 tool_name は「回復不能→非ゼロ(2以外)exit で fail-open」(Cursor 契約側で動作継続 — 監査整合はツール所有 emit が担うため hook 喪失は品質劣化であり整合破壊ではない)
- RL-U3-2: 単体テストは正常系+エラー2ケース以上(不正 stdin / 未登録 tool_name、exit 値アサート — R-U3-6)
- RL-U3-3: emit の信頼性は U1 と同一(fail-fast / write⇔check / 冪等)

## N/A(反証可能根拠付き)

- リトライ・フェイルオーバー: N/A — 単発 advisory プロセスで再試行の意味論がない(次の hook 発火が自然な再機会)

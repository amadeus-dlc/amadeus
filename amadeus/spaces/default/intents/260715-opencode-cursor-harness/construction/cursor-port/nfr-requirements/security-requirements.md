# Security Requirements — U3 cursor-port

intent: 260715-opencode-cursor-harness / Unit: U3
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)(R-U3-6 エラー方針)。

## 要件

- SR-U3-1: アダプタは stdin JSON を parse-don't-validate(CursorHookEnvelope)で検証し、未検証データを core hook へ素通ししない(R-U3-6 の無音素通し禁止と対)
- SR-U3-2(前提: R-U3-1 の exit 意味論再実測): **exit 2(deny)を使わない** — アダプタが意図せずツール実行をブロックする権限的副作用を構造的に排除(AC-3d 実測の exit 意味論に基づく)
- SR-U3-3: hooks.json.example の command はワークスペース相対の bun 実行のみ(外部 URL・シェル文字列組み立てなし)
- SR-U3-4: U1 の SR-U1-1〜3 継承

## N/A(反証可能根拠付き)

- 認可チェック: N/A — アダプタは権限判定を行わない(advisory pipe のみ。deny 判定は将来要件が生じた場合に別 intent)

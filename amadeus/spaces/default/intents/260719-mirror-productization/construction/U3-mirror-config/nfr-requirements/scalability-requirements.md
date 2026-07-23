# Scalability Requirements — U3-mirror-config

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## SC-U3-1: キー空間の成長

初キーは auto-mirror のみ(C-06)。キー追加時は SETTINGS_KNOWN_KEYS 様式(既習)の合法キー列挙を拡張する設計で、requirements.md W-01(既存設定の移行なし)の境界を維持。

## SC-U3-2: 層数の固定

3層(Global/Space/Intent)は固定 — マシンローカル層等の追加は W-02 で除外済み。層追加は将来 intent の要件から(YAGNI)。

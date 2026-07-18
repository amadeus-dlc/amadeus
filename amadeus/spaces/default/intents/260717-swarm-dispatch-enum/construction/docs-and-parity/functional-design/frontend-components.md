# Frontend Components — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

UI なし — 利用者可視面は docs の読者体験(ui-less-mockups-as-output-contract の docs 面)。

## 読者契約(docs の構成骨格)

- 08 節の driver seam 表: 「値 → 各 harness の挙動」の1表で三状態が読める(FR-1 表の転記)+ 直下に fail-closed と degrade の1段落+opencode/cursor 1行
- codex ガイド: native fan-out への変更・breaking(旧 exec floor 撤去)・C-15 開示の3点が読める

## 消費契約

- docs は人間読者専用。テスト(t174 系 docs gate 等)が読む場合は既存 gate の検査対象変化を code-generation で棚卸しする(stderr-addition-consumer-grep の docs 面類推)

# Frontend Components — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

UI なし — 利用者可視面は conductor の表示文言契約(ui-less-mockups-as-output-contract)。

## 表示モック(degraded / rejected — 全 harness 共通の文言骨格)

| ケース | 利用者向け表示(骨格 — verbatim 固定せず要素で検証) |
|---|---|
| degraded(例: claude で codex-ultra) | `AMADEUS_USE_SWARM=codex-ultra はこのハーネスでは利用できないため native subagent floor へ降格します(SWARM_DEGRADED を記録)` — 要素: requested 値・降格先・audit 記録の3点 |
| rejected(例: 1) | resolve の stderr JSON をそのまま提示+停止宣言 — 要素: 不正値・許可値列挙・副作用ゼロの3点 |

## 消費契約

- 表示文言の実装位置は各 harness SKILL(prose)。t181 parity は「要素の存在」で検証し文言 verbatim を固定しない(BR-7 と同原則)

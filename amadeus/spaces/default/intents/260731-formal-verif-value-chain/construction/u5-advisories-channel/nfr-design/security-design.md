# Security Design — u5-advisories-channel

上流入力(consumes 全数): requirements, business-logic-model, business-rules, domain-entities

## 入力・出力境界

- advisories フィールド(business-logic-model.md L2/L5)は engine 内部の判定結果のみから合成され、外部入力を運ばない(message は既存の固定文面 — BR-U5-2)。
- ラッチファイル(L4)は machine-local runtime 配下(gitignored)で、内容は ISO 時刻のみ — 秘匿情報なし(domain-entities.md E3)。
- ラッチ読み書きの失敗は fail-open で emit 側へ倒す(BR-U5-3)— 通知の欠落を作らない方向の安全性。

## 検証劇場の回避

advisories は実判定(activation 3値)からのみ生成 — ハードコード・演出は禁止(requirements の検証劇場 Forbidden 継承)。

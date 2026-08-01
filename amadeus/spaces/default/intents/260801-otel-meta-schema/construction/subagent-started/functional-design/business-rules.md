# Business Rules — U4 subagent-started

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U4 の責務は unit-of-work.md U4 行(按分195行: hook 100+registry pin 部 15+lifetime 80)から、API 形は component-methods.md の subagent-start hook / subagent-lifetime 節から、FR 契約は requirements.md FR-SUB-1〜3 から、価値は story-map 段4(未完了の機械検知)から。本 Unit は store を読む(lifetime 合成)が新 store を作らない — その境界は services.md に依拠する。

## ルール(FR 対応)

- **BR-U4-1**(FR-SUB-1): canonical 追加は pin 6箇所と同一 PR。落ちる実証 = 1箇所残しで対応ガードが赤
- **BR-U4-2**(FR-SUB-2): started は SubagentStop と同じ3段ゲート+fail-open。payload 欠落時も Agent Type "unknown" で発火(発火自体を落とさない)
- **BR-U4-3**(FR-SUB-3): 合成は純関数+**決定的突合規則**(ID 一致 → Type LIFO 最近傍 → seq 順 tie-break、BLM の3段規則)。テスト: ペア合成・片割れ検知・**同一 Type 3並列(ID 有無混在)・同時刻 tie-break・孤児 completed** の5面
- **BR-U4-4**: Purpose の redaction(registry optional 追加で safe-key 自動追従)+1行/長さ上限をテスト固定

## 実装・検証義務

- event-registry.ts は U3 着地後に積む(DAG 直列)。registry 変更は domain-entities の**ガード10項目全数**+doc 同期(audit-format.md / 12-state-machine.md)を同一 PR で green 化
- settings 変更は全ハーネス設定面(settings.json.example 系)+dist/self-install 再生成を同一 PR で(NFR-4)
- PreToolUse hook の発火実証は fixture 駆動(hook stdin JSON の合成)+実 spawn の integration 1件

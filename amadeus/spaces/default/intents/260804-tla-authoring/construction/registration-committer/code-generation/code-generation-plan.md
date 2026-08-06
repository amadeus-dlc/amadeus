# Code Generation Plan — U4 registration-committer(Bolt 5、バッチ 3)

上流入力(consumes 全数): U4 の functional-design(business-logic-model.md / business-rules.md / domain-entities.md)、nfr-design(security-design.md)、unit-of-work.md U4 節、requirements.md FR-010 前後。

## 実装ステップ(TDD vertical slice — 受け入れ基準の述語を逐語で写す)

1. schema 正本拡張: `amadeus-formal-verif-model-map.ts` に optional `evidenceBundle` 参照を追加(ADR-3 / Q1 裁定 = schemaVersion 2 据え置き、MODEL_KEY_SETS へ optional key 追加、parseEvidenceBundle 正本)— 失敗テスト先行
2. 前提ゲート + map 合成: `tla-registration.ts` に `checkPreconditions`(6検査: applicability→coverage→freshness→proof→review→humanApproval、PreconditionFailure 判別ユニオンで**全数集約** = BR-U4-15)と `parseEntryDraft` / `composeRegisteredMap` — t448(unit、純関数層)
3. atomic replace + 競合検知: `createRegistrationPorts`(temp write + renameSync、失敗時 staging rmSync + re-throw)と `commit`(前提検査→bundle 整合照合→snapshot 読取→draft 全体検証→**再読込競合検知**→atomic publish→receipt = business-logic-model §1 の1-6)— t449(integration、実FS)で TOCTOU 窓へ決定的注入(BR-U4-16)
4. 拒否経路の全数カバー: stale / provenance 偽装 / bundle 不一致 / concurrent-modification / shard 不読 / io-failure — 各 typed failure で fail-closed(旧 map 無傷 = BR-U4-01/02/13/14)
5. 出荷 validator copy の同 verdict ピン + sensor 引き継ぎ1行(`amadeus-sensor-model-completeness.ts:739` — impl-only refresh で evidenceBundle を無音ドロップしない、赤実測してから追加 = BR-U4-12)
6. CLI: `tla-authoring.ts` へ commit verb を FLAT_COMMANDS 様式で追加。変更面は unit-of-work.md U4 の宣言境界(「登録前提の全数検査と model-map.json の atomic replace」)に収める
7. 検証: typecheck / lint / t448+t449+t444+t445 / full CI / coverage patch gate を worktree solo で完走

## 品質規約

functional domain modeling(判別ユニオン Result、typed PreconditionFailure、fail-closed)。正規 map の atomic replace 以外の書込面を持たない。subagent は engine 操作・record 書込禁止(conductor が §12a とゲートを所有)。

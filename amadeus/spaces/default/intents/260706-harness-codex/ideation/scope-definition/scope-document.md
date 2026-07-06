# Scope Document — 260706-harness-codex（Issue #552）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md)（C-1〜C-9）。

## スコープ内（本 Intent）

1. **三層化全体の設計確定**（完了済み）: 設計論点 6 問を全メンバー同報ピア協議で確定（5/5 一致、feasibility の DECISION_RECORDED）。Phase 2 切り出しの根拠成果物。
2. **Phase 1 = harness/codex/ の新設**:
   - `harness/codex/README`（ハーネス契約 + Phase 2 正準化予定の明記）と provenance 記録（基準 commit b67798c3、写像表、再生成手順）。
   - 上流 `dist/codex` の skill 別 `agents/openai.yaml` を、上流対応する source `skills/amadeus-*/agents/openai.yaml` へ適応取り込み（rename 契約 = aidlc-* → amadeus-*。写像は parity-map の skillNameMapping を正とする）。
   - `dev-scripts/promote-skill.ts` による昇格（既存経路。alwaysAllowedDirs の "agents" 実測済み）で `.agents/skills/amadeus-*/agents/openai.yaml` へ反映。
   - 純正性検証（#541）: fresh clone + provenance 照合。
3. **検証**: validator、`npm run test:all`、parity:check（openai.yaml が検査対象に乗らないことの確認 = engineer5 提案の受け入れ条件、実測済みの再確認）。

## スコープ外

| 項目 | 行き先 |
|---|---|
| Phase 2 = core/ 一本化 + build.ts 化 + 粒度制約の CI 検証置き換え + manifest 統合 | 後続 Intent（単独実行枠。設計確定成果物を添えて起案 = 人間と leader） |
| 上流 harness/codex の emit.ts / hooks adapter の取り込み | Phase 2 以降（build 化の構成要素） |
| amadeus 独自 skill（上流対応なし）への openai.yaml 付与 | Codex ハーネス対応を実際に進める後続作業（本 Intent は「適応取り込み」のため上流対応分のみ） |
| Codex での実挙動検証 | Codex ハーネス導入時（将来） |
| team.md の粒度制約変更 | Phase 2（設計確定 Q4 = A） |

## 最小実行可能スコープ

harness/codex/ の 2 文書 + 上流対応 skill への openai.yaml 追加 + promote 昇格 + 検証 pass。これで「Codex 対応物の置き場がない」（Issue 背景 2）の Phase 1 分が解消し、モデル移行の基盤ができる。

## 優先順位（MoSCoW）

- Must: openai.yaml の適応取り込みと昇格、provenance、検証 pass。
- Should: harness/codex README のハーネス契約記述（Codex の skill 発見規則）。
- Could: 写像表への上流→amadeus 対応の全列挙（provenance の一部として実施予定）。
- Won't（本 Intent）: スコープ外表のすべて。

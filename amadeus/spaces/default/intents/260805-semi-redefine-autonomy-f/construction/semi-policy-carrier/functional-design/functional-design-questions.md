# Functional Design 質問記録 — `semi-policy-carrier`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

- **様式**: 1 問様式(Q1 = U-1 のみ)。他の設計分岐はすべて既決規範・承認済み上流からの機械導出であり §機械導出の記録 に列挙する。
- **E-OC1 判定**: Q1(U-1)は上流が「functional-design の設計事項」と明示的に委譲した真に未決の判断(`component-methods.md` §C9 の ⚠、`decisions.md` §未確定事項 U-1)であり、Intent autonomy `full` の正規経路 `amadeus-bolt decide-question` で無人裁定した。Q1 以外は既決の機械的執行(`cid:requirements-analysis:always-elect` の執行条項)。
- ユーザー承認: 2026-08-05T04:52:54Z(Intent autonomy `full` の設定トランザクション — 監査シャード `INTENT_AUTONOMY_TRANSACTION_COMMITTED`(projection.mode=full、events=afterMode|grant)の timestamp からの転記)

---

## Q1 — U-1: 非 full の `confirmedDisplayDigest` 照合点を加えるか

現状、非 full 側は digest の形検査(`validHumanContext:285` の `SHA256.test`)のみで**等値照合が無く**、FR-POL-2 で方針込みへ拡張した digest が実効を持たない(U-1 の確定条件 = 「FR-POL-2 の受け入れ基準を満たす最小形を決める」)。

- A. **policies-conditional** — policies 非空の `set-mode` / `revoke-full` に限り `planHumanAutonomyCommand` で等値照合を必須(preview → confirm の 2 段、full の `issueGrant` 照合と同位置・同形)。policies 空の従来形は現行 1 段 UX を維持
- B. **always-required** — 非 full 全てに等値照合(方針を伴わない mode 変更にも 2 段儀式を強制し、stage-protocol の既存 1 段契約を破る)
- C. **no-check** — 照合点を設けない(拡張 digest が実効を持たず U-1 未解決)

[Answer]: A(policies-conditional)— AUTO_DECIDED auto-decision-2b50bf576771acde61fe88cd1d7ca4bc

## 裁定の記録

- **経路**: Intent autonomy `full` に基づく `amadeus-bolt decide-question`(2026-08-05T10:56 頃、conductor が carrier JSON を作成)
- **結果**: `kind: "decided"`、`selectedOptionId: "policies-conditional"`(= 候補 A)、`decisionId: auto-decision-2b50bf576771acde61fe88cd1d7ca4bc`、`basisKind: agent-recommendation`(solo-election 不在の loud degradation 記録付き)、`reviewState: unreviewed`(検収キュー積載)
- **帰結**: `planHumanAutonomyCommand` の `set-mode` / `revoke-full` 分岐に「`policies` 非空 ∧ `context.confirmedDisplayDigest !== nonFullCommandDisplayDigest(...)` → `{ ok: false, code: "INVALID_COMMAND" }`」の照合を追加する。policies 空は現行 1 段のまま(形検査のみ)。business-logic-model.md §照合点 に反映済み

---

## 機械導出の記録(Q1 以外の設計分岐)

| # | 設計分岐 | 導出した答え | 一次根拠 |
| --- | --- | --- | --- |
| D1 | C8 書き側・C9・C10・C15 の型・表・ガード文言 | `component-methods.md` §C8(入力→`after.semiPolicies` 表)/ §C9(`nonFullCommandDisplayDigest` の 1 定義化と意図的相違)/ §C10(ガード逐語)/ §C15(`policyCount` の供給式)を逐語採用 | 承認済み application-design(FR-POL-1〜3 / FR-DISP-2 / FR-AUTH-3 へ trace 済み) |
| D2 | policies の正規化 | 既存 `normalizeDecisionPolicies:106-133` を再利用し、seed は `context.commandOccurrenceId`(SAFE_ID 検査済み)。正規化失敗は既存 `catch` → `INVALID_COMMAND`(新エラー経路を作らない) | `component-methods.md` §C8 |
| D3 | 「方針ゼロ」と「フィールド不在」の同一視 | `set-mode` semi + policies 空 → `after.semiPolicies` 未設定(ADR-4 — 読み側 `semiPoliciesOf` が `[]` へ潰す) | ADR-4 / §C8 の表 |
| D4 | C15 の読み口 | `policyCount: grant?.policies.length ?? semiPoliciesOf(projection).length`(直読禁止・三段フォールバック不要)。`amadeus-utility.ts:345` の表示行差し替え、grant 明細の `policyCount` は残す | §C15 逐語 / ADR-4 Consequences |
| D5 | テスト層と seam | t443(unit — C8 書き側の表 5 行+C9 digest の差異/安定+Q1 照合の 3 分岐)/ t444(integration — FR-POL-1 の confirmed-policy 段解決・replay 復元・FR-DISP-2 の `--status` 実数表示・FR-POL-3 の CLI loud)。CLI 面(t444 の FR-POL-3)は spawn 駆動、純関数面は in-process | `unit-of-work.md` §テスト番号の予約 / `cid:code-generation:fs-tests-integration-first` |

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(Q1 は AUTO_DECIDED 裁定 ID 付きで記入済み)
- 未解決の設計判断: **なし**(Q1 裁定済み、D1〜D5 機械導出)
- 後続へ委ねる判断: U-6(allowlist 行ピン remap — 自 PR 実装時)
- 上流との矛盾: **なし**(Q1 裁定 A は §C9 の ⚠ が委譲した空欄を埋めるものであり、既存契約(policies 空の 1 段 UX・full の照合様式)を改変しない)

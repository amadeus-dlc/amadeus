# Business Rules — `semi-policy-carrier`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

依拠箇所: `requirements.md` 領域 D(FR-POL-1〜3)と FR-DISP-2(trace 先)、`components.md` ADR-4 / ADR-5、`component-methods.md` §C8〜C10 / §C15(逐語)、`services.md` §S10、`unit-of-work.md` §`semi-policy-carrier` 実装上の制約、`unit-of-work-story-map.md` §NFR の割当(FR-POL-3 の落ちる実証)。

---

## 決定規則と不変条件

| # | 規則 | 出所 |
| --- | --- | --- |
| R1 | **semiPolicies は任意フィールドのまま**: 必須化しない(既存 journal の replay 全損回避)。「方針ゼロ」=「フィールド不在」(空配列を書かない) | ADR-4 / `unit-of-work.md` 実装上の制約 |
| R2 | **読み口 1 本**: `projection.semiPolicies` の直読を作らない。消費は `semiPoliciesOf`(core Unit 所有)経由のみ — C15 の供給式も同関数を使う | ADR-4 Consequences / §C15 |
| R3 | **digest は 1 定義**: 非 full の確認 digest は `nonFullCommandDisplayDigest` のみが生成(2 箇所の既存生成を置換)。full 側と同形だが `principalId` / `scope` を含めない意図的相違を保存 | ADR-5 / §C9 |
| R4 | **照合は policies 非空のときのみ必須**(Q1 裁定 A): 等値照合は `planHumanAutonomyCommand` の `set-mode` / `revoke-full` 分岐、既存 `INVALID_COMMAND` 様式。policies 空の 1 段 UX は不変 | Q1(AUTO_DECIDED auto-decision-2b50bf576771acde61fe88cd1d7ca4bc) |
| R5 | **無音破棄の禁止**: 方針を受け付けない組み合わせ(`--mode none --policies-file`)は loud エラー。破棄経路を残さない | FR-POL-3 |
| R6 | **ガードは読取より先**: C10 のガードは `readDecisionPolicyInputs` の前(不正ファイルより mode 不整合を先に報告) | §C10 |
| R7 | **grant 非依存の表示**: `Policies:` 行は `policyCount`(grant または semiPolicies 由来)を表示。grant 明細・unavailable フォールバックは不変 | FR-DISP-2 / §C15 |
| R8 | **grant 意味論に触れない**: `set-mode` の値域へ `full` を追加しない。semi は `currentGrant === null` を維持(照合の追加は grant 発行儀式の複製ではない — digest 様式の再利用のみ) | FR-AUTH-3 / C-1 |
| R9 | **新エラー経路を作らない**: 失敗は既存 `INVALID_COMMAND` / CLI `error()` の 2 様式のみ | §C8 / §C10 |

## バリデーション論理

- policies の検証は `normalizeDecisionPolicies` の既存 throw(`invalid-decision-policy` / `duplicate-decision-policy`)→ 既存 catch → `INVALID_COMMAND` に閉じる。
- Q1 照合の述語: `command.policies.length > 0 && context.confirmedDisplayDigest !== nonFullCommandDisplayDigest({...})` → 拒否。等値照合は文字列比較(SHA256 形は `validHumanContext:285` が既に検査)。
- C15 は表示のみで検証を持たない(供給式の型が総関数 — 不在は 0 に潰れる)。

## テスト固定(受け入れ基準 → ケース対応)

| ケース群 | 対象 | 期待 |
| --- | --- | --- |
| P1(t455) | `--mode semi --policies-file` 適用 | projection から policy が読め、confirmed-policy 段で裁定解決(FR-POL-1) |
| P2(t454) | digest の差異 | 同一 mode・異なる policy 集合で digest が異なる(FR-POL-2) |
| P3(t454) | digest の安定 | 同一 policy 集合で digest 同値(FR-POL-2) |
| P4(t455) | replay 復元 | 拡張 `set-mode` の replay 後 projection が書込前後で一致(FR-POL-2) |
| P5(t455) | `--mode none --policies-file` | 非 0 exit + stderr 理由。落ちる実証: loud 化除去で赤(FR-POL-3) |
| P6(t455) | `--status` 表示 | policies 設定済み semi で `Policies:` が実数(FR-DISP-2 — `Policies: 0` でない) |
| P7(t454) | Q1 照合 3 分岐 | 非空+一致 ok / 非空+不一致 INVALID_COMMAND / 空 → 照合なし ok。落ちる実証: 照合除去で不一致ケースが赤 |
| P8(t454) | 方針ゼロの同一視 | policies 空の `set-mode` semi で `after.semiPolicies` 未設定(ADR-4) |

## 本 Unit が守らない(守る必要がない)規則の明示

- `semiPoliciesOf` の定義・片方向不変条件(C8 読み側)は `semi-authorization-core` の所有 — 本 Unit は書き手のみ。
- 梯子 0 段目(confirmed-policy)の照合ロジック自体(`resolveConfirmedPolicy`)は core Unit の改訂対象。
- statusline の `@<mode>` セグメント(FR-DISP-1)は `autonomy-statusline` の検収。

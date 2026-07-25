# Interaction Spec — 260724-harness-provenance

上流入力(consumes 全数): wireframes.md, user-flow.md, stories.md, requirements.md, team-practices.md

本仕様は rough-mockups の user-flow.md「Interaction Flow: ステージ実行時のハーネス記録」を、requirements.md の FR-2/FR-3/FR-1(選挙 E-HPFR3 裁定反映)に基づき詳細化したものである。stories.md の利用シナリオ「conductor として、intent を birth したとき、実行中のハーネス種別が自動記録されてほしい」が要求する自動記録経路を、以下のフローで具体化する。team-practices.md の Decided(functional-domain-modeling-ts スタイル、scalar フィールドは `getField`/`setOrInsertField` で十分)に従い、検出結果は単純な scalar 値として state.md へ記録する。

## 検出フロー(requirements.md FR-2/FR-3/FR-1 の詳細化)

```
[intent birth 開始]
       |
       v
[FR-2: process.env.CLAUDECODE === "1" ?]
       |-- yes --> harness = "claude-code" --> [state.md へ記録]
       |
       +-- no
             |
             v
       [FR-3: deriveHarnessDir() が .codex/.cursor/.opencode/.kiro を解決?]
             |-- yes --> harness = "codex"|"cursor"|"opencode"|"kiro"(補助シグナル) --> [state.md へ記録]
             |
             +-- no(.claude フォールバック or 未知)
                   |
                   v
             harness = "unknown" --> [state.md へ記録]
                   |
                   v
             [FR-1 AC-1d: ユーザーが manual 上書き可能(design段階で経路確定)]
```

## 各経路の確度(E-HPFR3 裁定反映)

- FR-2(env var): 確定値(feasibility-assessment.md TC-1 実測済み)
- FR-3(dot-dir): 非決定的な補助シグナル(E-HPFR3 裁定、常時 manual 上書き可能)
- unknown/manual: フォールバック

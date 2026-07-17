# Domain Entities — U1 opencode-skeleton

intent: `260715-opencode-cursor-harness` / Unit: U1
上流入力: application-design の component-methods.md(manifest 型契約)、requirements.md(AC-1b/1d)、unit-of-work.md / unit-of-work-story-map.md(視点3: open-set 実証の価値)、components.md(C1/C3)。

## エンティティ(functional-domain-modeling-ts スタイル適用面)

本 Unit の「ドメイン」は配布メタデータであり、既存の型宇宙(`scripts/manifest-types.ts`)に完全に載る — **新規ドメイン型は導入しない**(プリミティブを包む判断: 既存 `HarnessManifest` / `EmitContext` / `EmitResult` が正しさを既に型で運んでいるため、ラッパー追加は体裁のための微小型に該当し不採用)。

| エンティティ | 型 | 不変条件 |
| --- | --- | --- |
| opencode manifest | `HarnessManifest`(既存型) | name="opencode" / harnessDir=".opencode" / authoredExempt 明示 / skipRunnerGen=true |
| emission table | `ReadonlyArray<{dst: string, content: string}>`(emit 内部のモジュールローカル) | build と check が同一 table を消費(write⇔check の単一ソース) |
| harness.json | `{harnessDir, rulesSubdir}`(writeHarnessData 生成の2フィールド pretty-print — E-OC15 訂正) | amadeus-lib.ts:175-189(shippedRulesSubdir)/:191 の読み手契約に一致 |
| EmitResult | 既存型 | written = 書いた(または --check で書いたであろう)dst の全数(manifest-types.ts の実フィールド名) / problems = check モードの MISSING/DIFFERS のみ |

## 状態遷移

なし(ビルドは純粋な生成 — 永続状態を持たない)。dist ツリーの整合は dist:check の byte 照合が唯一の状態検査。

## frontend-components.md の不作成(CONDITIONAL 判定)

U1 は CLI/配布のみで UI を含まない — stage 定義の CONDITIONAL(「only if unit includes frontend/UI」)により frontend-components.md は作成しない(判定根拠: services.md のサービス一覧に UI 面なし、ui-less-mockups-as-output-contract の既決とも整合)。

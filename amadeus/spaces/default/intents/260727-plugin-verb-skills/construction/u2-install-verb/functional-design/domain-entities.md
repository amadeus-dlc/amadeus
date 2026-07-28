# Domain Entities — U2 u2-install-verb

上流入力(consumes 全数): component-methods.md(C1 変更点の正本)、requirements.md(FR-1)、services.md(結果契約)、components.md(C1)、unit-of-work.md(U2)、unit-of-work-story-map.md(導入ジャーニー)

## 型拡張(すべて既存判別 union への機械追加)

| エンティティ | 形 | 備考 |
|---|---|---|
| `PluginCliCommand` へ追加 | `{ kind: "install"; sourcePath: string; force: boolean; projectRoot?: string }` | component-methods.md C1 と同一(正本参照 — 独立再定義しない) |
| `PluginCliResult` へ追加 | `{ kind: "installed"; name: string; composeOutcome: "composed" \| "noop" }` | exit 0 系 |
| `failure.stage` へ追加 | `"install"`(5値→6値) | renderPluginCliResult の網羅 switch が型で強制 |
| `StagingEntryState` | `"absent" \| "identical" \| "different"` | 衝突判定の3値(BR-U2-1) |
| `PluginCliDeps` へ追加 | `stagingEntryState(dst: string, src: string): StagingEntryState` / `copyPluginSource(src: string, dst: string): void` | 2 seam — **component-methods.md C1 の canonical 形(2引数)と逐語一致**。tmp→退避→rename の原子的 swap は copyPluginSource 既定実装の内部契約(business-logic-model.md Step 3 α〜δ)であり seam 面には現れない。テストは実 FS tmp dir で駆動(fake FS にしない — fs-tests-integration-first) |

## 不変条件

- staging のエントリは「absent か、完全な plugin ディレクトリか」の2状態のみ(中間状態は tmp 名前空間に閉じる — BR-U2-2)
- `identical` 判定は決定的(ファイル集合の一致+各ファイルのバイト一致)。タイムスタンプ・パーミッションは判定に含めない(コピーで正規化される面を契約に持ち込まない)
- install は `<hostRoot>/.amadeus-plugin-src/` の外に書き込まない(compose 委譲先の書込は既存契約に従う)

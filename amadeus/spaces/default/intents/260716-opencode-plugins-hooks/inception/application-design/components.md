# Components — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜5)、codekb の architecture.md・component-inventory.md(re-scan 鮮度確認済み)、`../practices-discovery/team-practices.md`(live 温存)。

## コンポーネント(C1〜C5)

| # | コンポーネント | 所在 | 責務 |
|---|---|---|---|
| C1 | amadeus-opencode-plugin(entrypoint) | `packages/framework/harness/opencode/plugin/amadeus-opencode-plugin.ts`(新規 — ADR-1 で dir 分離) | `export const AmadeusPlugin = async (ctx) => ({...hooks})`(C-5 形式)。フック登録のみの薄い殻(cursor adapter 24行 同型) |
| C2 | amadeus-opencode-lib(写像 lib) | 同 dir `amadeus-opencode-lib.ts`(新規、推定 ~250行 — cursor-lib 264行 同型比較) | 純関数 seam `reconstruct(event, payload)`(cursor-lib :96-201 同型): opencode フック→ core hook stdin JSON の写像+ToolNameMap 相当(実測確定値のみ)+advisory reject。spawn は `env: process.env` 明示 |
| C3 | 写像対応表(工程0 成果物) | `<record>/construction/.../code-generation/` 収載+lib ヘッダコメント | FR-1 の表(配線/⚠/未対応の3値、一次ソース verbatim 根拠)。推定 8〜12行の表+根拠注記(cursor 工程0 コメント :10-29 同規模) |
| C4 | テスト | `tests/unit/`(純関数)+`tests/integration/`(実 FS 面) | AC-3a の2系+落ちる実証(実行時消費行 — E-PM7 M3)。推定 2ファイル・計 ~150行(#1048 t230 = 1ファイル同規模比較) |
| C5 | manifest 配線+docs | `manifest.ts`(harnessFiles へ plugin 2ファイル追加)+機能単位表 | regen で `dist/opencode/.opencode/plugins/` へ配布(AC-4a/4b)。authoredExempt は不要(ADR-1: hooks/ 非同居)。推定 manifest +4行・docs 表 1〜3行更新 |

## 非変更(reuse inventory)

core hooks 11本(無改変 — AC-2b)、package.ts(harness 自動発見)、Cursor アダプタ(参照のみ)、dist 全ツリー(regen のみ)。

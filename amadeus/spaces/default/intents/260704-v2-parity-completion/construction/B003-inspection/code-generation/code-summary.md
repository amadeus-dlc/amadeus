# Code Summary：B003 検査整備

## 変更ファイル

| 変更 | 内容 | 対応する要求 |
|---|---|---|
| `docs/backward-compatibility.md`（新規） | 互換性維持対象 3 record（完了済み 2 件 + 進行中 hybrid 1 件）を対象、理由、終了条件つきで登録 | R009、R006 |
| validator（lifecycle-v2.ts、AmadeusValidator.ts。source と昇格先を同期） | backward-compatibility.md 記載 record は旧形式検査を維持し、未記載 record へ v2 契約検査（stage frontmatter produces 由来の必須成果物、phase-check、audit shard）を適用。TDD（V12〜V17 を先に RED 確認） | R006、R007 |
| `dev-scripts/generate-parity-baseline.ts` + `dev-scripts/data/parity-baseline.json`（新規） | 上流 fde1e1af から 38 skill と engine 197 ファイルの sha256 を抽出した基準 manifest | R008 |
| `dev-scripts/parity-check.ts` + `dev-scripts/data/parity-map.json` + `dev-scripts/evals/parity/check.ts`（新規） | 名前写像と除外リストつきパリティ検査。TDD（Module not found で RED 確認） | R008 |
| `package.json` | `parity:check`、`parity:baseline:generate`、`test:it:parity` を追加し、test:ci:mock 連鎖へ組み込み | R008 |
| record 配置の是正 | 3.5 成果物を `construction/<bolt-id>/code-generation/` へ移動、per-unit ラベル正規化、build-and-test の STAGE_COMPLETED 補完 | R006 |

## パリティ検査の初回結果

差分ゼロ（38 skill、engine 197 ファイル、rules/aidlc.md すべて一致）。除外での吸収は不要だった。

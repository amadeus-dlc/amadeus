# Components — Presence Evidence（260705-presence-evidence）

上流入力: [requirements.md](../requirements-analysis/requirements.md)、[mockups.md](../refined-mockups/mockups.md)

## 構成

成果物は文書 2 ファイルの変更であり、実行時コンポーネントは存在しない。

| 変更対象 | 内容 | 対応 FR / AD |
|---|---|---|
| `.agents/amadeus/knowledge/amadeus-shared/audit-format.md`（70 events 版 = 正） | 設計境界の説明節（独立 H2）を追加。骨子は mockups.md の 5 要素 | FR-1.1〜1.5 |
| `dev-scripts/data/parity-map.json` | 既存 exceptions エントリ（#499 由来、tools 3 ファイル + audit-format.md の 4 対象共有）の reason へ本追記の説明を追補。共有 reason のため、他 3 ファイル（docsOnly ガード解消）の説明と混同しない書き方にする | AD-3 |

## エンジン配布資産への追記に伴う同期確認（requirements の引き継ぎ事項）

- parity-map の実内容を確認した（reviewer 検証を反映）: `checkedEngineDirectories` は `knowledge` を含み、`knowledge/aidlc-shared/ → knowledge/amadeus-shared/` の shared-dir 対応がある。`knowledge/aidlc-shared/audit-format.md` は **engineFileExceptions に登録済み**で、その `reason`（Issue #499 由来）は GUARD_EXEMPTED 追記までを説明している。
- したがって正しい扱いは「新規例外宣言は不要（登録済み）だが、**既存 exception の reason へ本 Intent の追記（Evidence verification boundary 節）の説明を追補する**」である。parity:check は path 単位 exception により追記後も pass するため、pass は例外の妥当性の裏取りにならない — 妥当性は reason の記述で担保する。
- dev-scripts/data/parity-map.json の reason 追補は本 PR に含める（共有ファイルへの追記型接触。並行 Intent と衝突しても union 解消可能）。skills 側 references（68 events 版）は上流凍結コピーのため触れない。

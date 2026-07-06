# Refined Mockups Questions — 260706-installer-versioning（Issue #543）

上流入力: [mockups.md](mockups.md)、[interaction-spec.md](interaction-spec.md)

## 確認済み事項（本ステージで確定した細目）

| 論点 | 確定 | 根拠 |
|---|---|---|
| ステップ段数・ラベル | 実装どおり 5 段（engine〔AMADEUS.md 内包〕/ skills / symlinks / settings / smoke）を維持 | 出力互換の最大化（US-3）。§12a 反復 1 が rough 由来の誤ラベル（AMADEUS.md 独立段、symlinks 欠落）を検出し実装照合で確定 |
| FR-2.6（廃止ファイル退避）の観測位置と集計 | summary ヘッダ件数 = 退避総数（コピー由来 + 廃止由来）で列挙行数と常に一致。廃止分は内数行（`N of the above is obsolete`）で告知。ステップ行には出さない | 廃止走査はコピー段階に属さない。ヘッダと列挙の件数一致は FR-5.1(f)/(h) の assertion を一意にする（§12a 反復 1 で未決定、反復 2 で集計矛盾を指摘され確定） |
| version-info の exit code | 導入済み = 0、不在 = 1（stderr + fix:） | rpm -q / dpkg -s の「未導入 = 非 0」慣行と一致し、CI は `--version-info || 導入` で分岐できる（§12a 反復 1 が当初案 = 常に 0 の根拠矛盾を指摘 → 先行事例準拠へ再設計） |
| bootstrap の告知行 | `no previous manifest — treating differing files as customized` | 保守的挙動の明示（無言にしない） |
| 途中失敗時の manifest | runStep 失敗・smoke 失敗とも書き出さない（前回のまま） | 失敗した導入を「導入済み」と記録しない。再実行の 3-way が (d) 象限で自然に回復し二重退避しない（smoke ケースは §12a 反復 1 の指摘で明示化） |
| files キーの並び | 辞書順 | manifest diff の安定性 |
| sourceCommit unknown 告知の位置 | `installing into` 直後（previous install 行の前） | シーケンス上の一意な位置の確定（§12a 反復 1） |

新規のピア協議・人間質問はない（version-info exit code の再設計は先行事例 = 協議で採用済みの市場調査の帰結に沿う変更のため、gate 承認で確定する）。

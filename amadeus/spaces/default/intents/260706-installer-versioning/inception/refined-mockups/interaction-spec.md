# Interaction Spec — 260706-installer-versioning（Issue #543）

上流入力: [mockups.md](mockups.md)、[user-flow.md](../../ideation/rough-mockups/user-flow.md)、[requirements.md](../requirements-analysis/requirements.md)

## CLI 相互作用（対話なし = C-1）

| 入力 | 挙動 | 出力先 / exit |
|---|---|---|
| `--target <ws>` | 導入・更新を実行（3-way + 退避 + manifest 書き出し） | stdout、成功 0 / 失敗 1 |
| `--target <ws> --version-info` | manifest を読んで版情報 1 行を表示。インストールしない | 存在 = stdout、0。不在 = stderr、1（rpm -q / dpkg -s と同じ「未導入 = 非 0」慣行。fix: を含む） |
| `--version-info`（--target なし） | usage エラー | stderr、1 |
| 未知の引数 | 既存どおり usage エラー | stderr、1 |

## 状態遷移（更新実行の内部順序）

1. manifest 読み込み（不在 = bootstrap モード告知）。
2. previous install found 告知（manifest 存在時）。
3. 各コピー段階（engine〔AMADEUS.md 内包〕→ skills → symlinks → settings。実装の runStep 1〜4）で書き込み前に 3-way 判定 → 必要なら退避 → 書き込み。退避は最初の発生時に時刻 dir を 1 個作成。symlinks はリンク再作成のみでハッシュ対象の書き込みを持たない。
4. 廃止ファイル走査（旧 manifest にあり新配布物にないもの。改変なら退避 = FR-2.6）。
5. smoke（doctor）。
6. summary（退避列挙・restored 件数）→ manifest 書き出し（全コピー後 1 回 = FR-1.3）→ done 行。

## エラー時の相互作用

- 途中失敗（runStep 1〜4 の失敗、smoke 失敗のいずれも）は既存規約どおり fix: 付きで exit 1。manifest は書き出さない（失敗した導入を「導入済み」と記録しない。前回 manifest が残る = 次回再実行で再判定。退避済み + 上書き済みファイルは再実行時の 3-way で「現状 = 新配布物」象限に落ちるため二重退避しない）。smoke はコピー後の検査であり、smoke 失敗時もコピーは完了しているが、manifest 非更新により version-info は前回導入を報告する（失敗を成功として記録しない側に倒す）。

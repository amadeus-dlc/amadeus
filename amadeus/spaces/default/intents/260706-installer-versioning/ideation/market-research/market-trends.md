# Market Trends — 260706-installer-versioning（Issue #543）

上流入力: [competitive-analysis.md](competitive-analysis.md)

## 傾向

1. **ハッシュ記録による 3-way が事実上の標準**: dpkg / rpm / pacman とも「導入時に配布時ハッシュを記録し、更新時に 3 者比較する」構造で収斂している。ハッシュを記録しない全置換（現行インストーラ）は、設定的ファイルを持つ配布物では少数派である。
2. **自動化環境では非対話が既定へ**: CI・コンテナビルドでは dpkg も `--force-conf*` で非対話化して使うのが通例であり、rpm / pacman は最初から非対話。改変検出時に「止めて聞く」のではなく「決定論的に併置または退避し、後から人間が確認する」方向が主流。
3. **manifest / lockfile 文化**: 言語系パッケージマネージャ（npm の package-lock、Cargo.lock 等）は「何をどの版で入れたか」を単一ファイルに記録する。導入先に置く manifest（版 + ハッシュ表）はこの文化とも整合する。

## 本 Intent への含意

- 非対話 1 コマンド制約（#451 確定 4）は先行事例の潮流と両立する。採るべきは「rpm / pacman 型の決定論的な併置または退避 + 実行後サマリでの通知」。
- 導入先 manifest は dpkg / rpm の DB に相当する役割を単一 JSON で担える（repo 側に DB を持たない配布形態に適する）。

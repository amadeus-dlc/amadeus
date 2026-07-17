# Code Generation Plan — fix-1085-covci-flake

## 上流入力(consumes 全数)

requirements.md(FR-1〜5)、RE scan-notes(計上機構・未確定仮説)、Issue #1085(実測台帳)。

## 実施計画(FR-1/FR-2 = 調査実行、FR-3 = 裁定待ち分岐)

1. 能動再現ハーネス(repo 外 scratch、`covci-attempt.sh` 系): tee 全文捕捉+PIPESTATUS 非経由 exit+負荷3プロファイル(integration 連走 / 16コア飽和 / coverage:ci 並走)
2. AC-2c 定量検証: passing run の tee 全文への素朴 grep 件数(planted 文字列×3種)とブロック帰属
3. 結果の Issue #1085 追記(確定値のみ)
4. FR-3: 非再現側 pre-declared 分岐 → E-1085-FIX 選挙(A 保留 / B 負荷検出ガード / C リトライ)— 裁定後に本計画へ追記して実装 or クローズ整理

## 変更目録

裁定 A の場合: リポジトリ変更ゼロ(調査成果は Issue+record)。裁定 B/C の場合: 裁定後に目録を確定し本ファイルへ追記(逸脱実装前停止)。

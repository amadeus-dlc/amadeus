# Reliability Design — install-flow

> ステージ: nfr-design (3.3) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../nfr-requirements/reliability-requirements.md`(REL-I01〜I04)・`tech-stack-decisions.md`(rename 原子性)、`../functional-design/domain-entities.md`(ApplyResult)

## REL-I01(部分適用の検出可能性)の実装構造

- applier はエントリ毎に try し、失敗を ApplyFailure として**収集して続行しない**(最初の失敗で残りをスキップし即返す — 「進めるほど壊す」を避ける)。ApplyResult.hasFailures() が true なら cli はマニフェスト書き込みへ到達しない(到達順序契約)
- 検証: fault-injection(書き込み不能ディレクトリ)で「失敗以降のエントリが未適用・マニフェスト不在・終了コード1」をアサート

## REL-I02(再実行安全性)の実装構造

- 導入済み検出は install パイプラインの**最初の I/O**(detect が resolve/fetch より先 — U2 workflow 2 の順序を実装で固定)。ネットワークコストをかける前に中断する
- `--force` 再実行の収束: 同一プラン生成 → 同一適用(退避ファイル名は Timestamps.of により実行ごと一意 — 上書き衝突なし)

## REL-I03/I04 の実装構造

- ApplyResult は Plan のエントリ参照を保持し、レポート突合テストは entries() と appliedEntries() の集合差分で機械検証
- 終了コードは main() の単一 return 経路に集約(散在させない — BR-I06 の全経路アサートを可能にする構造)

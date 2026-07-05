# Code Generation Plan — codekb-refresh

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 計画

現行実体の実測（tools 26 / hooks 11 / stage 32 / skills 41→44 / evals 25 / scopes 9）を収集し、9 ファイルを再解析スナップショットとして書き直す。退役機構は component-inventory の「退役済み」節へ隔離。パス参照は機械検査（実欠落 0 件、brace 展開由来の偽陽性 6 件は手動確認で実在）。

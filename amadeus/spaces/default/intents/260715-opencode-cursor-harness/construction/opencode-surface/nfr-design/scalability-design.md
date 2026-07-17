# Scalability Design — U2 opencode-surface

intent: 260715-opencode-cursor-harness / Unit: U2
上流入力: nfr-requirements(scalability-requirements.md SC-U2-1)、U1 の nfr-design。

## 設計

SC-U2-1 の実現 = skills 合成関数を「skill ディレクトリ列挙 → table エントリ化」の汎用形にし、skill 追加時のコード変更ゼロ(ディスクから discover — 手書き複製の禁止に整合)。

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。

# Scalability Requirements — U2 u2-install-verb

上流入力(consumes 全数): business-logic-model.md、business-rules.md(BR-U2-1)、requirements.md(横断チェックリスト)、technology-stack.md

## SC-U2-1: 該当なし(根拠付き N/A)

規模変数は plugin ディレクトリのファイル数のみ(requirements.md 横断チェックリスト: ページング不要)。identical 判定(business-rules.md BR-U2-1 のバイト一致)は全ファイル走査だが対象実規模(参照 plugin = 3ファイル、conductor 実測)で問題にならず、strength を落とす最適化(ハッシュキャッシュ等)を持ち込まない(business-logic-model.md の決定的判定を優先、technology-stack.md の CLI 境界に常駐機構なし — nfr-design:c1)。

## 再評価条件

identical 判定が体感遅延(数秒)を生む規模の plugin が現れた時点で別 intent。

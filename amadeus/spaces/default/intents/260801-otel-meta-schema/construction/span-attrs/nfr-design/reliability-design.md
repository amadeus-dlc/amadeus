# Reliability Design — U2 span-attrs

上流入力(consumes 全数): reliability-requirements ほか performance-requirements / security-requirements / scalability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— 信頼性要件は requirements.md NFR-1(fail-open)から代替導出。business-logic-model.md(実在)の「両キー省略」fail-open 契約(journal 側フォールバックとの意図的相違)を消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## 失敗面の分類

- **cursor 不在・intent 未解決**: amadeus.intent / amadeus.space の**両キー省略**(journal 側の "workspace"/DEFAULT_SPACE フォールバックとは意図的相違 — span 属性は不在が正、FD 承認済み)
- **state ファイル不在・stage 未解決**: amadeus.stage / amadeus.phase を省略
- **env 不在(現行ハーネス全て)**: amadeus.agent.type / amadeus.agent.id を省略 — resolver は fail-open な受け口のみ(FD 実測確定)
- resolver 内部の予期しない失敗(読取例外等)は try で遮断し全キー省略へ縮退 — span 生成自体は継続(NFR-1)
- retry / circuit breaker は非適用 — ローカル file 読取のみ(nfr-design:c1)

## 部分解決の独立性

- 6キーの解決は互いに独立 — intent 解決失敗が stage 解決を落とさない(per-key try)。省略キーの組合せは任意に成立し、いずれも emit を止めない

## 検証(落ちる実証)

- cursor 不在・state 不在・env 不在・内部例外(注入)の各経路で「該当キー省略+span 生成継続」を assert。経路到達は lcov DA で実測確認(error-path-reach-lcov — 偽経路 green の排除)

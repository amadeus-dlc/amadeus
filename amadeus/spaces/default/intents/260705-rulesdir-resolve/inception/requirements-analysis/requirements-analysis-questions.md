# Requirements Analysis 質問（260705-rulesdir-resolve）

対象 Issue: [#491](https://github.com/amadeus-dlc/amadeus/issues/491)

Maintainer の包括委任（sub 割り当て）に基づき、推奨案で自己回答する。

---

## Q1. 既定解決の堅牢化の方式は？

A. ツール位置から上方向へ「`aidlc/spaces` を含むディレクトリ」を探索する（walk-up。1 階層 = 旧 .claude/tools と 2 階層 = 現 .agents/amadeus/tools の両レイアウトを吸収し、レイアウト変更にも追従する）。AIDLC_RULES_DIR による明示指定は最優先のまま維持
B. 現レイアウト（2 階層）の相対パスへ固定する
X. Other (please specify)

[Answer]: A（B は次のレイアウト変更で同じバグを再発させる。walk-up は project.md の learning「path 解決は record path 構造で行う」と同系の、構造を根拠にした解決。CLAUDE_PROJECT_DIR は graph compile が hook 外の CLI 実行でも使われるため一次根拠にしない）

## Q2. fail-loud ガードの条件は？

A. 解決した memory ディレクトリが実在するのに rule 候補が 0 件のときだけ compile をエラー停止する。memory ディレクトリ自体が無い場合は従来どおり []（sandbox・未 scaffold ワークスペースの互換）
X. Other (please specify)

[Answer]: A（Issue の実施候補 2 のとおり。「dir 不在 = 未整備」と「dir 実在なのに 0 件 = 解決バグか消失」を区別し、後者だけを無音にしない）

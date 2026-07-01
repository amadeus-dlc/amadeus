# D003: Unit と Bolt の粒度

## 背景

Issue #272 の成功条件は、`dry-run` の読み取り専用契約と、source skill、昇格先成果物、eval、validator の検証に分かれる。

`dry-run` の候補表示契約と同期検証を同じ Unit にまとめると、利用者価値と検証証拠の責務が混ざる。

## 判断

Unit は、U001 `discovery dry-run contract` と U002 `dry-run sync verification` に分ける。

Bolt は、B001 `discovery dry-run mode contract` と B002 `dry-run sync verification` に分ける。

## 理由

U001 は、読み取り専用 mode としての候補表示契約を扱う。
U002 は、source skill、昇格先成果物、eval または text contract、validator の検証証拠を扱う。

B001 は source skill の契約更新を実行する。
B002 は昇格先成果物への反映と text contract の検証を実行する。

この分割なら、Construction で Task Generation へ渡す作業粒度と証拠候補を分けられる。

## 影響

Construction では、B001 の完了後に B002 を実行する。

B002 では promote-skill、text contract、validator、必要な標準検証の結果を `test-results.md` に記録する。

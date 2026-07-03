# Memory: feasibility

## Interpretations

- 上流 `dist/claude/`（fde1e1af）を、Claude Code で動作する完成品として扱った。最終確認は walking skeleton Bolt に委ねる。
- 3.6 のファイル名矛盾は上流内の不一致であり、エンジンの成果物解決を正とすることで解消できると解釈した。
- 「共存」を、既存開発環境の設定とツールが移行後も同じ挙動で動くこと、と解釈した。

## Deviations

- 質問の前に、自力で解消できる不確実性 2 件（dist/claude 構造、3.6 実名）を上流の shallow clone で調査した。質問数は 3 問で、Depth: Standard の目安より少ないが、残る未確定点が制約 3 件に収束していたためである。

## Tradeoffs

- 基準 commit の固定は、上流の鮮度より再現性とレビュー可能性を優先する。
- 共存制約（C001）は、パリティの最大化（上流 settings.json の完全一致）を一部犠牲にする。差は除外リストで管理する。
- examples の旧契約保持は、移行期間中の二重契約を受け入れる代わりに、`npm run test:examples` の長期 red を避ける。

## Open questions

- 結線層の具体設計（エンジン directive のどこに amadeus-grilling を挟むか。questions ファイル生成と gate 提示のどちらに割り込むか）。Inception の Application Design で確定する。
- 上流の agents、rules、scopes、knowledge ディレクトリのコピー範囲（全部か、skill と tools に必要な分だけか）。Scope Definition の backlog で扱う。
- examples 再生成の順序と、移行中の provenance の扱い。

# Domain Entities — u3-boundary-guard

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## E1: 検査対象4面(components.md C6 の検査対象定義から導出)

| 面 | 実体 | 由来 |
|---|---|---|
| plugins/ | プラグイン正本(stages/ + 移設後 tools/) | u1 着地後の姿 |
| dist/plugins/ | 8 変種(7 ハーネス+中立)| projection(services.md の配布面) |
| .claude/plugins/ | compose 済みコピー | compose(component-methods.md C2 面) |
| .claude/.amadeus-plugin-src/ | staging | install |

## E2: 違反レコード

`{ file, line, matchedText }` — 列挙は決定的順序(ファイル名昇順・行番号昇順)で安定出力(テスト assert の安定性)。

## E3: 許容リスト(初期空)

`{ path, reason }` の配列。空でない場合は理由必須(fail-closed)。unit-of-work.md u3 の AC(落ちる実証の record 記録)は fixture テストケースが恒久化する。

# Business Rules — upstream-sync

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## composed scope と compile の共存規約（R008、設計 gate で人間再確認）

衝突の構造: 上流 composer は custom scope を `scopes/amadeus-<name>.md` + `scope-grid.json` への直接 entry 追記で作り、「書き込み後に `amadeus-graph.ts compile` を実行しない」ことを persona で禁じる（compile は stage frontmatter の `scopes:` タグから grid を全生成するため、frontmatter タグを持たない composed entry を落とす。上流 aidlc-composer-agent.md 90〜96 行目）。一方、当方は pdm scope の維持のために compile を常用する（R005）。両立させる規約を次のとおり定める。

1. composed scope は暫定 entry である。composer の 2 ファイル書き込み（scope .md + grid entry）は、その Intent の実行を成立させる一時状態として扱う。
2. composed scope を継続採用する場合は、compile 実行前に正式化する。正式化とは、composed entry の EXECUTE 集合を各 stage frontmatter の `scopes:` リストへ転記し、compile で同一 entry が再生成されることを確認する手順である（pdm が前例。転記後は composed entry と compile 生成が一致し、以後の compile で落ちない）。
3. 正式化しない composed scope が存在する間は、compile を実行する側が退避・復元に責任を持つ。compile 前に `scope-grid.json` の composed entry（stage frontmatter にタグを持たない scope 名）を控え、compile 後に同 entry を復元する。復元漏れは `detect --json` の scopes 一覧と scope .md ファイルの突き合わせで検出できる。
4. エンジン（amadeus-graph.ts の compile）には手を入れない。この規約は運用規約であり、上流パリティに影響しない（適応点を rename + grilling 結線に限定する承認済み方針の内数）。
5. 既定運用の注記: default space の自己開発では stock 9 scope + pdm で足りており、composer による custom scope 作成は当面使わない見込みである。規約 2〜3 は composer を実際に使う workspace 構成が現れたときの防護である。

## 取り込みの一般規則

- 無改変再コピー原則: 上流ファイルの局所改変を行わない（CD001 継続）。当方 fix が必要なファイルは engineFileExceptions で追跡し、上流が同修正を取り込んだら例外を解除する（project.md Corrections c3）。
- 合流ファイルの統合規則: audit-format.md のような双方加筆ファイルは、追記型 union（上流の新イベント + 当方の新イベントを両方保持し、Registry 数を実数に更新）で統合する。記録済みイベント定義の書き換えはしない。
- pdm 再タグの順序規則: 上流 stage md の再コピー → pdm タグ再付与 → compile → scope-table の順を守る。順序を崩すと grid から pdm が落ちる。
- インストーラ整合規則: エンジン 7 dir / symlink 7 entry / hooks 配線の MANIFEST と dist 構成の一致を `test:it:installer` で検証してから PR を作る（R009）。

## 制約

- C-1: Construction 開始は engineer3 の bugfix PR merge 後（R010、leader 調整指示）。rebase 時に engineFileExceptions 配列で engineer3 の追加 5 件と本 Intent の解除・維持が同一配列を編集し git マージが生じうるが、変更対象ファイルの交差はゼロのため union で解消する（reviewer 観察）。
- C-2: merge 操作は人間が行う（team.md）。
- C-3: 検証は同一 worktree 内で直列に実行する（並行運用ポリシー）。

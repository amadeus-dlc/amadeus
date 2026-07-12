# Business Rules — U3

1. 権限は job 単位 `permissions: contents: write` のみ(workflow 全体は read 維持 — 最小権限)
2. ループ防止の二重ガード: GITHUB_TOKEN push の非再トリガー(一次)+ push paths-ignore に metrics/ を追加しない設計判断の文書化(GITHUB_TOKEN 非トリガーが既に十分 — release.yml 前例。paths-ignore は「人間が metrics/ を手編集した場合に CI が走らない」副作用があるため不採)
3. 落ちる実証: ループ非誘発とコミット到達の両方を着地後の実 CI run で確認し code-summary に記録

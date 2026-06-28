# Architecture Decision Records

このディレクトリは、Amadeus DLC の構造、境界、長期的な判断を記録する。

## 同期ルール

採用済み ADR が新しいドメイン語彙を導入した場合は、同じ PR または直後の follow-up PR で `CONTEXT.md` に反映する。

`CONTEXT.md` は語彙の定義元である。

ADR は、語彙を採用した理由、却下した案、影響、未決定事項を記録する。

ADR と `CONTEXT.md` がずれた場合は、採用済み ADR の判断を読み、確定語彙だけを `CONTEXT.md` へ逆同期する。

未決定事項は `CONTEXT.md` に確定語彙として追加しない。

## ADR 一覧

| ADR | 状態 | 概要 |
|---|---|---|
| [0001](0001-lifecycle-binding-profile.md) | 採用 | Lifecycle Binding と Profile で Agent Skills を DLC に束ねる。 |

# Architecture Decision Records

このディレクトリは、Amadeus DLC の構造、境界、長期的な判断を記録する。

## 同期ルール

採用済み ADR が新しいドメイン語彙を導入した場合は、同じ PR または直後の follow-up PR で `CONTEXT.md` に反映する。

現在の実装が `CONTEXT.md` にないドメイン語彙や境界を実質的に固定している場合も、`CONTEXT.md` へ反映する。

merge 済みの `git log -p` が、過去の判断、改名、境界変更、成果物契約の変化を示している場合も、`CONTEXT.md` または ADR へ逆同期する。

`CONTEXT.md` は語彙の定義元である。

ADR は、語彙を採用した理由、却下した案、影響、未決定事項を記録する。

ADR と `CONTEXT.md` がずれた場合は、採用済み ADR の判断を読み、確定語彙だけを `CONTEXT.md` へ逆同期する。

実装と `CONTEXT.md` がずれた場合は、現在の実装を読み、現行挙動として確定している語彙だけを `CONTEXT.md` へ逆同期する。

`git log -p` と現在の実装がずれた場合は、現在の実装を優先し、`git log -p` は判断経緯の確認に使う。

未決定事項は `CONTEXT.md` に確定語彙として追加しない。

一時的な実装都合、ローカル変数名、単発のファイル名、未採用の過去案は `CONTEXT.md` に追加しない。

## ADR 一覧

| ADR | 状態 | 概要 |
|---|---|---|
| [0001](0001-lifecycle-binding-profile.md) | 採用 | Lifecycle Binding と Profile で Agent Skills を DLC に束ねる。 |
| [0002](0002-intent-phase-directory-layout.md) | 採用 | Intent Phase Directory Layout を採用する。 |
| [0003](0003-scope-control-values-source.md) | 採用 | scope 制御値の定義元を `scope.md` に限定する。 |

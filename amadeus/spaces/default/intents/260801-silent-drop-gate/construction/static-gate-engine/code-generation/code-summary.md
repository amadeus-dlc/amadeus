# Code Summary — static-gate-engine

## 実装結果

- 初期統合コミット: `da7d9113f`（元 Bolt commit: `7faa19056`）。complexity追補: `a1de37be1`。
- 最終レビュー追補: semantic contract `d464fe8e7`、verified mutation delegate `ab9105631`、persisted transition failure `233927cbf`。
- `tests/no-silent-drop-gate.ts` を entrypoint とし、`model.ts`、`ast-scan.ts`、`ledger.ts`、`engine.ts` に責務を分離した。
- ast-grepは構造candidate抽出に限定し、TypeScript Program／TypeCheckerと限定path-state解析でNSD001〜NSD003を判定する。catch全経路、`applyTransition(): StateResult` の破棄、4つの承認済みmutation targetをfail-closedで検査する。
- `verifyStageMutation` への直接委譲と `persistBlocked` の `failed` discriminant処理は、callee型・単一定義・helper body・呼出側のguard／postcondition／success順序を検証した場合だけ安全とする。
- baseline／exemptions／approval と4 mode のevidence chain、trusted full-SHA shrink-only ratchetに加え、初回base ledger欠落時だけ使えるexact-bytes bootstrap provenanceを追加した。
- `@ast-grep/napi@0.45.0` を exact local dependency として固定し、`bun run no-silent-drop` を追加した。
- reviewerの3反例、unresolved／ambiguous semantic contract、unsafe helper委譲、bootstrap改変をfalling proofへ追加した。

## 検証結果

- 最終focused（U1/U4統合）: 57件、191 assertions成功。no-silent-drop gate単体は27件成功。
- trusted pre censusは227件、post censusは223件。removed 4件は#1874／#1878だけ、added 0件、postのNSD002／NSD003は0件。
- `bun run no-silent-drop -- --base-revision 47574fbabf274e11cb8e0b37bf35a0309a7b3d42`、typecheck、lint、complexity、distribution、`bun run check`: 成功。
- raw lizardは追加関数CCN≤15。bootstrap validatorは分割後CCN 1、bootstrap file最大CCN 10。

## 計画との差分

evidence command は正本を自動更新せず、read-only envelope と新規 output path に限定した。初回CIをredにしないためのbootstrap fallbackは、baseにbaselineが存在しない場合だけ許可し、baseにledgerがある通常運用では再利用を禁止した。CI workflow への blocking step 追加は所有境界どおり後続 Unit へ残した。

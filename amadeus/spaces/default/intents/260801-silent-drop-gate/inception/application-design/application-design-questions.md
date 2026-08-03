# Application Design 質問 — 260801-silent-drop-gate

> 上流証跡: `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。AWS、UI、HTTP、DB、常駐 service は非適用と確定済みのため再質問しない。
>
> ユーザー承認: 2026-08-02T03:13:00Z（Q1〜Q5 の回答と合意サマリを確認）

## Q1. no-silent-drop の component 境界

既存 gate は contributor-side の短命 CLI であり、runtime と独立している。新 gate の責務分割と deploy 単位を決める。

- A. 単一 CLI＋pure component（推奨）: 1つの `no-silent-drop` CLI の内側を config/catalog、scanner、rule adapter、census normalizer、baseline/exemption policy、result renderer に分ける。全 component は同じ Bun process／同じ repository で配布し、別 service や汎用 framework を作らない
- B. rule ごとに独立 CLI: `NSD001`〜`NSD003` を別 process とし、CI で集約する
- C. runtime tool へ統合: `.codex/tools/` の Amadeus runtime command として配布先 workspace でも実行する
- D. 既存 gate へ統合: `callsite-guard.ts` または `complexity-gate.ts` の責務へ追加する
- X. Other (please specify)

[Answer]: A — 1つの `no-silent-drop` CLI の内側を config/catalog、scanner、rule adapter、census normalizer、baseline/exemption policy、result renderer に分ける。全 component は同じ Bun process／同じ repository で配布し、別 service や汎用 framework を作らない（2026-08-02T03:08:00Z、Guide me、ユーザー回答「1」）

## Q2. ast-grep の接続方式

公式には固定可能な `@ast-grep/cli` と experimental な `@ast-grep/napi` がある。Bun frozen install、15秒、typed failure を満たす接続を決める。

- A. pinned CLI adapter（推奨）: `@ast-grep/cli` を exact devDependency と lockfile に固定し、Bun の process adapter が絶対解決した binary を argv 配列で起動する。stdout JSON／exit／stderr を型付き decode し、tool missing・schema drift・非0終了を fail-closed にする
- B. NAPI 直接利用: `@ast-grep/napi` を import し、同一 process で AST を走査する
- C. system binary: Homebrew／Cargo 等で導入済みの `ast-grep` を PATH から探す
- D. `bunx` 都度解決: CI 実行ごとに registry から CLI を解決する
- X. Other (please specify)

[Answer]: A — `@ast-grep/cli` を exact devDependency と lockfile に固定し、Bun の process adapter が絶対解決した binary を argv 配列で起動する。stdout JSON／exit／stderr を型付き decode し、tool missing・schema drift・非0終了を fail-closed にする（2026-08-02T03:09:00Z、Guide me、ユーザー回答「1」）

## Q3. 設定・rule・台帳の正本配置

baseline と exemption を分離し、review diff と drift を最小にする正本配置を決める。

- A. gate 専用の `tests/no-silent-drop/`（推奨）: entrypoint／pure modules／ast-grep rules／catalog／fixtures を専用 directory に集約し、versioned baseline と exemption を別 JSON file にする。package script `no-silent-drop` と CI step はこの entrypoint だけを呼ぶ
- B. `scripts/` へ全配置: gate 実装、rules、fixtures、台帳をすべて authored scan root 内に置く
- C. `.codex/` へ配置: framework sensor／tool として rules と台帳を持つ
- D. package.json へ埋込み: roots、catalog、baseline、exemption を package metadata に入れる
- X. Other (please specify)

[Answer]: A — entrypoint／pure modules／ast-grep rules／catalog／fixtures を `tests/no-silent-drop/` に集約し、versioned baseline と exemption を別 JSON file にする。package script `no-silent-drop` と CI step はこの entrypoint だけを呼ぶ（2026-08-02T03:10:00Z、Guide me、ユーザー回答「1」）

## Q4. #1874 の mutation Result 境界

bare `String.replace` の silent no-op をなくし、全 callsite に not-found の消費を強制する型を決める。

- A. 共通 discriminated union（推奨）: `TextMutationResult = { kind: "changed"; content } | { kind: "not-found"; target }` を導入し、`setCheckbox`／`setStageSuffix` の両方が返す。全 callsite は `kind` を検査し、not-found では write 前に既存 error boundary へ昇格する
- B. 例外: 対象不存在時に helper が throw し、最上位 catch に委ねる
- C. strict wrapper 追加: 既存 helper は string のまま残し、新 callsite だけ wrapper を使う
- D. boolean 併記: `{ content, changed: boolean }` を返し、caller の分岐は任意にする
- X. Other (please specify)

[Answer]: A — `TextMutationResult = { kind: "changed"; content } | { kind: "not-found"; target }` を導入し、`setCheckbox`／`setStageSuffix` の両方が返す。全 callsite は `kind` を検査し、not-found では write 前に既存 error boundary へ昇格する（2026-08-02T03:11:00Z、Guide me、ユーザー回答「1」）

## Q5. #1878 の `persistBlocked` 失敗昇格

既存 `MirrorOperationOutcome` と transactional outbox を維持しつつ、`applyTransition` failure の偽 `safety-blocked` を防ぐ。

- A. 既存 `stateFailure` へ昇格（推奨）: `persistBlocked` は `applyTransition` を1回だけ呼び、`failed` なら既存 `stateFailure(context, operationId, summary)` を返す。`ok` のときだけ元の `safety-blocked` を返す。新しい outcome variant、rollback、retry は追加しない
- B. 新 outcome variant: `persistence-failed` を `MirrorOperationOutcome` 全体へ追加する
- C. throw: transition failure を例外に変換して executor を中断する
- D. audit drain 待機: outbox が空になるまで同期 retry してから outcome を返す
- X. Other (please specify)

[Answer]: A — `persistBlocked` は `applyTransition` を1回だけ呼び、`failed` なら既存 `stateFailure(context, operationId, summary)` を返す。`ok` のときだけ元の `safety-blocked` を返す。新しい outcome variant、rollback、retry は追加しない（2026-08-02T03:12:00Z、Guide me、ユーザー回答「1」）

## 合意サマリの確認

- no-silent-drop は単一の短命 Bun CLI とし、内部を6つの pure／adapter component に分ける。
- ast-grep は exact pin した `@ast-grep/cli` を typed process adapter から実行する。
- 正本は `tests/no-silent-drop/` に集約し、baseline と exemption は別 JSON file とする。
- #1874 は共通 `TextMutationResult` の `changed | not-found` を全 callsite で検査する。
- #1878 は `applyTransition` failure を既存 `stateFailure` に昇格し、outcome variant／rollback／retry を増やさない。
- AWS、UI、HTTP、DB、常駐 service は導入しない。

- A. 確認OK（推奨）: Q1〜Q5 を確定し、5つの Application Design 成果物を生成する
- B. 修正する: 対象質問と変更内容を指定する
- X. Other (please specify)

[Answer]: A — Q1〜Q5 を確定し、5つの Application Design 成果物を生成する（2026-08-02T03:13:00Z、Guide me、ユーザー回答「1」）

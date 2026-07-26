# セキュリティ要件 — U7 conformance-suite

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 脅威モデルと境界

U7 は適合テストスイートであり、`technology-stack.md` 実測どおり既存 `bun test` ランナー上で単発実行される。セキュリティ上の唯一の関心事は、**テストが本番 record・ワークスペースを汚さない**ことである。`business-logic-model.md` フロー 2 は fixture ベースの in-process 様式(既存 t252/t253 の踏襲)を採り、フロー 4 は upstream-sync レポートへの ConformanceReportSection 追加を扱う。いずれも認証情報・ネットワーク境界を持たない。

## SEC-U7-1: テストが本番 record を汚さない(scratch 分離)

適合テストは fixture・scratch ディレクトリ上で実行し、本番の intent record(`amadeus/spaces/*/intents/*`)・audit シャード・composition record を書き換えない。team.md scratch-script-discipline(cid:requirements-analysis:scratch-script-discipline) のとおり、audit/record を書くツールの実験では project-root override を scratch へ明示し、実 worktree の record を汚染しない。

- 合否: 適合テストが本番 record・audit・composition record を書き換えないことを確認する(fixture/scratch 上での実行 — `business-logic-model.md` フロー 2 の in-process fixture 様式)
- 合否: per-harness の native hook 実起動テスト(`business-rules.md` BR-U7-4)も scratch 隔離下で実行し、実ワークスペースの self-install ツリー・record を変更しない

## SEC-U7-2: レポート導出の完全性(BR-U7-5)

`business-rules.md` BR-U7-5 のとおり、ConformanceReportSection の suiteResult はテスト実行 exit code からの導出のみとし、ハードコード・自己参照比較を禁止する(org.md 検証劇場 Forbidden)。これは「偽の信頼」を防ぐ完全性(integrity)要件であり、`requirements.md` FR-10 の検証劇場禁止と対応する。

- 合否(落ちる実証): 意図的 red 状態で ConformanceReportSection が red を示す(`business-logic-model.md` フロー 4・BR-U7-5 検証)。status のハードコード・自己参照比較(x === x)は不合格

## SEC-U7-3: 認可・監査面の維持(NFR-1)

`requirements.md` NFR-1 のとおり、U7 の適合テスト編入は認可・監査経路を変更しない。適合テストは既存挙動の検証であり、新たな認可判定・監査発行を導入しない。

- 合否: U7 の変更が directive contract / state transition / audit invariant のテスト群を退行させない(適合テストは検証専用で認可経路を触らない — 非干渉の実証)

## 非該当カテゴリ(N/A + 根拠)

- 認証 / 認可情報の保持: N/A。適合テストは credential を扱わない(technology-stack.md 実測)。GitHub 連携を伴う upstream-sync レポート面も既存 `gh` CLI の credential store 委譲に従い、token を保持・出力しない
- 入力サニタイズ(ネットワーク): N/A。テストは fixture 入力のみを消費し、外部ネットワーク入力を受けない

# セキュリティ設計 — U7 conformance-suite

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## SEC-U7-1 への設計: scratch 分離の fixture 設計

`security-requirements.md` SEC-U7-1(本番 record 非汚染)を、fixture の**生成場所と project-root の二重隔離**で設計する:

- **fixture 生成場所**: 各テストは `bun:test` の一時ディレクトリ(OS tempdir 配下のテストごと一意パス)へ fixture ツリーを構築し、リポジトリ内へ fixture 実行時生成物を書かない。静的 fixture(投影期待値等)は `tests/fixtures/` 配下の読み取り専用データとして版管理し、テストは tempdir へコピーしてから変異させる
- **project-root override**: audit/record を書く engine 経路を通すテストは project-root override を tempdir へ明示し(team.md scratch-script-discipline)、実 worktree の `amadeus/spaces/*/intents/*`・audit シャード・composition record へ到達不能にする。`business-logic-model.md` フロー 2 の in-process 様式(t252/t253 踏襲)はこの override seam を持つ既存様式であり、新設しない
- **e2e の native hook 実起動**(`reliability-requirements.md` REL-U7-3)も scratch 隔離下で行い、実ワークスペースの self-install ツリーを変更しない。検証: テスト前後で実 record ツリーの hash 不変 assert を suite 冒頭/末尾に置く(汚染の機械検出)

## SEC-U7-2 への設計: レポート導出の完全性

`security-requirements.md` SEC-U7-2(BR-U7-5)の設計は reliability-design.md の「suiteResult = テスト実行 exit code からの導出」設計を参照継承する(二重規定しない)。落ちる実証は runtime 消費行への注入(inject-runtime-consumed-lines)で行い、`performance-requirements.md` PERF-U7-1 の計測対象テストと同一の実行結果を使う — レポート専用の別実行を作らないことで、実行とレポートの乖離(検証劇場)を構造的に防ぐ。

## SEC-U7-3 への設計: 認可・監査面の非干渉

`security-requirements.md` SEC-U7-3 のとおり、U7 は検証専用で認可判定・監査発行を導入しない。変更面はテストファイル・追跡表・upstream-sync レポート生成の 3 箇所に閉じ(`scalability-requirements.md` の層別構造と同一境界)、既存認可テスト群の green 維持で非干渉を実証する。

## 非該当カテゴリ

N/A — `security-requirements.md` 非該当カテゴリ(credential / ネットワーク入力)の N/A を参照継承(`gh` CLI は credential store 委譲 — `business-logic-model.md` フロー 4 の既存経路)。

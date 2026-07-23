# Doctor in-process seam 要件

## 入力と意図分析

本要件は [Issue #857](https://github.com/amadeus-dlc/amadeus/issues/857) と、
Reverse Engineering で更新した以下の brownfield 成果物を入力とする。

- `business-overview.md`: doctor は導入状態を診断し、利用者が修復判断に使う CLI である
- `architecture.md`: `runUtilityMain` から doctor handler、stage graph・worktree・audit へ至る依存関係
- `code-structure.md`: `packages/framework/core/tools/amadeus-utility.ts` 内の
  `handleDoctor` と関連テストの配置

Issue 起票時の「doctor の全テストが spawn 駆動で全行未計測」という前提は、
現行コードでは一部解消されている。再スキャンでは monkeypatch 型 in-process テスト
6ファイル104ケースが成功し、対象部は LCOV 437/771行まで計測できた。一方で、
正式な戻り値 seam がなく、`process.exit`、stdout、env、session cwd、stage graph、
cache の process-global な差し替えが残る。

目的は、doctor の外部挙動を変えずに、変更経路を同一プロセスで直接駆動できる
正式な境界を設け、doctor 変更時の patch coverage waiver の再発を防ぐことである。
これは機能追加ではなく、テスタビリティと保守性を改善する限定 refactor である。

## 機能要件

### FR-1: 正式な in-process 実行境界

doctor core は CLI argv の解析やプロセス終了から分離された、export 済みの
in-process 実行境界を提供しなければならない。

受入条件:

- テストが子プロセスを起動せず doctor core を直接呼び出せる
- core 自身は `process.exit` を呼ばない
- 正式な境界の関数名と型の詳細は Functional Design で決定できる

### FR-2: 戻り値契約

doctor core は少なくとも終了コードと整形済み出力を返さなければならない。
各 check の内部結果を新しい公開モデルとして返すことは要求しない。

受入条件:

- 成功時は終了コード `0`、1件以上の診断失敗時は終了コード `1` を表現できる
- 呼び出し側は process-global な stdout 捕捉なしで整形済み出力を検証できる
- 出力の順序と文面は既存 CLI 契約と同等である

### FR-3: 薄い CLI wrapper

CLI wrapper は既存引数を受け取り doctor core を呼び出し、返された出力の表示と
プロセス終了コードへの反映を担当しなければならない。

受入条件:

- 利用者が実行する doctor コマンドと引数は変更しない
- stdout、stderr、終了コード `0/1` の既存外部契約を維持する
- CLI wrapper に診断ルールそのものを重複実装しない

### FR-4: 最小限の依存注入

in-process 実行を阻む process-global 依存のうち、stage graph のロード元、
main checkout を基準とする cwd・worktree 解決、および doctor が参照する
env・cache は、テストから制御可能な境界を持たなければならない。

受入条件:

- テストが session cwd に依存せず、明示した project/main-checkout 文脈で実行できる
- パッケージ済み `dist` の stage graph とテスト fixture の stage graph を
  明示的に選択できる
- 必要な依存だけを注入し、全 check の全面的な純関数化は要求しない

### FR-5: 既存 doctor 副作用の互換性

refactor 後も、doctor の診断処理に含まれる正当な副作用と判定結果を維持しなければ
ならない。

受入条件:

- audit 追記、stale lock cleanup、stage graph・harness・worktree の各検査を維持する
- 同じ fixture と実行文脈に対して、refactor 前後の診断結果、出力、終了コードが一致する
- cleanup や audit の実行順序に依存する既存契約を破壊しない

### FR-6: 二層のテスト契約

既存 spawn テストは CLI・cwd・配布物の統合契約として維持し、変更する doctor
経路は in-process テストで直接駆動しなければならない。

受入条件:

- 既存の spawn 契約テストが成功する
- 新規または変更した doctor の正常系・失敗系を in-process テストで観測できる
- Bun の spawn coverage 盲点に依存せず、変更行の patch coverage 100% を満たす

## 非機能要件

### NFR-1: 後方互換性

公開 CLI のコマンド名、引数、出力順、主要文面、終了コード、既存副作用を変更しない。
意図的な外部挙動変更が必要になった場合は本 intent に混在させず、別判断とする。

### NFR-2: テスタビリティ

変更対象の doctor 経路は、`process.exit`、stdout、session cwd の monkeypatch を
前提にせず直接検証可能でなければならない。patch coverage 100% は変更行に適用し、
既存 doctor 全771行の一括100%化は要求しない。

### NFR-3: 保守性

変更は正式な seam と必要最小限の依存境界に限定する。新しい抽象は複数の実行文脈
またはテストで実際に利用されるものに限り、各 check の全面モジュール分割は行わない。

### NFR-4: 決定性

明示した project directory、main-checkout 文脈、stage graph、env・cache 入力が
同じであれば、doctor core の終了コードと整形済み出力は再現可能でなければならない。

## 制約

- 実装言語、実行環境、既存ツールチェーンは TypeScript、Bun、現在の CI を維持する
- `packages/framework/core/tools/amadeus-utility.ts` を入口とする既存配布・self-install
  経路を壊さない
- 既存 spawn テストは削除せず、in-process テストと役割を分担する
- doctor の利用者向け機能追加や診断ルール変更を同時に行わない
- 変更行は既存の lint、型検査、テスト、project coverage、patch coverage を通過する

## 前提

- `handleDoctor` の現行診断ロジックは正しく、今回の主対象は呼び出し境界と依存境界である
- 現在の in-process monkeypatch テストは回帰資産として再利用できる
- stage graph、cwd・worktree、env・cache の全依存を一括で抽象化せず、
  seam を妨げる箇所から限定的に扱える
- 整形済み出力は、文字列または行配列など、順序と内容を損なわない表現にできる

## スコープ外

- doctor の各 check を独立モジュールへ全面分割すること
- doctor 既存全771行の line coverage を今回だけで100%にすること
- spawn テストを in-process テストへ置き換えること
- 新しい診断 check、CLI option、出力形式を追加すること
- Issue #857 と無関係な `amadeus-utility.ts` の整理や一般的なリファクタリング
- audit、stale lock cleanup、worktree anchor の既存意味論を変更すること

## トレーサビリティ

| 決定・入力 | 要件 |
|---|---|
| Q1-A: 最小 seam と必要な依存注入 | FR-1、FR-4、NFR-3、スコープ外 |
| Q2-C: 終了コードと整形済み出力を返す | FR-2、FR-3、NFR-4 |
| Q3-A: spawn 維持 + in-process patch coverage | FR-6、NFR-2 |
| `business-overview.md` の利用者向け診断価値 | FR-3、NFR-1 |
| `architecture.md` の process・graph・worktree 依存 | FR-1、FR-4、FR-5 |
| `code-structure.md` の handler・テスト配置 | FR-6、制約 |

## 未決事項

要件上の未解決事項はない。以下は Functional Design で確定する実装詳細である。

- 正式な core 関数と戻り値型の名称
- 整形済み出力を単一文字列または行配列のどちらで表現するか
- 既存 cache・env 参照のうち、引数化するものと小さな dependency object にまとめるもの
- 既存 `handleDoctor` を core として縮退させるか、CLI wrapper 名として残すか

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-23T03:55:53Z
- **Iteration:** 1
- **Scope decision:** none

質問回答、brownfield 入力、要件・受入条件、明示的なスコープ境界に矛盾はなく、後続設計へ進める状態です。

### Findings

- None

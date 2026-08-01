# Logical Components — u5-ci-all-models-measure

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u5-ci-all-models-measure(C6+C9+C10)

上流入力(consumes 全数): business-logic-model(u5 functional-design §0 / §1 / §2 / §3 / §12.1 — 変更の輪郭・上流契約・run|verify 全モデル化・二層検証・所有ファイル仕分け), tech-stack-decisions(現行スタック据え置き), scalability-requirements / performance-requirements / security-requirements / reliability-requirements(NFR との対応付け)

前 iteration では kind ゲート([service, ui, library])判定により本書を独立生成せず reliability-design 末尾の節で非生成理由のみ記録していたが、engine の produces 要件に従い本 iteration で独立 artifact として具現化する。結論は変わらない — **新規のサービス境界・failure domain・共有リソースは発生しない** — が、既存コンポーネント境界と共有リソースの現状を設計事実として本書に固定する。

## LC-1: 論理コンポーネント境界(変更対象 — 単一ディレクトリ内の既存コンポーネント)

本 Unit の変更は単一ディレクトリ `plugins/formal-model-check/tools/` 内の既存コンポーネントの引数化・反復拡張に留まる(BLM §0 / §12.1)。新規コンポーネントの追加・既存境界の再編はない。

| コンポーネント | 責務 | 本 Unit での変更 |
|---|---|---|
| `run-model-check-ci.ts` | CI run|verify の CLI エントリ | `--model` 引数の追加(BLM §2.1)。未指定の既定 = 全登録モデル |
| `ci-model-check-runner.ts` | 実行マトリクス駆動・短絡 semantics | モデル外側ループ化(BLM §2.2)。短絡・失敗分類は期待値不変 + `model` フィールド追加のみ |
| `ci-model-check-domain.ts` | acceptance スキーマ・validator | runs 配列の per-model 化・長さチェックの `6 × N` 一般化(BLM §2.3)。スキーマ名 `amadeus.ci-model-check-acceptance.v1` は不変 |
| `ci-model-check-artifacts.ts` | evidence / failure レコード書き出し | per-model evidence 構造化(BLM §2.3) |
| `node-ci-model-check-port.ts` | TLC 実行 port・二層 dispatch | frozen 層(FormalElection)と verified-source 層の dispatch(BLM §3.2 / §3.4)。frozen 層の spawn argv は引数化後も同一文字列 |
| `run-model-check-diagnostic.ts` | diagnostic 事前計測 | 引数化(BLM §4)。統計抽出器 `extractDiagnosticStatistics` を供給する側 |
| `run-skeleton-ci.ts` | skeleton 計測 | 引数化(BLM §5) |
| `model-map.json` | モデル登録の宣言 | models 配列 + vocabulary への MirrorLifecycle 追加(宣言のみ、コード変更を伴わない — scalability-design §SCD-1) |

上記に加えて C9(ci.yml ジョブの表示層更新 — BLM §6、差分最小化)と C10(stage doc の実装追随 — BLM §9)があるが、いずれも既存ファイルへの差分であり新規境界を生まない。

## LC-2: failure domain(二層検証の層構造)

意図的な層非対称(BR-M2、BLM §3.2)が唯一の failure domain 構造であり、本 Unit で新設するものではなく確定するもの:

- **frozen 層(FormalElection)**: 従来経路(run-model-check.ts 正規化 + frozen receipt/binding ゲート)のまま。exit 1 DETECTED(反例 identity 付き)が red surface。toolchain 4 ファイルは所有外(BR-F1)で byte 不変(reliability-design §RD-3 と表裏)。
- **verified-source 層(MirrorLifecycle 他、全登録モデル)**: 「completion marker 不在 or exit ≠ 0 or stderr 非空」で fail-closed。TLC ソース証跡(`tlc-stdout.bin`)を検証対象とする。

## LC-3: 共有リソース

| 共有リソース | 共有者 | 設計上の扱い |
|---|---|---|
| `extractDiagnosticStatistics`(統計抽出器) | diagnostic ↔ port(verified-source 層) | **複製実装を置かず共有**(BR-E4、BLM §3.4 / §4)。2 実装の乖離による flaky を排除(reliability-design §RD-2 と表裏) |
| `tlc-stdout.bin`(TLC 生証跡) | port → runner → domain | evidence per-model 化の対象。warm-up は completion marker のみ、measured run は統計 4 値 pin(BR-E3) |
| acceptance.json(`amadeus.ci-model-check-acceptance.v1`) | runner → domain → CI verify | スキーマ名不変、runs 配列のみ `6 × N` 化(BR-F2) |
| docker isolation / bootstrap supply-receipt / validateDockerReceipt / EnvReceipt | toolchain(所有外) | 不変面(BR-F1 / BR-F2、BLM §10)。本 Unit は消費のみ |

## LC-4: blast radius と下流への橋渡し

blast radius は BR-F1(toolchain 4 ファイル非接触)/ BR-F2(docker isolation・不変面の固定)で既に閉じており、infrastructure-design へ橋渡しすべき新規要素(新規プロセス・ポート・永続ストア・ネットワーク面)は存在しない。shared resource の変更は全て同一リポジトリ内のコード・artifact 契約に閉じる。

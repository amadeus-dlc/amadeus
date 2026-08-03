# Intent Backlog — 260802-source-only-dist

上流入力(consumes 全数): intent-statement(確定済み裁定 G1〜G13 と成功指標を proto-Unit の受け入れ根拠として参照)。feasibility-assessment / constraint-register は feasibility SKIP により不存在(scope-document.md の制約節が代替)。

## Proto-Units(MoSCoW)

粒度は Units Generation で確定する(1 Unit の独立実装可能性検証は units-generation:c1 に従う)。以下は優先順位付けの proto 分割。**全項目 Must**(#2043 受け入れ条件16項目を全 Must と確定 — Should/Could は置かない。Won't は scope-document.md の Out 節)。

| ID | Proto-Unit | 対応(移行順序 / 裁定) | MoSCoW |
|---|---|---|---|
| P1 | Release Asset 生成・公開(単一 tar + checksum + manifest、release.yml build ジョブ) | 順序1 / G6・G9 | Must |
| P2 | installer asset 経路(導入バージョン定数・fail closed・ALLOWED_HOSTS・ADR-003 改訂・旧版 fallback) | 順序2 / G7 | Must |
| P3 | scope 正本昇格(22ファイル + scope-grid 5エントリ + センサー追随) | 順序0 | Must |
| P4 | bootstrap 解決(単一ディスパッチャ + AGENTS.md import 参照 + onboarding 文書) | 順序3 / G1・G2 | Must |
| P5 | CI 再設計(build 前提化・第3ガード再定義・再現性検査・境界ガード・detect-ci-changes 改訂) | 順序3 / G4・G5 | Must |
| P6 | クリーン環境での全ハーネスインストール検証 | 順序4 | Must |
| P7 | Git 追跡除外 + allowlist 正本一元化・整合テスト | 順序5 / G8 | Must |
| P8 | 文書更新 + ノルム PR 5点(G3 受容論証を含む) | 順序6 / G3 | Must |

## シーケンス方針(risk-first + dependency)

- **Walking skeleton = P1+P2 の最小縦切り**(G10): draft release への asset 付与 → installer が asset 経路で1ハーネスをインストール成功。最大リスク(外部境界)を最初に実証し、ゲート付き Bolt 1 とする
- **依存の要**: P7(追跡除外)は P1〜P6 の完了が前提(installer 破壊の回避 — `payload-factory.ts:36-45`)。P3(正本昇格)は P7 の前提(恒久喪失の回避)だが asset 経路とは独立のため skeleton 後の任意時点で実施可
- P4/P5 は相互に独立、P1/P2 とも独立(並行化候補)。P8 のノルム PR は P7 着地と同期して最後
- 期日なし(質問票 Q1 裁定)— マイルストーンは Bolt 完了で刻む

## 価値仮説の検証点

- Bolt 1(skeleton)完了時点で「asset 配布が実際に機能する」ことが実証され、以降の作業のリスクはリポ内で閉じる
- P7 完了時点で intent-statement の Success Metrics 代表指標(追跡対象ゼロ・git status クリーン)が観測可能になる

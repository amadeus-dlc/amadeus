上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Reliability Design — setup-hooks-merge

> 上流入力の使用箇所: reliability-requirements.md の5機構(atomic・冪等・loud fail・回復・検証)を設計の対象とする。

## 対象の概要

reliability-requirements.md が定める信頼性を、マージ機構の実装設計に落とす。

## 設計

- **atomic**: 既存 apply-write port の tmp→rename をそのまま使い、自前の書込み経路を作らない(business-logic-model.md §マージフロー手順6)
- **冪等**: planMerge が add/replace/noop を決定的に返し、同一 block の再適用で diff が出ないことを単体テストの検査対象とする(reliability-requirements.md §信頼性の仕組み)
- **loud fail**: 重複検出(2組以上)は content validation エラー、TOML 構文不正は IoError、snippet 不在・読取不可は IoError として扱う(推測による修復・上書きをしない)。**構文検証の oracle**: Bun ネイティブの `Bun.TOML.parse` で全体 parse を試行し、例外で loud fail とする(ランタイム内蔵で新規依存なし。検証のみに使い、parse 結果はマージに使わない — マージはマーカー基準の文字列処理)
- **回復**: バックアップからの手動復元 + managed block 除去で初期状態へ戻せる
- **検証**: FR-7c の6ケース(add/noop/replace/loud fail/atomic/除去)を単体テストとして実装する

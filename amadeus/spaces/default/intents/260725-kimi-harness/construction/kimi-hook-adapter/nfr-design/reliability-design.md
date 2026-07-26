上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Reliability Design — kimi-hook-adapter

> 上流入力の使用箇所: reliability-requirements.md の4機構(fail-open 保証・Stop verbatim・回復・契約テスト)を設計の対象とする。

## 対象の概要

reliability-requirements.md が定める信頼性を、adapter の失敗経路の設計に落とす。

## 設計

- **fail-open の構造**: 全処理を try/catch で囲み、例外・不正 JSON・未知イベントで exit 0。core hook 不在(未インストールのプロジェクト)でも exit 0(reliability-requirements.md §信頼性の仕組み)
- **Stop の特別経路**: core `amadeus-stop.ts` の stdout を検査し、整形された block 判定のみ Kimi の block 契約(exit 2 + stderr または hookSpecificOutput — live capture で確定)へ中継。壊れた出力は exit 0 で fail-open(business-logic-model.md §決定木)
- **回帰防止**: 変換表は capture 済み fixture の契約テストで固定(reliability-requirements.md §信頼性の仕組み)
- **回復**: adapter の不調は advisory 機構が落ちるだけでセッション継続を妨げない。恒久復旧は再インストールで行い、配線は managed block で冪等に再適用できる(reliability-requirements.md §信頼性の仕組み — U3 のマージ機構がそのまま回復経路)

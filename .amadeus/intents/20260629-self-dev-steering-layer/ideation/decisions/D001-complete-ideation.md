# D001: Ideation 完了判断

## 背景

- Issue #108 は、Amadeus 本体リポジトリの root `.amadeus/` に自己開発用 steering layer を導入することを求めている。
- 初回導入の完了条件は、初回 Intent を Ideation gate passed にすることである。
- Inception 以降は、別 Issue と別 Intent で扱う方針である。

## 判断

- Ideation gate passed として初回導入 Intent を完了する。
- Inception 以降の詳細化は、後続 Issue と後続 Intent に渡す。

## 理由

- 初回導入で確定する方針と、後続 Intent に持ち出す項目が分かれている。
- build workspace、host environment、target workspace、target artifacts の分離方針が steering layer と Ideation 成果物へ記録されている。
- skill、validator、example、ハーネスの実装変更は対象外として明示されている。

## 影響

- 後続 Intent では、初回導入の Requirement、Acceptance、Traceability、Decision を詳細化できる。
- ハーネス設計、validator 連携、provenance 自動収集は後続 Intent として扱う。

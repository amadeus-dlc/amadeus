# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、Skill Contract catalog model の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
詳細な Domain Design、Logical Design、実装設計、テスト設計は Construction で確定する。

## 設計戦略

- `amadeus-contracts/catalog/skill-contract.ts` に Skill Contract の型を置く。
- `amadeus-contracts/catalog/skills.ts` に初期対象 skill の契約 catalog を置く。
- `amadeus-contracts/catalog/index.ts` と `types.ts` から型と catalog を公開する。
- 契約要素は prerequisites、invariants、postconditions、read boundary、write boundary、delegation、grilling、feedback を表現できる粒度にする。

## 責務境界

- 所有するもの: Skill Contract 型、catalog、代表 skill 契約、catalog 公開口。
- 所有しないもの: 全 skill 一括適用、`SKILL.md` 全面再構成、Skill Contract からの skill 本文完全生成。
- 依存してよいもの: 既存 `amadeus-contracts/catalog/**`、代表 skill の `SKILL.md`、Issue #263。
- 後続で再確認が必要になる条件: 代表 skill 以外の契約適用が必要になった場合。

## 構成候補

- Skill Contract 型。
- 代表 skill catalog。
- catalog 公開口。
- consumer 参照種別。

## データと契約候補

- skill 識別子候補: `amadeus-ideation`、`amadeus-inception`、`amadeus-construction`、`amadeus-grilling`、`amadeus-validator`。
- skill path 候補: `skills/**` と `.agents/skills/**` の対応先。
- 契約要素候補: prerequisite、invariant、postcondition、boundary、delegation、condition。
- consumer 候補: validator、evaluator、decision review、learning review。

## 検証観点

- `npm run typecheck` が通る。
- 代表 skill 5件が catalog に含まれている。
- 既存の `SKILL.md` と矛盾する制約を追加していない。

## Bolt 分割方針

- B001 で、Skill Contract 型、catalog、代表 skill 契約を追加する。

## Construction への引き継ぎ

- 型は過度に抽象化せず、Issue #263 の契約要素を直接表現できる最小構造にする。
- 後方互換維持を目的にした旧経路は追加しない。

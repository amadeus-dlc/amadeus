# Domain Entities — standing-grant(Unit)

上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`(単一 Unit)、`../../../inception/units-generation/unit-of-work-story-map.md`(FR トレース)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜8)、`../../../inception/application-design/components.md`(C-1〜C-6)、`../../../inception/application-design/component-methods.md`、`../../../inception/application-design/services.md`(三経路の権限フロー)

## 型(TypeScript、functional-domain-modeling-ts — AD 契約 verbatim 準拠)

```
StandingGrant = {
  grantId: string;               // 8-hex 相関子
  scope: "stage-gates";          // 初期語彙は単一(未知は発行時拒否 — AC-1d)
  expiresAtMs: number;           // 発行時刻+TTL(parse 済み数値 — parse-don't-validate)
  includesPhaseBoundary: boolean;// RA2-C opt-in(GRANT 行に常時明記)
  issuerIntent: string; issuerShard: string; issuerHumanTs: string; // provenance 座標(DELEGATED_APPROVAL 同族)
  isExpired(nowMs: number): boolean; // インスタンスメソッド(c11 — 実装は内部ファクトリ+frozen リテラル)
}
```

- `findActiveStandingGrant(projectDir, now): StandingGrant | null` — **AD component-methods.md:19 の契約 verbatim**(null = 有効グラント不在。判別ユニオン化は AD 契約の無申告変更になるため採らない — FD reviewer #1 是正、1121-FD 前例の契約復帰側)
- コンパニオン(static 相当のみ — c11): `StandingGrant.parse(auditBlock: string): StandingGrant | null` — GRANT_ISSUED 行からのスマートコンストラクタ(AND 条件のうち行形式・数値 parse を担い、無効行は null。**null を返しうるのは parse/検証段のみで、parse 成功後の StandingGrant は常に整形済み** — 無効状態表現不能)
- 内部分類値(export しない実装詳細): ゲート分類は `standingGrantSatisfiesGate` **内部**の判定手順(AD C-3「内包・独立ファイルなし」verbatim 準拠 — FD reviewer #2 是正)。分類の中間表現を公開型にしない

## 不変条件

`findActiveStandingGrant` が非 null を返す ⇔ 全 AND 条件(発行行実在・HUMAN_TURN 実在・scope 適合・now < expiresAtMs・未撤回)成立済み(チームモード判定は受理分岐先頭で先行 — component-methods C-2)。expiresAtMs は必ず parse 済み number(verification-numeric-parse)。新規 class なし・frozen リテラル+コンパニオン(c11 の役割分担: インスタンスメソッド = isExpired、static = parse)。

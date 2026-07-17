# Business Logic Model — standing-grant(Unit)

上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`(単一 Unit)、`../../../inception/units-generation/unit-of-work-story-map.md`(FR トレース)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜8)、`../../../inception/application-design/components.md`(C-1〜C-6)、`../../../inception/application-design/component-methods.md`、`../../../inception/application-design/services.md`(三経路の権限フロー)

## ロジック構成(純関数、AD シグネチャ verbatim)

1. `findActiveStandingGrant(projectDir: string, now: number): StandingGrant | null`(AD C-2 契約)— (1) 全 intent シャード走査で GRANT_ISSUED 行収集(DQ1 裁定) (2) 各候補を `StandingGrant.parse` → AND 検証: 根拠 HUMAN_TURN 実在(同シャード照合)/ scope 適合 / `!grant.isExpired(now)` / GRANT_REVOKED 不在 (3) 複数有効時は expiresAtMs 最新を採用、なければ null
2. `standingGrantSatisfiesGate(grant, slug, stateContent, graph): boolean`(AD C-2 契約の単一関数・4引数 — 除外分類は**内部手順**): (a) phase-boundary 判定 = findStageBySlug(lib:5043)+nextInScopeStage(lib:5065)の phase 比較(ADR-5 の第3同型実装)→ 真なら `grant.includesPhaseBoundary` を返す (b) skeleton 判定 = Skeleton Stance on+scope 先頭 construction → false (c) それ以外 → true。PR マージは verb 不在の構造外で分類対象に現れない(AC-4c — 白側 sweep で担保)
3. 挿入位置(ADR-7): humanActedSinceGate が **false を返した後**のフォールバック、**approve 側のみ**(E-SDG-AD2=X)。受理分岐先頭で `AMADEUS_OPERATING_MODE === "team"` を判定(不一致は即 null 扱い)。handleDelegateApproval 経路では宛先(--to-intent)state/scope で判定(ADR-7 決定3)

## エラー処理方針

発行 verb: CLI 誤用・接地なし・非 team・未知 scope・TTL 型不正 = フェイルファスト(loud refuse、状態未変更)。受理検証: 条件不成立・シャード読取失敗 = 回復可能(null → 従来経路へフォールバック — 検証欠陥がゲートを止めない、refuse 側にのみ倒れる)。fail-open 分岐(lib:2484)へは構造的に到達しない(AC-3b / R-7)。

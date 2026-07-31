# Code Summary — U8: legacy-writer-removal（前半 = 削除ゲート）

上流入力: unit の functional-design（business-logic-model.md / business-rules.md / domain-entities.md）、nfr-requirements（performance / reliability / scalability / security / tech-stack-decisions）、nfr-design（logical-components / performance / reliability / scalability / security）を全数参照。

裁定: E-U8PRE（pre-U8 P1 の編成、tie 裁定）、ユーザー裁定 2026-07-31（ゲートのみ着地 / 移行は追加 Bolt / retention = ゲート GREEN 同期 / ratchet 見送り）。

## 着地 PR

- **#1755** feat(otel): 再入 audit lock と per-call emit ターゲティング（pre-U8 Bolt P1）
- **#1766** feat(otel): 旧 audit writer の六条件削除ゲート（Bolt 9 / U8 前半）

## Files created

- `tests/deletion-gate.ts` — 六条件の独立 checker + 集約評価器（576行 → U11 の越境修正・shadow parse 強化を含め拡張）
- `tests/unit/t371-deletion-gate.test.ts` / `tests/integration/t371-deletion-gate-cli.test.ts` — 評価器・checker・CLI・スキーマ検証

## Files modified

- `.github/workflows/ci.yml` — 削除ゲート step + report artifact upload
- `tests/.coverage-patch-allowlist.json` — 行ピン機械 remap（P1 の行シフト対応含む）

## Key implementation decisions

- **BLOCKED は移行期間の正常状態**: `--check` は評価成功なら exit 0 とし CI を恒久赤にしない。削除の前提条件は `--require-green` が担う（GREEN 以外 exit 1）。
- **UNKNOWN は PASS にしない**（BR-12）— 判定材料の不在（shadow report 未供給・Relay 未着地）を FAIL と同格のブロッカーとして扱う fail-closed。
- **Bugbot 指摘2件を PR 内で是正**: shadow 検査の fail-open（equivalent 欠落を PASS 扱い）と不正形 report の throw → `parseShadowReport`（parse-don't-validate）の単一機構で閉鎖。pre-fix モジュールへの回帰テスト12件 fail の落ちる実証済み。
- **ゲート実測（#1766 時点）**: (a) PASS / (b) PASS / (c) FAIL 66 call sites / (d) UNKNOWN / (f) PASS → overall BLOCKED（正しい判定）。(e) は U11 で PASS 化。

## 残作業（後続 Bolt へ委譲、ユーザー裁定準拠）

〔訂正 2026-07-31: 項目 2・3 を後続ユーザー裁定へ追随して改訂。旧文面 — 「2. shadow 比較 report の運用供給（(d) の解消）」「3. …+ v1 reader 削除」— は失効。根拠: FR-MIG-4(d) の再定義（shadow report → `[migration-equivalence]` マーカー付きテスト群、requirements.md:73 改訂 2026-07-31 ユーザー裁定）と FR-MIG-5 適用範囲確定（v1 reader は保持、退役は Issue #1819 の別 intent へ委譲、requirements.md:74）〕

1. 66 call site の OTel 経路移行（追加 Bolt — (c) の解消）→ Bolt G1/G2/G3 で完了（#1810/#1828/#1801）
2. (d) checker の再定義実装（shadow report 検査 → `[migration-equivalence]` テスト群+registry スイープの機械消費。FR-MIG-4 改訂準拠）
3. ゲート GREEN 後の旧 writer 削除 + retention 判定器（= ゲート GREEN 同期）。v1 reader は削除しない（FR-MIG-5、#1819 委譲）

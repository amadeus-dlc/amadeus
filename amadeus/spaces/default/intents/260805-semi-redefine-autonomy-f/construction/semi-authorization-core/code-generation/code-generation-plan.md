# Code Generation Plan — `semi-authorization-core`(#2253、swarm batch 1 事後作成)

上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, security-design.md, logical-components.md

swarm 経路のため本 plan は finalize 後の事後作成(`cid:code-generation:swarm-unit-artifact-backfill`)であり、実績 = builder report(worktree agent-a91594d959968a589、最終 HEAD `fffc8d5d8edd141d53cd2fa0e93d5feb8c62a288`)からの転記である。

## 実装ステップ(実績)

1. **t451 失敗テスト先行(TDD Red)** — C1/C2 純関数(SemiAuthority の 3 責務・4 責務不在の直読検査)。Red: `Export named 'semiPoliciesOf' not found` → C1/C2 実装で Green(10 pass)。
2. **t452 失敗テスト先行(TDD Red)** — 第 1 関門判定表 8 行+D3 fail-closed+片方向不変条件。Red 4 fail → Green(13 pass)。
3. **3 層置換の実装** — `amadeus-intent-autonomy.ts`(+175 行: SemiAuthority 系・authorizeInteraction 第 3 引数・`semi-mode-gate`→`semi-authority` 置換・梯子入口単一述語化・basisFingerprint 単一参照化)/ `-runtime.ts`(semiScope 搬送・振り分け・authorizeEffect 置換)/ `-production.ts`(fallbackFingerprints export・semiAuthorityScope 結線)。3 つの throw ガードとコミットイベント列は diff 非出現(grep 0 hit の機械確認)。
4. **FR-PIN-1** — t431:307-313 を 2 分割(walking-skeleton ピン保存 / 質問封鎖ピン反転)。
5. **t453(integration)** — AUTO_DECIDED 記録・basisKind・5 段降下・Unreviewed 計上・currentGrant null。**Red 先行ではない**(builder 申告 — 落ちる実証 #5 の 6/6 fail で非空虚性を代替実証。§12a/レビュー観点として引き継ぎ)。
6. **落ちる実証 5 点** — 入口ガード除去 / milestone 混入 / 不変条件除去(replay 拒否含む)/ scope 捏造 / gate 経路誤配線 → 各赤、復元後残渣ゼロ。
7. **allowlist** — semantic selector のため行 remap 適用面なし。全 580 エントリ一意解決・swell 0・**shrink-only の 1 件削除**(applySemiDecision の拒否行が t453 の in-process 駆動で免除不要化)。

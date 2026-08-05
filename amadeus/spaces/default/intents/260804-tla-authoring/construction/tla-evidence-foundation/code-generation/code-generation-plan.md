# Code Generation Plan — U1 tla-evidence-foundation(Bolt 1、walking skeleton)

上流入力(consumes 全数): U1 の functional-design(business-logic-model.md / business-rules.md / domain-entities.md)と nfr-design(security-design.md / logical-components.md)、`unit-of-work.md` U1 定義、`requirements.md` FR-006/FR-007/NFR-001〜003。

## 実装ステップ(TDD vertical slice — 受け入れ基準の述語を逐語で写す)

1. C2 identity 層: `extractStableSections`(`### (FR|NFR|AC)-\d{3}` / `## ADR-\d+` の見出し駆動文法)、canonical 正規化(LF 統一・行末空白除去・前後空行除去)、`contentDigest`(sha256("id"+0x00+body))、`aggregateDigest`(辞書順 sort "<id>=<digest>" LF 連結)、`compareIdentity`(完全一致のみ)— 失敗テスト先行(t436)
2. C4 envelope 層: canonical JSON codec(key 辞書順 sort)、EvidenceEnvelope(evidence 判別ユニオン直接ネスト)、verify の 4 検査(missing-part/digest-mismatch/identity-mismatch/predecessor-broken 全数列挙)、head 解決((ref, predecessor) 対の集合演算)— t437
3. C4 store 層: build(.tmp → atomic rename、既存同名は bytes 比較)、read/list(corrupted 併記)/head — 実 FS は integration(t438)
4. CLI: `tla-authoring.ts identity extract|compare` / `bundle build|verify|read|list|head`(JSON 1 行 stdout、exit 0/1/2)+ plugin.json manifest 登録(tools 末尾挿入)— t439
5. 検証: typecheck / lint / full CI suite を worktree solo で完走

## 品質規約

functional domain modeling(ブランド型 + スマートコンストラクタ + Result、throw を制御フローに使わない)。BR-U1-01〜27 をテストで固定(正常・欠落・改竄・stale・部分書込・冪等)。

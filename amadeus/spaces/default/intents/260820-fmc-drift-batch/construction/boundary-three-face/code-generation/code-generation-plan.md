# Code Generation Plan — boundary-three-face(U2 / #2929)

上流入力: `construction/boundary-three-face/functional-design/business-logic-model.md`(3面是正手順 1〜6 — 本 plan の正本。手順3=drift テスト先行・手順4=glob 更新の Red 先行順序込み)/ `business-rules.md`(BR-1〜8)/ `domain-entities.md` / `nfr-design/security-design.md` / `inception/units-generation/unit-of-work.md` U2 / `inception/requirements-analysis/requirements.md` FR-BND-1〜6。

## 実行形態

swarm batch 1(engine の invoke-swarm、autonomy full)で `amadeus-builder-agent` へ委譲。worktree `bolt-boundary-three-face`(base origin/main d21c86acc)。dispatch prompt は FD の 3面 Red 先行(validator 受理側 / loader in-boundary / glob drift)を明記した。

## 実行した計画(FD 手順の写像)

1. validator 一般化: `IMPLEMENTATION_PATHS` をフルパス RegExp リストへ形状変更(core 等価変換 + plugin 一般形)、旧 formal-model-check タプルは包含証明つき削除(OQ-3 = 統合)、両シンボル export
2. loader 1定義化: `implementationRoot` 撤去 → repo ルート実パス基点で共有述語適用(symlink/regular/sha256 検査は不変)
3. glob drift テスト新設(本番 `matchesGlob` オラクル)— 現行 glob への自然な赤を先に実測
4. sensor `matches` glob の entries 全被覆化(単一 brace グループ制約内)
5. model-map.json: PR系2モデルへ各 +4 entry(実 sha256、per-model sort 不変条件)
6. SOURCE_DRIFT 実測(hash-differs 両アーム)+ 全 map 消費テスト回帰

## 配送

Bolt 2 PR(#3364)。CI 1周目で t146(plugin prose の repo-root 相対パス hygiene — FD 未列挙の第6衛生クラス)が glob の `plugins/...` 分岐を赤化 → anchored 形 `*/plugins/...` へ是正(cb6c88c09、本番 matcher で意味論保存を事前検証)+ docs 2面 resync → create 再 mint → CI 緑。常任承認条件で merge queue 経由スカッシュマージ。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T23:53:42Z
- **Iteration:** 1
- **Scope decision:** none

3成果物は FD の3面手順(Red→Green・per-model 不変条件・OQ-2/OQ-3 閉包)へ正確に trace し、スコープ追加3件を実測 ref 付きで申告。CLI mint report は非編集・整合で常任承認述語を充足。再現可能な契約違反なし。残余は監査精度の FOLLOW-UP 2件(build-and-test の実測で閉じる)と NIT 1件。

### Findings

- FOLLOW-UP | code-summary の規模会計で実装のみの LOC が明示されず見積整合主張が自己検証不能 — build-and-test で着地 diff から実測して閉じる
- FOLLOW-UP | OQ-3(旧タプル削除)の実施確認が summary に明示されない — build-and-test で origin/main への grep 実測で閉じる
- NIT | t146 是正3ファイルが『10 ファイル』に含まれるか不明記 — 次回接触時に明確化

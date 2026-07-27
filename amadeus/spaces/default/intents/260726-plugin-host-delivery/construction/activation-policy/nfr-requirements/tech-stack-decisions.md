# 技術スタック決定 — U6 activation-policy

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 依存追加ゼロ・Bun 単独

technology-stack の実測所見「`git diff --name-only 1673c4332..HEAD -- package.json bun.lock` は出力 0 件」「新規外部パッケージもゼロ」「plugin 機構のために runtime dependency を追加せず、Bun/TypeScript と既存 manifest/FS API で実装する」を継承する。requirements の NFR-3(Bun-only、配布フレームワークへの runtime dependency 追加禁止)と一致する。

U6 の実装(spec-hash 判定・advisory 提示・`--single` 撤廃・verdict 記録)は、business-logic-model のフロー 1〜4 が示すとおり、ファイル直読とハッシュ計算(technology-stack 実測: plugin-composition の sha256 は `node:crypto` の stdlib 利用で依存追加ではない)、engine の既存 next 経路へのパッチ、SpecHashState の read/write という既存 FS API の範囲に閉じ、新規の外部ライブラリを必要としない。

- 決定: 新規 runtime dependency を追加しない(合否: `package.json` / `bun.lock` の U6 由来 diff が 0 件)
- 決定: spec-hash は `node:crypto` の stdlib を用い、外部ハッシュ・監視ライブラリを導入しない

## 独自機構のみ(上流機構への非依存)

requirements の FR-7(d)(上流の `when:` 未評価・plugin scope 未実装を前提にした Amadeus 独自設計)/ business-rules の BR-U6-9 を継承する。判定は spec-hash 独自機構のみで構成し、上流の `when:` 述語評価器・plugin scope 生成機構という未実装・脆い依存を持ち込まない。

- 決定: `when:` パーサ・scope 生成への参照を実装に持たない(BR-U6-9 の grep 検証で担保)
- 決定: 常駐 watcher・スケジューラ・デーモンを新設しない(単発判定 — services.md 常駐なし前提)

## 中立正本の編集と投影配布

business-logic-model のフロー 3 のとおり、plugin stage 側 frontmatter / condition 文の更新は中立正本 `plugins/formal-model-check/stages/formal-model-check.md` で行い、投影経由で配布する(dist 手編集禁止)。technology-stack の既存様式(`scripts/package.ts` の manifest-driven 投影)を用い、requirements NFR-4(単一正本派生・count-free)と整合する。

- 決定: plugin stage の変更は中立正本を編集し `bun scripts/package.ts` で投影する。dist / self-install は手編集せず drift ガードで一致を検証する

# Code Generation Plan: seam-bridge(U1)

上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、unit-of-work

TDD の vertical slice 2本で実装(builder = worktree 隔離 subagent、E-PCP-CGBLK 裁定の isolation worktree 経路):

- [x] Slice 1(純関数ブリッジ): t444 先行 Red(`Export named 'serializeStageFrontmatterSeams' not found`)→ `parseStageFrontmatter` / `serializeStageFrontmatterSeams`+型群を amadeus-plugin-compose.ts へ実装 → 13 pass Green(SeamListStyle 分岐含む)
- [x] Slice 2(結線): t445 先行 Red(1 pass/6 fail — 実ステージ未認識)→ `parseHostStageFrontmatter` 新設+`buildHostSnapshot` 結線+rebuild への現在バイト供給 → 7 pass Green
- [x] 落ちる実証: BR-U1-4(非 produces ガード無効化 → 赤)/ BR-U1-7(結線差し戻し → 6 fail)— 各1セットで注入→赤→cmp 復元→残渣 grep 0
- [x] 検証: typecheck 0 / lint 0 / 指定7スイート 87 pass 0 fail 479 expect / build 0(tracked 不変)/ coverage-registry・source-only・complexity・unchecked-cast 各 0
- [x] コミット: builder worktree `938acdd41` → conductor ブランチへ cherry-pick(再接地後 `a7e782881`)+fidelity diff 空を機械確認

受け入れ基準の対応は business-rules の BR-U1-1〜12(t444/t445 が固定)。produces_kinds 非導入(BR-U1-8)。既存 t301 契約は不変(BR-U1-5)。

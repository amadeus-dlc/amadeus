# Quality Gates

| Gate | 内容 | 落ちたときの扱い |
|---|---|---|
| typecheck / lint | TypeScript 型検査と lint | merge 不可。修正必須 |
| contracts:check | Skill Contract の生成物とカタログの整合 | merge 不可。カタログ更新と再生成 |
| parity:check | 上流基準 commit との双方向パリティ（38 skill、engine 197 ファイル） | merge 不可。差分は parity-map.json の except で宣言するか実体を直す |
| claude-wiring:check | .claude/ 配下の symlink 規約 | merge 不可 |
| test:it:all | validator、parity、promote などの決定論検証 | merge 不可 |
| test:e2e:ci:mock | mock provider の E2E | merge 不可 |
| test:examples | examples snapshot と provenance（staleReason 許容つき） | merge 不可。real 再生成は明示判断で行う |
| diff:check | whitespace 検査 | merge 不可 |
| 人間レビュー | PR の承認と merge は人間が行う（walking skeleton を含む） | 承認まで merge しない |

# Business Rules — U3

1. 権限は job 単位 `permissions: contents: write` のみ(workflow 全体は read 維持 — 最小権限)
2. ループ防止の二重ガード: GITHUB_TOKEN push の非再トリガー(一次)+ push paths-ignore に metrics/ を追加しない設計判断の文書化(GITHUB_TOKEN 非トリガーが既に十分 — release.yml 前例。paths-ignore は「人間が metrics/ を手編集した場合に CI が走らない」副作用があるため不採)
3. **ci-success 集約には含めない(設計判断)**: metrics-snapshot は main push 限定 job のため、`ci-success` の `needs`/`require_result`(ci.yml:224-241 — check/coverage/codecov-status のみ)へ追加すると PR run で skipped となり全 PR を赤くする(reviewer F2 実測)。main push run では job failure 自体が workflow run の失敗として可視化されるため集約追加は不要 — この非対称(PR には現れず main のみで検査される)を job コメントに明記する。
4. **配線検査テスト(P-2 の強制メカニズム、本ユニットの成果物)**: `tests/unit/t222-ci-snapshot-wiring.test.ts` を新設し、ci.yml のテキストに対して (a) `ci-success` の needs/require_result に `metrics-snapshot` が含まれない (b) `metrics-snapshot` job に `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` ガードが存在する (c) job 単位 `permissions: contents: write` の存在 (d) metrics-snapshot job ブロック内に `secrets.` が出現しないこと(S-2)、をアサートする。**方式は t152-windows-portability(:47-51)の readFileSync+toContain 文字列検査様式**(構造 YAML パースはしない — 新規依存を作らないため。nfr performance-requirements P-2 と対)。
5. 落ちる実証: ループ非誘発とコミット到達の両方を着地後の実 CI run で確認し code-summary に記録

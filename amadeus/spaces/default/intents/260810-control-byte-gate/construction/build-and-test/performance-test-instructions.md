# Performance Test Instructions — 260810-control-byte-gate

上流入力(consumes 全数): code-generation-plan.md(Step 7 の sweep と実測記録 — 本書の測定項目の導出元)、code-summary.md(§sweep と性能実測の実測値 5.538s / 16,650 files / 145.6 MiB — 本書が判定基準として引く値)。

## 適用判定

**適用あり(限定)**。ただし専用の負荷試験・ベンチマークスイートは**作らない**。

理由を分けて書く:

- **数値目標は存在する** — FR-CBG-14 が「full-tree 走査を CI step timeout 30s 未満で完了」を要求し、performance-design.md がこれを性能目標として引いている。したがって「適用可能な NFR が存在しない」ケースではない。
- **しかし目標は本番経路で既に強制されている** — CI step が `timeout --signal=TERM --kill-after=5s 30s bun tests/control-byte-gate.ts --check` の形で走るため、30s 超過は CI ジョブの失敗として直接現れる。強制メカニズムがそれ自体で判定を出しているので、同じ閾値を別のベンチマークで二重に測っても新しい情報は得られない。
- **したがって検証は実測記録と退行監視で構成する** — 目標なきベンチマークは検証劇場にあたり(org.md Forbidden)、一方で無言の省略は黙示の欠落になるため、何をもって性能要件を満たしたと判断するかをここに明記する。

## 測定項目

| 項目 | 取得コマンド | 基準 |
|---|---|---|
| 走査時間 | `time bun tests/control-byte-gate.ts --check` | < 30s(FR-CBG-14) |
| 走査件数 | 同コマンドの `scanned N files` | `git ls-files \| wc -l` − allowlist 命中件数 と一致 |
| コーパス総バイト数 | `git ls-files -z` の各 path に `os.path.getsize` を合算 | performance-design.md の「数百 MB 未満」前提の裏取り |

## 判定の性質

これは**単発の実測**であって統計的なベンチマークではない。走査は直列同期 I/O で、実行時間はコーパス規模にほぼ線形に効く。予算 30s に対して実測が一桁小さい間は、規模増だけが予算を脅かす要因になる。

## 退行の監視

閾値を新設せず、CI step の `timeout 30s` を唯一の退行検出面とする。予算に近づいた場合(目安として実測が 15s を超えた場合)は、performance-design.md の宣言どおり並行化を再訪する — それまでは YAGNI として持ち込まない。

## この判定を覆すべき条件

- コーパスが数百 MB 級へ増え、単発実測が予算の半分を超えた場合
- ゲートが並行化・キャッシュ等の非自明な最適化を持ち込み、正しさと速度のトレードオフが生じた場合
- FR-CBG-14 の 30s が変更された場合

いずれも、そのときに専用の負荷試験を設計する。

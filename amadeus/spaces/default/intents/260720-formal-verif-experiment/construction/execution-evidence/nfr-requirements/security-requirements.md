# Security Requirements — execution-evidence

## Threat model

`business-logic-model.md` のinjected process / content-addressed bundle、`business-rules.md` のargv / path / integrity規則、`requirements.md` のblind isolation / reproducibility、`technology-stack.md` のlocal Bun CLIを正本とする。脅威はshell injection、path escape、bundle改竄、ledger branch、handwritten evidence、private input漏洩である。

## Execution isolation

- commandはstring arrayとしてprocess portへ渡し、shell string、`eval`、implicit glob、command substitutionへ変換しない。
- cwdとinput / output pathはfrozen allowlistとrepository-relative canonical pathへ限定し、absolute / `..` / symlink escapeを拒否する。executableは別のclosed tool allowlistでBun / Javaを解決し、PATH lookup結果または明示absolute pathをrealpath化して、frozen executable identity / version / content hashと一致する場合だけ許す。未解決、別実体、symlink差替えを拒否する。
- environmentは明示allowlistだけを渡し、credential、home directory、unrelated CI secretをraw command receiptへ保存しない。
- arm / subject / freeze / baseline / input-set identityが一致する場合だけspawnする。

## Evidence integrity

payload manifest、bundle ID、envelope hash、runner/store previous-head chain、ledger coordinatesを再計算する。orphan、handwritten、片ledgerのみ、same identity / different bytes、unknown payload roleを成功evidenceへ採用しない。

stdout / stderrはopaque bytesとして保存し、terminalへの再表示時は制御文字をescapeする。evidence metadataへsealed fixture content、別arm private path、credentialを含めない。hashはsecret authenticationではなくintegrity identityとして扱う。

## Verification

testsはshell metacharacter argv、repository path escape、Bun / Java executable realpath・version・hash drift、PATH shadowing、environment leakage、payload改竄、envelope差替え、ledger fork、orphan / handwritten bundle、same-ID different-bytesをred fixtureとする。network egress、新規credential access、新規runtime dependencyは0件とする。

# Locally retained write-a-skill

October 10, 2026 — Pierre requested local retention. Ownership was migrated explicitly without changing the content or permissions of the eight files.

The skill remains under `.claude/skills/write-a-skill/` and `.codex/skills/write-a-skill/`. Its four former runtime files remain as local resources and are no longer kit-owned. No module was added and no source provenance was invented. `released-files.json` retains former ownership records/hashes/modes; `inventory-before.json` preserves the full prior inventory.

Future kit updates ignore these local files. The composed catalog stops listing them after update; discovery relies on their skill-directory presence. Maintain both copies identically when editing locally; managed-skill synchronization no longer owns them.

Validation checked all eight files and mirror equality; releasing ownership was tested in a temporary copy and update preview succeeded. The old guide refers to `scripts/skill-proposals.mjs`, which is absent from the current source kit. Retention does not prove that legacy workflow or native activation works.

This backup precedes update. Do not restore the old inventory alone afterward: it would disagree with updated managed files. The ownership migration itself did not apply an update.

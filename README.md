# Hunter's Codex

Phone-friendly character builder and sheet for a 6-session D&D 5e (2024 rules) vampire-hunter campaign.
Plain HTML/CSS/JS, no build step. Works offline once opened (installable PWA).

## Editing campaign content

Everything you'll want to change is in **`data/campaign.js`**:

- `quests` – quest titles shown on rewards
- `rewards` – quest rewards (weapons, relic spells, items) and their **unlock codes**
- `gear` – shop items anyone can add
- `backgrounds`, `feats` – homebrew options added next to the SRD ones

Reward text supports placeholders that scale with the character: `{dc}`, `{atk}`, `{pb}`, `{level}`,
`{level5}`, and any key you define in `scale` (see the comments at the top of the file).

After editing, commit and push. GitHub Pages redeploys in about a minute, and players get the new
version the next time they open the app while online.

## Files

- `index.html`, `styles.css`, `app.js` – the app
- `sw.js`, `manifest.webmanifest`, `icons/` – offline + install support
- `data/srd-rules.js` – classes/subclasses (levels 1–6), species, backgrounds, feats, weapons, armor
- `data/srd-spells.js` – all SRD spells of level 0–3 (generated from the SRD PDF)
- `data/campaign.js` – your stuff

## Legal

This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the
Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

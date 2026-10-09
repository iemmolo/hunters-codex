// =============================================================================
// Hunter's Codex — character builder & sheet for a 6-session vampire-hunter campaign.
// Plain JS, no build step. Data comes from data/*.js (window.SRD, window.CAMPAIGN).
// Characters are stored in this device's localStorage.
// =============================================================================
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------
  const SRD = window.SRD;
  const CAMP = window.CAMPAIGN || {};
  const MAX_LEVEL = Math.min(CAMP.maxLevel || 6, 6); // class data only goes to 6
  const STORE_KEY = "hunters-codex.v1";

  const SPELLS = [...SRD.spells, ...(CAMP.spells || [])];
  const SPELL_BY_NAME = new Map(SPELLS.map((s) => [s.name, s]));
  const CLASSES = [...SRD.classes, ...(CAMP.classes || [])];
  const SUBCLASSES = [...SRD.subclasses, ...(CAMP.subclasses || [])];
  const SPECIES = [...SRD.species, ...(CAMP.species || [])];
  const BACKGROUNDS = [...SRD.backgrounds, ...(CAMP.backgrounds || [])];
  const FEATS = [...SRD.feats, ...(CAMP.feats || [])];
  const REWARDS = CAMP.rewards || [];
  const GEAR = CAMP.gear || [];
  const ABILITIES = SRD.abilities;
  const ABILITY_IDS = ABILITIES.map((a) => a.id);
  const SKILLS = SRD.skills;

  // Rough "best stats first" order used by the Suggest button on the scores step.
  const SUGGESTED_ORDER = {
    barbarian: ["str", "con", "dex", "wis", "cha", "int"],
    bard: ["cha", "dex", "con", "wis", "int", "str"],
    cleric: ["wis", "con", "dex", "str", "cha", "int"],
    druid: ["wis", "con", "dex", "int", "cha", "str"],
    fighter: ["str", "con", "dex", "wis", "int", "cha"],
    monk: ["dex", "wis", "con", "str", "int", "cha"],
    paladin: ["str", "cha", "con", "wis", "dex", "int"],
    ranger: ["dex", "wis", "con", "str", "int", "cha"],
    rogue: ["dex", "con", "wis", "int", "cha", "str"],
    sorcerer: ["cha", "con", "dex", "wis", "int", "str"],
    warlock: ["cha", "con", "dex", "wis", "int", "str"],
    wizard: ["int", "con", "dex", "wis", "cha", "str"],
  };

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------
  const byId = (list, id) => list.find((x) => x.id === id);
  const abilityName = (id) => (ABILITIES.find((a) => a.id === id) || {}).name || id;
  const modOf = (score) => Math.floor((score - 10) / 2);
  const signed = (n) => (n >= 0 ? "+" + n : String(n));
  const pbFor = (level) => 2 + Math.floor((level - 1) / 4);
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ordinal = (n) => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Turn plain text with blank lines into paragraphs.
  function paras(text) {
    return String(text || "").split(/\n\s*\n/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  }

  // Pick the value for the current level out of { 1: "1d6", 5: "2d6" } style tables.
  function scaled(table, level) {
    let out = "";
    Object.keys(table).map(Number).sort((a, b) => a - b).forEach((lvl) => { if (level >= lvl) out = table[lvl]; });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------------
  function loadCharacters() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data.characters) ? data.characters : [];
    } catch (e) {
      console.warn("Could not load characters", e);
      return [];
    }
  }

  function saveCharacters() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ version: 1, characters: state.chars }));
      return true;
    } catch (e) {
      console.warn("Could not save", e);
      toast("Couldn't save — storage is full or blocked on this device.");
      return false;
    }
  }

  // Ask the browser not to evict our storage (best effort).
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }

  // ---------------------------------------------------------------------------
  // App state (in memory)
  // ---------------------------------------------------------------------------
  const state = {
    chars: loadCharacters(),
    draft: null,        // character being created / levelled / spell-edited
    step: 0,            // creation wizard step
    tab: "main",        // sheet tab
    openSpells: new Set(),
    search: {},         // spell picker search text by list id
    pickerTab: "cantrips",
    pendingReward: null,
  };

  function newCharacter() {
    return {
      id: uid(), name: "", speciesId: null, classId: null, backgroundId: null, level: 1,
      base: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
      bgAsi: { mode: "2-1", plus2: null, plus1: null },
      choices: {}, spells: { cantrips: [], prepared: [], book: [] },
      hpRolls: {}, hp: { current: 0, temp: 0 }, used: {}, slotsUsed: {},
      gear: [], rewards: [], notes: "", acBonus: 0, created: Date.now(),
    };
  }

  const findChar = (id) => state.chars.find((c) => c.id === id);

  // ---------------------------------------------------------------------------
  // Choice engine
  // Every decision a character makes is stored in c.choices under a key:
  //   "<level>|<scope>|<choiceId>"            e.g. "1|cls|style"
  //   "<parentKey>><option>><childId>"        nested choices granted by an option or feat
  // ---------------------------------------------------------------------------
  function subclassOf(c) {
    const v = (c.choices["3|cls|subclass"] || [])[0];
    return v ? byId(SUBCLASSES, v) : null;
  }

  function choiceOptions(def) {
    return def.options || [];
  }

  // Build the list of choice "instances" a character has, up to a level.
  // Each instance knows how many picks it needs (pools make invocations/masteries cumulative).
  function choiceInstances(c, uptoLevel) {
    const out = [];
    const poolCount = {};
    const cls = byId(CLASSES, c.classId);
    const sp = byId(SPECIES, c.speciesId);
    const bg = byId(BACKGROUNDS, c.backgroundId);

    function add(key, def, level, source) {
      let need = def.count || 1;
      if (def.pool) {
        need = def.total - (poolCount[def.pool] || 0);
        if (need <= 0) return;
      }
      out.push({ key, def, level, source, need });
      const vals = c.choices[key] || [];
      if (def.pool) poolCount[def.pool] = (poolCount[def.pool] || 0) + Math.min(vals.length, need);

      // Nested choices: options that grant more choices, or feats with choices.
      if (def.type === "pick") {
        vals.forEach((v) => {
          const opt = choiceOptions(def).find((o) => o.name === v);
          ((opt && opt.grants) || []).forEach((g) => add(`${key}>${v}>${g.id}`, g, level, `${source} · ${v}`));
        });
      }
      if (def.type === "asi" || def.type === "originFeat") {
        const feat = byId(FEATS, vals[0]);
        if (feat) (feat.choices || []).forEach((g) => add(`${key}>${feat.id}>${g.id}`, g, level, feat.name));
      }
    }

    for (let L = 1; L <= uptoLevel; L++) {
      if (L === 1) {
        if (cls) add("1|cls|skills", { id: "skills", type: "skills", count: cls.skills.count, from: cls.skills.from, label: `${cls.name} skills` }, 1, cls.name);
        if (sp) (sp.choices || []).forEach((def) => add(`1|sp|${def.id}`, def, 1, sp.name));
        if (bg) {
          const feat = byId(FEATS, bg.feat);
          if (feat) (feat.choices || []).forEach((g) => add(`1|bg|${feat.id}>${g.id}`, g, 1, `${bg.name}: ${feat.name}`));
        }
      }
      if (cls && cls.levels[L]) (cls.levels[L].choices || []).forEach((def) => add(`${L}|cls|${def.id}`, def, L, cls.name));
      const sub = subclassOf(c);
      if (sub && sub.levels[L]) (sub.levels[L].choices || []).forEach((def) => add(`${L}|sub|${def.id}`, def, L, sub.name));
    }
    return out;
  }

  const instDone = (c, inst) => (c.choices[inst.key] || []).length === inst.need;

  // Remove stored answers that no longer belong to any instance (e.g. after changing an option).
  function pruneChoices(c) {
    const keys = new Set(choiceInstances(c, c.level).map((i) => i.key));
    Object.keys(c.choices).forEach((k) => { if (!keys.has(k)) delete c.choices[k]; });
  }

  function choiceLabel(def) {
    if (def.label) return def.label;
    return {
      skills: "Skill proficiencies", expertise: "Expertise", subclass: "Subclass", asi: "Ability Score Improvement or feat",
      originFeat: "Origin feat", ability: "Ability increase", masteries: "Weapon masteries", spells: "Spells",
    }[def.type] || "Choice";
  }

  function valueLabel(def, v) {
    if (def.type === "subclass") return (byId(SUBCLASSES, v) || {}).name || v;
    if (def.type === "asi" || def.type === "originFeat") return (byId(FEATS, v) || {}).name || v;
    if (def.type === "ability") return abilityName(v);
    return v;
  }

  // ---------------------------------------------------------------------------
  // Derived character stats
  // ---------------------------------------------------------------------------
  function slotsFor(cls, level) {
    const sc = cls && cls.spellcasting;
    if (!sc) return [];
    if (sc.type === "pact") {
      const n = SRD.pactTable.slots[level - 1];
      const lvl = SRD.pactTable.slotLevel[level - 1];
      return [{ level: lvl, max: n, pact: true }];
    }
    return (SRD.slotTables[sc.type][level - 1] || []).map((max, i) => ({ level: i + 1, max }));
  }

  function derive(c) {
    const d = { c, level: c.level, pb: pbFor(c.level) };
    d.cls = byId(CLASSES, c.classId);
    d.sp = byId(SPECIES, c.speciesId);
    d.bg = byId(BACKGROUNDS, c.backgroundId);
    d.sub = subclassOf(c);
    d.insts = choiceInstances(c, c.level);
    const vals = (inst) => c.choices[inst.key] || [];

    // Collect pick values by choice id (e.g. "style", "lineage", "invocations").
    d.picks = {};
    d.insts.forEach((inst) => {
      const id = inst.def.pool || inst.def.id;
      d.picks[id] = (d.picks[id] || []).concat(vals(inst));
    });
    d.pick = (id) => d.picks[id] || [];

    // Ability scores: base + background + ability-increase choices (cap 20).
    d.scores = {};
    ABILITY_IDS.forEach((a) => { d.scores[a] = c.base[a] == null ? 10 : c.base[a]; });
    if (d.bg) {
      const b = c.bgAsi || {};
      if (b.mode === "1-1-1") d.bg.abilities.forEach((a) => { d.scores[a] += 1; });
      else { if (b.plus2) d.scores[b.plus2] += 2; if (b.plus1) d.scores[b.plus1] += 1; }
    }
    d.insts.forEach((inst) => {
      if (inst.def.type === "ability") vals(inst).forEach((a) => { d.scores[a] = Math.min(20, d.scores[a] + 1); });
    });
    d.mods = {};
    ABILITY_IDS.forEach((a) => { d.mods[a] = modOf(d.scores[a]); });
    d.bestMod = Math.max(...ABILITY_IDS.map((a) => d.mods[a]));
    d.hunterDC = 8 + d.pb + d.bestMod;
    d.hunterAtk = d.pb + d.bestMod;

    // Feats.
    d.feats = [];
    if (d.bg) { const f = byId(FEATS, d.bg.feat); if (f) d.feats.push(f); }
    d.insts.forEach((inst) => {
      if (inst.def.type === "asi" || inst.def.type === "originFeat") vals(inst).forEach((id) => { const f = byId(FEATS, id); if (f) d.feats.push(f); });
    });
    d.hasFeat = (id) => d.feats.some((f) => f.id === id);

    // Skills & saves.
    d.skillProf = new Set(d.bg ? d.bg.skills : []);
    d.expertise = new Set();
    d.insts.forEach((inst) => {
      if (inst.def.type === "skills") vals(inst).forEach((s) => d.skillProf.add(s));
    });
    d.insts.forEach((inst) => {
      if (inst.def.type === "expertise") vals(inst).forEach((s) => d.expertise.add(s));
    });
    d.saveProf = new Set(d.cls ? d.cls.saves : []);
    d.skillMod = (name) => {
      const sk = SKILLS.find((s) => s.name === name);
      let m = d.mods[sk.ability];
      if (d.expertise.has(name)) m += d.pb * 2;
      else if (d.skillProf.has(name)) m += d.pb;
      else if (c.classId === "bard" && c.level >= 2) m += Math.floor(d.pb / 2); // Jack of All Trades
      if ((name === "Arcana" || name === "Religion") && d.pick("order").includes("Thaumaturge")) m += Math.max(1, d.mods.wis);
      if ((name === "Arcana" || name === "Nature") && d.pick("order").includes("Magician")) m += Math.max(1, d.mods.wis);
      return m;
    };
    d.saveMod = (a) => d.mods[a] + (d.saveProf.has(a) ? d.pb : 0);

    // Proficiencies & training.
    d.armorTraining = new Set(d.cls ? d.cls.armorTraining : []);
    let martial = d.cls ? (/Simple and Martial/.test(d.cls.weapons) ? "all" : c.classId === "monk" ? "light" : c.classId === "rogue" ? "finesse-light" : "none") : "none";
    d.insts.forEach((inst) => {
      if (inst.def.type !== "pick") return;
      vals(inst).forEach((v) => {
        const opt = choiceOptions(inst.def).find((o) => o.name === v);
        if (opt && opt.armorTraining) opt.armorTraining.forEach((t) => d.armorTraining.add(t));
        if (opt && opt.weapons) martial = "all";
      });
    });
    d.martial = martial;
    d.masteries = d.pick("mastery");

    // Hit points.
    d.hitDie = d.cls ? d.cls.hitDie : 8;
    let hp = 0;
    for (let L = 1; L <= c.level; L++) {
      const roll = c.hpRolls[L] != null ? c.hpRolls[L] : (L === 1 ? d.hitDie : Math.floor(d.hitDie / 2) + 1);
      hp += Math.max(1, roll + d.mods.con);
    }
    if (d.sp && d.sp.hpPerLevel) hp += d.sp.hpPerLevel * c.level;
    if (d.sub && d.sub.hpFromLevel3 && c.level >= 3) hp += c.level;
    d.hpMax = hp;

    // Speed.
    let speed = d.sp ? d.sp.speed : 30;
    const lineage = d.pick("lineage")[0];
    if (lineage === "Wood Elf") speed = 35;
    const armor = equippedArmor(c);
    const heavy = armor && armor.type === "heavy";
    if (c.classId === "barbarian" && c.level >= 5 && !heavy) speed += 10;
    if (c.classId === "ranger" && c.level >= 6 && !heavy) speed += 10;
    if (c.classId === "monk" && c.level >= 2 && !armor && !equippedShield(c)) speed += c.level >= 6 ? 15 : 10;
    d.speed = speed;

    d.ac = computeAC(c, d);
    d.initiative = d.mods.dex + (d.hasFeat("alert") ? d.pb : 0);
    d.passivePerception = 10 + d.skillMod("Perception");

    deriveSpells(c, d);
    d.resources = deriveResources(c, d);
    return d;
  }

  // --- Armor & AC ------------------------------------------------------------
  function equippedArmor(c) {
    const g = c.gear.find((x) => x.kind === "armor" && x.equipped);
    return g ? SRD.armor.find((a) => a.name === g.ref) : null;
  }
  function equippedShield(c) {
    if (c.gear.some((x) => x.kind === "shield" && x.equipped)) return { bonus: 2, name: "Shield" };
    const rewardShield = c.gear.find((x) => x.kind === "reward" && x.equipped && (byId(REWARDS, x.ref) || {}).slot === "shield");
    if (rewardShield) { const r = byId(REWARDS, rewardShield.ref); return { bonus: r.acBonus || 2, name: r.name }; }
    return null;
  }

  function computeAC(c, d) {
    const armor = equippedArmor(c);
    const shield = equippedShield(c);
    let ac;
    if (armor) {
      ac = armor.base + Math.min(d.mods.dex, armor.dexCap);
      if (d.pick("style").includes("Defense")) ac += 1;
    } else {
      ac = 10 + d.mods.dex;
      const un = d.cls && d.cls.unarmored;
      if (un && !(c.classId === "monk" && shield)) ac = Math.max(ac, 10 + d.mods[un[0]] + d.mods[un[1]]);
      if (d.sub && d.sub.id === "draconic") ac = Math.max(ac, 10 + d.mods.dex + d.mods.cha);
    }
    if (shield) ac += shield.bonus;
    // Other equipped rewards with an AC bonus (not shields).
    c.gear.forEach((g) => {
      if (g.kind !== "reward" || !g.equipped) return;
      const r = byId(REWARDS, g.ref);
      if (r && r.acBonus && r.slot !== "shield") ac += r.acBonus;
    });
    return ac + (Number(c.acBonus) || 0);
  }

  // --- Spells -----------------------------------------------------------------
  function deriveSpells(c, d) {
    const sc = d.cls && d.cls.spellcasting;
    d.casting = sc || null;
    d.slots = slotsFor(d.cls, c.level);
    d.maxSpellLevel = d.slots.length ? Math.max(...d.slots.map((s) => s.level)) : 0;
    d.cantripCount = sc ? sc.cantrips[c.level - 1] : 0;
    d.preparedCount = sc ? sc.prepared[c.level - 1] : 0;
    d.bookCount = sc && sc.spellbook ? 6 + 2 * (c.level - 1) : 0;
    if (sc) {
      d.spellMod = d.mods[sc.ability];
      d.spellDC = 8 + d.pb + d.spellMod;
      d.spellAtk = d.pb + d.spellMod;
    }

    // Spells that don't count against your prepared number.
    const always = [];
    const addAlways = (name, source, note) => {
      if (!always.some((x) => x.name === name)) always.push({ name, source, note });
    };
    if (d.cls && d.cls.alwaysPrepared) {
      Object.entries(d.cls.alwaysPrepared).forEach(([lvl, list]) => { if (c.level >= +lvl) list.forEach((n) => addAlways(n, d.cls.name)); });
    }
    if (d.sub && d.sub.alwaysPrepared) {
      Object.entries(d.sub.alwaysPrepared).forEach(([lvl, list]) => { if (c.level >= +lvl) list.forEach((n) => addAlways(n, d.sub.name)); });
    }
    if (d.sub && d.sub.landSpells) {
      const land = d.pick("land")[0];
      const table = land && d.sub.landSpells[land];
      if (table) Object.entries(table).forEach(([lvl, list]) => { if (c.level >= +lvl) list.forEach((n) => addAlways(n, `${land} Land`)); });
    }
    // Species lineage spells.
    if (d.sp) {
      (d.sp.choices || []).forEach((def) => {
        (c.choices[`1|sp|${def.id}`] || []).forEach((v) => {
          const opt = choiceOptions(def).find((o) => o.name === v);
          if (!opt || !opt.spells) return;
          Object.entries(opt.spells).forEach(([lvl, list]) => {
            if (c.level >= +lvl) list.forEach((n) => {
              const sp = SPELL_BY_NAME.get(n);
              addAlways(n, v, sp && sp.level > 0 ? "free cast 1/long rest" : "");
            });
          });
        });
      });
    }
    // Spells learned through choices (Magic Initiate, Blessed Warrior, Pact of the Tome...).
    d.bonusBook = [];
    d.insts.forEach((inst) => {
      if (inst.def.type !== "spells") return;
      (c.choices[inst.key] || []).forEach((n) => {
        if (inst.def.target === "spellbook") d.bonusBook.push(n);
        else addAlways(n, inst.def.label || inst.source, inst.def.id === "mi-spell" ? "free cast 1/long rest" : "");
      });
    });
    d.always = always;
    d.book = Array.from(new Set([...(c.spells.book || []), ...d.bonusBook]));
  }

  // Which spells may a class pick from? (Used by the spell picker.)
  function classSpellOptions(d, kind) {
    const lists = d.casting.lists;
    const alwaysNames = new Set(d.always.map((a) => a.name));
    if (kind === "cantrips") return SPELLS.filter((s) => s.level === 0 && s.classes.some((x) => lists.includes(x)));
    if (kind === "book") return SPELLS.filter((s) => s.level >= 1 && s.level <= d.maxSpellLevel && s.classes.some((x) => lists.includes(x)));
    if (kind === "prepared") {
      const pool = d.casting.spellbook
        ? d.book.map((n) => SPELL_BY_NAME.get(n)).filter(Boolean)
        : SPELLS.filter((s) => s.classes.some((x) => lists.includes(x)));
      return pool.filter((s) => s.level >= 1 && s.level <= d.maxSpellLevel && !alwaysNames.has(s.name));
    }
    return [];
  }

  function spellChoiceOptions(def, d) {
    return SPELLS.filter((s) => {
      if (def.lists !== "any" && !s.classes.some((x) => def.lists.includes(x))) return false;
      if (def.maxLevel) { if (s.level < 1 || s.level > def.maxLevel) return false; }
      else if (def.level === "slot") { if (s.level > d.maxSpellLevel) return false; }
      else if (s.level !== def.level) return false;
      if (def.filter === "ritual" && !s.ritual) return false;
      if (def.filter === "evocation" && s.school !== "Evocation") return false;
      return true;
    });
  }

  // --- Resources (tap-to-use trackers) --------------------------------------
  function resourceMax(r, c, d) {
    const L = c.level;
    if (Array.isArray(r.max)) return r.max[L - 1] || 0;
    if (r.max === "pb") return d.pb;
    if (r.max === "level") return L;
    if (r.max === "level*5") return L * 5;
    if (typeof r.max === "string" && r.max.startsWith("mod:")) return Math.max(1, d.mods[r.max.slice(4)]);
    return Number(r.max) || 0;
  }

  function deriveResources(c, d) {
    const list = [];
    const add = (r, scope) => {
      if (r.minLevel && c.level < r.minLevel) return;
      const max = resourceMax(r, c, d);
      if (max <= 0) return;
      let reset = r.reset;
      if (r.shortFromLevel && c.level >= r.shortFromLevel) reset = "short";
      list.push({ key: `${scope}:${r.id}`, name: r.name, max, reset, pool: !!r.pool });
    };
    if (d.sp) (d.sp.resources || []).forEach((r) => add(r, "sp"));
    if (d.cls) (d.cls.resources || []).forEach((r) => add(r, "cls"));
    if (d.sub) (d.sub.resources || []).forEach((r) => add(r, "sub"));
    add({ id: "hit-dice", name: `Hit Dice (d${d.hitDie})`, max: "level", reset: "long" }, "core");
    return list;
  }

  // --- Rewards ----------------------------------------------------------------
  function fillRewardText(r, d) {
    let t = r.text || "";
    const scale = r.scale || {};
    t = t.replace(/\{(\w+)\}/g, (m, key) => {
      if (key === "dc") return String(d.hunterDC);
      if (key === "atk") return String(d.hunterAtk);
      if (key === "pb") return String(d.pb);
      if (key === "level") return String(d.level);
      if (key === "level5") return String(d.level * 5);
      if (scale[key]) return scaled(scale[key], d.level);
      return m;
    });
    return t;
  }

  function rewardUsesMax(r, d) {
    if (!r.uses) return 0;
    return r.uses.max === "pb" ? d.pb : Number(r.uses.max) || 0;
  }

  // --- Weapons & attacks ---------------------------------------------------
  function weaponProficient(w, d) {
    if (w.category === "simple") return true;
    if (d.martial === "all") return true;
    if (d.martial === "light") return /Light/.test(w.props);
    if (d.martial === "finesse-light") return /Finesse|Light/.test(w.props);
    return false;
  }

  function attackFor(w, d, extraBonus, name, source) {
    const ranged = w.kind === "ranged";
    const finesse = /Finesse/.test(w.props);
    const monkWeapon = d.c.classId === "monk" && !ranged && (w.category === "simple" || /Light/.test(w.props));
    let ability = ranged ? "dex" : "str";
    if (finesse || monkWeapon) ability = d.mods.dex > d.mods.str ? "dex" : "str";
    const prof = weaponProficient(w, d);
    let toHit = d.mods[ability] + (prof ? d.pb : 0) + (extraBonus || 0);
    if (ranged && d.pick("style").includes("Archery")) toHit += 2;
    let die = w.damage.split(" ")[0];
    const dtype = w.damage.split(" ").slice(1).join(" ");
    if (monkWeapon) {
      const md = d.level >= 5 ? "1d8" : "1d6";
      if (die === "1d4" || die === "1d6") die = md;
    }
    const dmgBonus = d.mods[ability] + (extraBonus || 0);
    return {
      name: name || w.name, source, toHit, prof,
      damage: `${die}${dmgBonus ? signed(dmgBonus) : ""} ${dtype}`,
      props: w.props, mastery: w.mastery,
      masteryKnown: d.masteries.includes(w.name),
    };
  }

  function attacksFor(c, d) {
    const out = [];
    c.gear.forEach((g) => {
      if (g.kind === "weapon") {
        const w = SRD.weapons.find((x) => x.name === g.ref);
        if (w) out.push(attackFor(w, d, 0, g.name || w.name));
      }
      if (g.kind === "reward") {
        const r = byId(REWARDS, g.ref);
        if (r && r.type === "weapon") {
          const base = SRD.weapons.find((x) => x.name === r.base) || {
            name: r.name, category: "martial", kind: "melee", damage: r.damage || "1d6 Slashing", props: r.props || "", mastery: r.mastery || "",
          };
          const a = attackFor(base, d, r.bonus || 0, r.name, "Quest reward");
          a.masteryKnown = d.masteries.includes(base.name);
          out.push(a);
        }
      }
    });
    const unarmedDie = c.classId === "monk" ? (d.level >= 5 ? "1d8" : "1d6") : "1";
    const unarmedAb = c.classId === "monk" && d.mods.dex > d.mods.str ? "dex" : "str";
    out.push({
      name: "Unarmed Strike", toHit: d.mods[unarmedAb] + d.pb, prof: true,
      damage: unarmedDie === "1" ? `${Math.max(1, 1 + d.mods.str)} Bludgeoning` : `${unarmedDie}${signed(d.mods[unarmedAb])} Bludgeoning`,
      props: "", mastery: "",
    });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Routing
  // ---------------------------------------------------------------------------
  function route() {
    const parts = (location.hash || "#/").replace(/^#\/?/, "").split("/").filter(Boolean);
    return { name: parts[0] || "list", id: parts[1], sub: parts[2] };
  }
  function go(hash) { location.hash = hash; }

  window.addEventListener("hashchange", () => {
    const r = route();
    // Starting a flow resets its draft.
    if (r.name === "c" && r.sub === "levelup") startLevelUp(r.id);
    else if (r.name === "c" && r.sub === "spells") startSpellEdit(r.id);
    else if (r.name !== "new") state.draft = null;
    window.scrollTo(0, 0);
    render();
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  const app = document.getElementById("app");

  function render() {
    const r = route();
    let html;
    if (r.name === "new") html = viewCreate();
    else if (r.name === "c" && r.sub === "levelup") html = viewLevelUp(r.id);
    else if (r.name === "c" && r.sub === "spells") html = viewSpellEdit(r.id);
    else if (r.name === "c") html = viewSheet(r.id);
    else if (r.name === "about") html = viewAbout();
    else html = viewList();
    app.innerHTML = html;
    applySearchFilters();
  }

  function header(title, back) {
    return `<header class="topbar">
      ${back ? `<a class="icon-btn" href="${back}" aria-label="Back">‹</a>` : `<span class="brand-mark" aria-hidden="true">✠</span>`}
      <h1>${esc(title)}</h1>
      <a class="icon-btn" href="#/about" aria-label="About">?</a>
    </header>`;
  }

  // ----- Character list -------------------------------------------------------
  function viewList() {
    const cards = state.chars.map((c) => {
      const d = derive(c);
      return `<a class="char-card" href="#/c/${c.id}">
        <div class="char-sigil">${esc((c.name || "?").slice(0, 1).toUpperCase())}</div>
        <div class="char-info">
          <strong>${esc(c.name || "Unnamed hunter")}</strong>
          <span>Level ${c.level} ${esc(d.sp ? d.sp.name : "")} ${esc(d.cls ? d.cls.name : "")}${d.sub ? " · " + esc(d.sub.name) : ""}</span>
        </div>
        <span class="chev">›</span>
      </a>`;
    }).join("");
    return `${header(CAMP.title || "Hunter's Codex")}
      <main class="wrap">
        <section class="hero">
          <p class="kicker">The Order keeps its records</p>
          <h2>Your hunters</h2>
        </section>
        ${cards || `<div class="empty"><p>No hunters yet.</p><p class="muted">Create one to begin the hunt.</p></div>`}
        <a class="btn btn-primary btn-block" href="#/new" data-act="new">+ New hunter</a>
        <div class="row gap mt">
          <button class="btn btn-ghost" data-act="export-all">Back up all</button>
          <label class="btn btn-ghost file-btn">Restore backup<input type="file" accept="application/json,.json" data-act="import"></label>
        </div>
        <p class="muted small mt">Characters are saved on this device only. Back up once in a while.</p>
      </main>`;
  }

  // ----- Creation wizard --------------------------------------------------------
  const CREATE_STEPS = [
    { id: "species", title: "Species" },
    { id: "class", title: "Class" },
    { id: "background", title: "Background" },
    { id: "scores", title: "Ability Scores" },
    { id: "choices", title: "Choices" },
    { id: "spells", title: "Spells" },
    { id: "review", title: "Review" },
  ];

  function createSteps() {
    const cls = state.draft && byId(CLASSES, state.draft.classId);
    return CREATE_STEPS.filter((s) => s.id !== "spells" || (cls && cls.spellcasting));
  }

  function viewCreate() {
    if (!state.draft) { state.draft = newCharacter(); state.step = 0; }
    const steps = createSteps();
    const step = steps[Math.min(state.step, steps.length - 1)];
    const c = state.draft;
    let body = "";
    if (step.id === "species") body = stepSpecies(c);
    if (step.id === "class") body = stepClass(c);
    if (step.id === "background") body = stepBackground(c);
    if (step.id === "scores") body = stepScores(c);
    if (step.id === "choices") body = stepChoices(c, 1);
    if (step.id === "spells") body = spellPicker(c);
    if (step.id === "review") body = stepReview(c);
    const problem = stepProblem(step.id, c);
    const last = state.step >= steps.length - 1;
    return `${header("New Hunter", "#/")}
      <main class="wrap">
        <ol class="steps">${steps.map((s, i) => `<li class="${i === state.step ? "on" : i < state.step ? "done" : ""}">${esc(s.title)}</li>`).join("")}</ol>
        ${body}
        <div class="sticky-actions">
          ${state.step > 0 ? `<button class="btn btn-ghost" data-act="step-back">Back</button>` : `<span></span>`}
          ${last
            ? `<button class="btn btn-primary" data-act="create" ${problem ? "disabled" : ""}>Create hunter</button>`
            : `<button class="btn btn-primary" data-act="step-next" ${problem ? "disabled" : ""}>Next</button>`}
        </div>
        ${problem ? `<p class="hint center">${esc(problem)}</p>` : ""}
      </main>`;
  }

  function stepProblem(id, c) {
    if (id === "species") {
      if (!c.name.trim()) return "Give your hunter a name.";
      if (!c.speciesId) return "Pick a species.";
    }
    if (id === "class" && !c.classId) return "Pick a class.";
    if (id === "background") {
      if (!c.backgroundId) return "Pick a background.";
      const b = c.bgAsi;
      if (b.mode === "2-1" && (!b.plus2 || !b.plus1 || b.plus2 === b.plus1)) return "Choose where your +2 and +1 go.";
    }
    if (id === "scores" && ABILITY_IDS.some((a) => c.base[a] == null)) return "Assign all six scores.";
    if (id === "choices") {
      const open = choiceInstances(c, 1).find((i) => !instDone(c, i));
      if (open) return `Finish: ${choiceLabel(open.def)}`;
    }
    if (id === "spells") return spellProblem(c);
    return "";
  }

  function optionCard(act, value, selected, title, sub, body, extra) {
    return `<button type="button" class="opt ${selected ? "sel" : ""}" data-act="${act}" data-value="${esc(value)}" ${extra || ""}>
      <span class="opt-title">${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ""}</span>
      ${body ? `<span class="opt-body">${body}</span>` : ""}
    </button>`;
  }

  function stepSpecies(c) {
    return `<section class="card">
        <label class="field"><span>Hunter's name</span>
          <input type="text" data-bind="name" value="${esc(c.name)}" placeholder="e.g. Mira Ashgrave" autocomplete="off"></label>
      </section>
      <h3 class="section-title">Choose a species</h3>
      <div class="opts">
        ${SPECIES.map((s) => optionCard("pick-species", s.id, c.speciesId === s.id, s.name,
          `Speed ${s.speed} ft${s.darkvision ? ` · Darkvision ${s.darkvision} ft` : ""}`,
          `${esc(s.blurb || "")}<ul class="mini">${s.traits.map((t) => `<li><b>${esc(t.name)}${t.minLevel ? ` (lvl ${t.minLevel})` : ""}.</b> ${esc(t.text.replace(/\{\w+\}/g, "1d10"))}</li>`).join("")}</ul>`)).join("")}
      </div>`;
  }

  function stepClass(c) {
    return `<h3 class="section-title">Choose a class</h3>
      <div class="opts">
        ${CLASSES.map((k) => optionCard("pick-class", k.id, c.classId === k.id, k.name,
          `d${k.hitDie} HP · ${k.primary}${k.spellcasting ? " · Spellcaster" : ""}`,
          `${esc(k.blurb || "")}<ul class="mini">
            <li><b>Saves:</b> ${k.saves.map(abilityName).join(", ")}</li>
            <li><b>Armor:</b> ${esc(k.armor)}</li>
            <li><b>Weapons:</b> ${esc(k.weapons)}</li>
            <li><b>Subclass (lvl 3):</b> ${SUBCLASSES.filter((s) => s.classId === k.id).map((s) => esc(s.name)).join(", ")}</li>
          </ul>`)).join("")}
      </div>`;
  }

  function stepBackground(c) {
    const bg = byId(BACKGROUNDS, c.backgroundId);
    let asi = "";
    if (bg) {
      const b = c.bgAsi;
      const sel = (field, exclude) => `<select data-bind="bgAsi.${field}">
          <option value="">—</option>
          ${bg.abilities.map((a) => `<option value="${a}" ${b[field] === a ? "selected" : ""} ${exclude === a ? "disabled" : ""}>${abilityName(a)}</option>`).join("")}
        </select>`;
      asi = `<section class="card">
        <h3>Ability bonuses</h3>
        <p class="muted small">${esc(bg.name)} raises ${bg.abilities.map(abilityName).join(", ")}.</p>
        <div class="seg">
          <button class="${b.mode === "2-1" ? "on" : ""}" data-act="bgasi-mode" data-value="2-1">+2 / +1</button>
          <button class="${b.mode === "1-1-1" ? "on" : ""}" data-act="bgasi-mode" data-value="1-1-1">+1 / +1 / +1</button>
        </div>
        ${b.mode === "2-1" ? `<div class="grid2 mt">
            <label class="field"><span>+2 to</span>${sel("plus2", b.plus1)}</label>
            <label class="field"><span>+1 to</span>${sel("plus1", b.plus2)}</label>
          </div>` : `<p class="mt">+1 each to ${bg.abilities.map(abilityName).join(", ")}.</p>`}
      </section>`;
    }
    return `<h3 class="section-title">Choose a background</h3>
      <div class="opts">
        ${BACKGROUNDS.map((b) => {
          const f = byId(FEATS, b.feat);
          return optionCard("pick-bg", b.id, c.backgroundId === b.id, b.name, b.abilities.map(abilityName).join(" · "),
            `${esc(b.blurb || "")}<ul class="mini">
              <li><b>Skills:</b> ${esc(b.skills.join(", "))}</li>
              <li><b>Tool:</b> ${esc(b.tool)}</li>
              <li><b>Feat:</b> ${esc(f ? f.name : b.feat)}${f ? ` — ${esc(f.text)}` : ""}</li>
              <li><b>Gear:</b> ${esc(b.equipment)}</li></ul>`);
        }).join("")}
      </div>
      ${asi}`;
  }

  function stepScores(c) {
    const d = derive(c);
    const used = ABILITY_IDS.map((a) => c.base[a]).filter((v) => v != null);
    const rows = ABILITIES.map((a) => {
      const bonus = d.scores[a.id] - (c.base[a.id] == null ? 10 : c.base[a.id]);
      return `<div class="score-row">
        <span class="score-name">${a.name}</span>
        <select data-bind="base.${a.id}">
          <option value="">—</option>
          ${SRD.standardArray.map((v) => {
            const taken = used.filter((u) => u === v).length >= SRD.standardArray.filter((x) => x === v).length && c.base[a.id] !== v;
            return `<option value="${v}" ${c.base[a.id] === v ? "selected" : ""} ${taken ? "disabled" : ""}>${v}</option>`;
          }).join("")}
        </select>
        <span class="score-bonus">${bonus ? signed(bonus) : ""}</span>
        <span class="score-final">${c.base[a.id] == null ? "—" : `${d.scores[a.id]} <small>(${signed(d.mods[a.id])})</small>`}</span>
      </div>`;
    }).join("");
    const cls = byId(CLASSES, c.classId);
    return `<section class="card">
        <h3>Standard array</h3>
        <p class="muted small">Assign 15, 14, 13, 12, 10, 8 — each once. ${cls ? `${esc(cls.name)}s want <b>${esc(cls.primary)}</b> highest.` : ""}</p>
        <div class="score-head"><span>Ability</span><span>Base</span><span>Bg</span><span>Total</span></div>
        ${rows}
        <div class="row gap mt">
          <button class="btn btn-ghost" data-act="suggest-scores">Suggest for ${esc(cls ? cls.name : "class")}</button>
          <button class="btn btn-ghost" data-act="clear-scores">Clear</button>
        </div>
      </section>`;
  }

  // Render every choice for a given level, grouped by where it comes from.
  function stepChoices(c, level) {
    const insts = choiceInstances(c, c.level).filter((i) => i.level === level || !instDone(c, i));
    if (!insts.length) return `<section class="card"><p>No choices to make at this level.</p></section>`;
    return insts.map((inst) => renderChoice(c, inst)).join("");
  }

  function renderChoice(c, inst) {
    const d = derive(c);
    const def = inst.def;
    const vals = c.choices[inst.key] || [];
    const full = vals.length >= inst.need;
    const head = `<div class="choice-head">
        <h3>${esc(choiceLabel(def))}</h3>
        <span class="pill ${vals.length === inst.need ? "ok" : ""}">${vals.length}/${inst.need}</span>
      </div>
      <p class="muted small">${esc(inst.source)}${def.pool ? " · picks from earlier levels are kept" : ""}</p>`;
    const k = esc(inst.key);
    const toggle = (value, title, sub, body, disabled) => {
      const sel = vals.includes(value);
      return optionCard("choose", value, sel, title, sub, body, `data-key="${k}" data-need="${inst.need}" ${!sel && full && inst.need > 1 ? "disabled" : ""} ${disabled ? "disabled" : ""}`);
    };
    let body = "";

    if (def.type === "skills" || def.type === "expertise") {
      const otherKeys = (id) => d.insts.filter((i) => i.key !== inst.key && i.def.type === id).flatMap((i) => c.choices[i.key] || []);
      let pool = def.from || SKILLS.map((s) => s.name);
      if (def.type === "skills") {
        const taken = new Set([...(d.bg ? d.bg.skills : []), ...otherKeys("skills")]);
        pool = pool.filter((s) => !taken.has(s) || vals.includes(s));
      } else {
        const takenExp = new Set(otherKeys("expertise"));
        pool = pool.filter((s) => (d.skillProf.has(s) && !takenExp.has(s)) || vals.includes(s));
      }
      body = `<div class="chips">${pool.map((s) => {
        const sel = vals.includes(s);
        return `<button type="button" class="chip ${sel ? "sel" : ""}" data-act="choose" data-key="${k}" data-need="${inst.need}" data-value="${esc(s)}" ${!sel && full && inst.need > 1 ? "disabled" : ""}>${esc(s)}</button>`;
      }).join("")}</div>${!pool.length ? `<p class="hint">No eligible skills — pick skill proficiencies first.</p>` : ""}`;
    } else if (def.type === "ability") {
      const from = def.from || ABILITY_IDS;
      body = `<div class="chips">${from.map((a) => {
        const sel = vals.includes(a);
        return `<button type="button" class="chip ${sel ? "sel" : ""}" data-act="choose" data-key="${k}" data-need="1" data-value="${a}">${abilityName(a)} <small>${d.scores[a]}</small></button>`;
      }).join("")}</div>`;
    } else if (def.type === "subclass") {
      body = `<div class="opts">${SUBCLASSES.filter((s) => s.classId === c.classId).map((s) => {
        const feats = Object.entries(s.levels).map(([lvl, l]) => l.features.map((f) => `<li><b>Lvl ${lvl} · ${esc(f.name)}.</b> ${esc(f.text)}</li>`).join("")).join("");
        return toggle(s.id, s.name, s.blurb, `<ul class="mini">${feats}</ul>`);
      }).join("")}</div>`;
    } else if (def.type === "asi" || def.type === "originFeat") {
      const taken = new Set(d.feats.map((f) => f.id));
      const opts = FEATS.filter((f) => {
        if (def.type === "originFeat" && f.category !== "origin") return false;
        if (def.type === "asi" && !(f.category === "general" || f.category === "origin")) return false;
        if (f.minLevel && c.level < f.minLevel) return false;
        const repeatable = f.id === "asi" || f.id === "skilled";
        return repeatable || !taken.has(f.id) || vals.includes(f.id);
      });
      body = `<div class="opts">${opts.map((f) => toggle(f.id, f.name, f.prereq ? `Prerequisite: ${f.prereq}` : f.category === "origin" ? "Origin feat" : "", esc(f.text))).join("")}</div>`;
    } else if (def.type === "masteries") {
      const earlier = d.insts.filter((i) => i.def.pool === def.pool && i.key !== inst.key).flatMap((i) => c.choices[i.key] || []);
      const filter = (d.cls && d.cls.masteryFilter) || "any";
      const ws = SRD.weapons.filter((w) => {
        if (earlier.includes(w.name)) return false;
        if (filter === "melee") return w.kind === "melee";
        if (filter === "rogue") return w.category === "simple" || /Finesse|Light/.test(w.props);
        return weaponProficient(w, d) || filter === "any";
      });
      body = `${earlier.length ? `<p class="small">Already mastered: ${esc(earlier.join(", "))}</p>` : ""}
        <div class="opts compact">${ws.map((w) => toggle(w.name, w.name, `${w.damage} · ${w.mastery}`, `<span class="small">${esc(SRD.masteryText[w.mastery] || "")}</span>`)).join("")}</div>`;
    } else if (def.type === "spells") {
      const opts = spellChoiceOptions(def, d);
      body = spellList(`choice:${inst.key}`, opts, vals, { act: "choose", key: inst.key, need: inst.need });
    } else if (def.type === "pick") {
      const earlier = def.pool ? d.insts.filter((i) => i.def.pool === def.pool && i.key !== inst.key).flatMap((i) => c.choices[i.key] || []) : [];
      const allPicked = new Set([...earlier, ...vals]);
      const opts = choiceOptions(def).filter((o) => !earlier.includes(o.name));
      body = `${earlier.length ? `<p class="small">Already known: ${esc(earlier.join(", "))}</p>` : ""}
        <div class="opts">${opts.map((o) => {
          const tooLow = o.minLevel && c.level < o.minLevel;
          const missing = o.requires && !allPicked.has(o.requires);
          const sub = tooLow ? `Requires level ${o.minLevel}` : missing ? `Requires ${o.requires}` : "";
          return toggle(o.name, o.name, sub, o.text ? esc(o.text) : "", (tooLow || missing) && !vals.includes(o.name));
        }).join("")}</div>`;
    }
    return `<section class="card choice">${head}${body}</section>`;
  }

  function stepReview(c) {
    const d = derive(c);
    return `<section class="card">
        <h3>${esc(c.name)}</h3>
        <p>${esc(d.sp.name)} ${esc(d.cls.name)} · ${esc(d.bg.name)}</p>
        <div class="stat-row mt">
          <div class="stat"><span>HP</span><b>${d.hpMax}</b></div>
          <div class="stat"><span>AC</span><b>${d.ac}</b></div>
          <div class="stat"><span>Speed</span><b>${d.speed}</b></div>
          <div class="stat"><span>Init</span><b>${signed(d.initiative)}</b></div>
        </div>
        ${abilityGrid(d)}
        <p class="small mt"><b>Skills:</b> ${esc([...d.skillProf].sort().join(", "))}</p>
        ${d.expertise.size ? `<p class="small"><b>Expertise:</b> ${esc([...d.expertise].join(", "))}</p>` : ""}
        <p class="small"><b>Feats:</b> ${esc(d.feats.map((f) => f.name).join(", ") || "—")}</p>
        <p class="muted small mt">Level 1 HP uses your full hit die. Add armor and weapons on the Gear tab once you're in.</p>
      </section>`;
  }

  // ----- Spell picker (creation, level up, editing) -----------------------------
  function spellNeeds(c) {
    const d = derive(c);
    if (!d.casting) return null;
    return { d, cantrips: d.cantripCount, book: d.bookCount, prepared: d.preparedCount };
  }

  function spellProblem(c) {
    const n = spellNeeds(c);
    if (!n) return "";
    const s = c.spells;
    if (s.cantrips.length !== n.cantrips) return `Choose ${n.cantrips} cantrip${n.cantrips === 1 ? "" : "s"} (${s.cantrips.length} chosen).`;
    if (n.book && s.book.length !== n.book) return `Choose ${n.book} spellbook spells (${s.book.length} chosen).`;
    if (s.prepared.length !== n.prepared) return `Prepare ${n.prepared} spells (${s.prepared.length} chosen).`;
    return "";
  }

  // Drop picks that are no longer legal (too high level, removed from spellbook...).
  function cleanSpells(c) {
    const n = spellNeeds(c);
    if (!n) { c.spells = { cantrips: [], prepared: [], book: [] }; return; }
    const okNames = (kind) => new Set(classSpellOptions(n.d, kind).map((s) => s.name));
    const cOk = okNames("cantrips");
    c.spells.cantrips = c.spells.cantrips.filter((x) => cOk.has(x));
    if (n.book) { const bOk = okNames("book"); c.spells.book = c.spells.book.filter((x) => bOk.has(x)); }
    const pOk = okNames("prepared");
    c.spells.prepared = c.spells.prepared.filter((x) => pOk.has(x));
  }

  function spellPicker(c) {
    const n = spellNeeds(c);
    if (!n) return `<section class="card"><p>This class doesn't cast spells.</p></section>`;
    const tabs = [["cantrips", "Cantrips", n.cantrips, c.spells.cantrips.length]];
    if (n.book) tabs.push(["book", "Spellbook", n.book, c.spells.book.length]);
    tabs.push(["prepared", n.book ? "Prepared" : "Prepared spells", n.prepared, c.spells.prepared.length]);
    const visibleTabs = tabs.filter((t) => t[2] > 0);
    if (!visibleTabs.some((t) => t[0] === state.pickerTab)) state.pickerTab = visibleTabs[0][0];
    const kind = state.pickerTab;
    const need = { cantrips: n.cantrips, book: n.book, prepared: n.prepared }[kind];
    const opts = classSpellOptions(n.d, kind);
    const always = n.d.always.filter((a) => SPELL_BY_NAME.get(a.name));
    const extraNote = kind === "prepared" && always.length
      ? `<p class="small muted">Always prepared (free): ${esc(always.map((a) => a.name).join(", "))}</p>` : "";
    const bookNote = kind === "prepared" && n.book ? `<p class="small muted">Prepare from your spellbook. Pick spellbook spells first.</p>` : "";
    return `<section class="card">
        <h3>${esc(n.d.cls.name)} spells</h3>
        <p class="muted small">Highest spell level you can cast: ${n.d.maxSpellLevel ? ordinal(n.d.maxSpellLevel) : "—"}. Spell save DC ${n.d.spellDC}, attack ${signed(n.d.spellAtk)}.</p>
        <div class="seg">${visibleTabs.map(([id, label, max, have]) => `<button data-act="picker-tab" data-value="${id}" class="${kind === id ? "on" : ""}">${label} <small class="${have === max ? "ok" : ""}">${have}/${max}</small></button>`).join("")}</div>
        ${extraNote}${bookNote}
      </section>
      ${spellList(`class:${kind}`, opts, c.spells[kind], { act: "spell-pick", kind, need })}`;
  }

  // A searchable, expandable list of spells with select toggles.
  function spellList(listId, spells, selected, opt) {
    const sorted = spells.slice().sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    const full = selected.length >= opt.need;
    const items = sorted.map((s) => {
      const sel = selected.includes(s.name);
      const open = state.openSpells.has(listId + "::" + s.name);
      return `<li class="spell ${sel ? "sel" : ""}" data-name="${esc(s.name.toLowerCase())}">
        <button type="button" class="spell-check" data-act="${opt.act}" ${opt.key ? `data-key="${esc(opt.key)}"` : ""} ${opt.kind ? `data-kind="${opt.kind}"` : ""} data-need="${opt.need}" data-value="${esc(s.name)}" ${!sel && full && opt.need !== 1 ? "disabled" : ""} aria-pressed="${sel}">${sel ? "✓" : ""}</button>
        <details data-open-key="${esc(listId + "::" + s.name)}" ${open ? "open" : ""}>
          <summary><span class="spell-name">${esc(s.name)}</span><span class="spell-meta">${s.level ? ordinal(s.level) : "Cantrip"} · ${esc(s.school)}${s.conc ? " · C" : ""}${s.ritual ? " · R" : ""}</span></summary>
          ${spellBody(s)}
        </details>
      </li>`;
    }).join("");
    return `<section class="card list-card">
      <input type="search" class="search" placeholder="Search spells…" data-search="${esc(listId)}" value="${esc(state.search[listId] || "")}">
      <p class="small muted">${selected.length}/${opt.need} chosen${selected.length ? ": " + esc(selected.join(", ")) : ""}</p>
      <ul class="spell-list" data-list="${esc(listId)}">${items}</ul>
    </section>`;
  }

  function spellBody(s) {
    return `<div class="spell-body">
      <dl class="spell-dl">
        <dt>Cast</dt><dd>${esc(s.time)}</dd><dt>Range</dt><dd>${esc(s.range)}</dd>
        <dt>Comp.</dt><dd>${esc(s.components)}</dd><dt>Duration</dt><dd>${esc(s.duration)}</dd>
        <dt>Classes</dt><dd>${esc((s.classes || []).join(", "))}</dd>
      </dl>
      ${paras(s.text)}
    </div>`;
  }

  function applySearchFilters() {
    document.querySelectorAll("[data-search]").forEach((input) => filterList(input.dataset.search, input.value));
  }
  function filterList(listId, text) {
    const q = (text || "").trim().toLowerCase();
    const ul = document.querySelector(`[data-list="${CSS.escape(listId)}"]`);
    if (!ul) return;
    ul.querySelectorAll("li").forEach((li) => { li.hidden = q && !li.dataset.name.includes(q); });
  }

  // ----- Level up ----------------------------------------------------------------
  function startLevelUp(id) {
    const c = findChar(id);
    if (!c || c.level >= MAX_LEVEL) { state.draft = null; return; }
    state.draft = clone(c);
    state.draft.level = c.level + 1;
    state.draft._hpMode = null;
    state.pickerTab = "cantrips";
  }

  function levelUpProblem(c) {
    const open = choiceInstances(c, c.level).find((i) => !instDone(c, i));
    if (open) return `Finish: ${choiceLabel(open.def)}`;
    const sp = spellProblem(c);
    if (sp) return sp;
    if (c.hpRolls[c.level] == null) return "Choose how many hit points you gain.";
    return "";
  }

  function viewLevelUp(id) {
    const orig = findChar(id);
    if (!orig) return viewMissing();
    if (orig.level >= MAX_LEVEL) return `${header("Level Up", `#/c/${id}`)}<main class="wrap"><section class="card"><p>${esc(orig.name)} is already at the campaign's max level (${MAX_LEVEL}).</p></section></main>`;
    if (!state.draft || state.draft.id !== id) startLevelUp(id);
    const c = state.draft;
    const N = c.level;
    const d = derive(c);
    const before = derive(orig);

    // What's new at this level.
    const gains = [];
    (d.cls.levels[N] ? d.cls.levels[N].features : []).forEach((f) => gains.push({ ...f, source: d.cls.name }));
    if (d.sub && d.sub.levels[N]) d.sub.levels[N].features.forEach((f) => gains.push({ ...f, source: d.sub.name }));
    if (d.sp) d.sp.traits.filter((t) => t.minLevel === N).forEach((t) => gains.push({ ...t, source: d.sp.name }));
    const newAlways = d.always.filter((a) => !before.always.some((b) => b.name === a.name));
    const slotChange = JSON.stringify(d.slots) !== JSON.stringify(before.slots);

    const conMod = d.mods.con;
    const avg = Math.floor(d.hitDie / 2) + 1;
    const roll = c.hpRolls[N];
    const hpSection = `<section class="card">
        <h3>Hit points</h3>
        <p class="muted small">Gain 1d${d.hitDie} ${signed(conMod)} (CON)${d.sp && d.sp.hpPerLevel ? " +1 (Dwarf)" : ""}${d.sub && d.sub.hpFromLevel3 ? " + Draconic Resilience" : ""}.</p>
        <div class="row gap wrap-row">
          <button class="btn ${c._hpMode === "avg" ? "btn-primary" : "btn-ghost"}" data-act="hp-avg">Take average (${avg})</button>
          <button class="btn ${c._hpMode === "roll" ? "btn-primary" : "btn-ghost"}" data-act="hp-roll">Roll d${d.hitDie}</button>
          <label class="field inline"><span>or I rolled</span><input type="number" min="1" max="${d.hitDie}" inputmode="numeric" data-bind="hproll" value="${c._hpMode === "manual" && roll != null ? roll : ""}"></label>
        </div>
        ${roll != null ? `<p class="big mt">Die: <b>${roll}</b> → max HP ${before.hpMax} → <b>${d.hpMax}</b></p>` : ""}
      </section>`;

    const problem = levelUpProblem(c);
    return `${header(`Level ${N}`, `#/c/${id}`)}
      <main class="wrap">
        <section class="hero"><p class="kicker">${esc(orig.name)} grows stronger</p><h2>Level ${orig.level} → ${N}</h2>
          ${d.pb !== before.pb ? `<p class="gain">Proficiency Bonus ${signed(before.pb)} → <b>${signed(d.pb)}</b></p>` : ""}
          ${slotChange ? `<p class="gain">Spell slots: ${esc(slotText(d))}</p>` : ""}
        </section>
        <section class="card">
          <h3>What you gain</h3>
          ${gains.map((f) => `<div class="feature"><h4>${esc(f.name)} <small>${esc(f.source)}</small></h4>${paras(f.text.replace(/\{breath\}/g, scaled({ 1: "1d10", 5: "2d10" }, N)))}</div>`).join("") || "<p>No new features — but your stats still improve.</p>"}
          ${newAlways.length ? `<div class="feature"><h4>New always-prepared spells</h4><p>${esc(newAlways.map((a) => a.name).join(", "))}</p></div>` : ""}
        </section>
        ${stepChoices(c, N)}
        ${d.casting ? `<h3 class="section-title">Spells</h3>${spellPicker(c)}` : ""}
        ${hpSection}
        <div class="sticky-actions">
          <a class="btn btn-ghost" href="#/c/${id}">Cancel</a>
          <button class="btn btn-primary" data-act="levelup-save" ${problem ? "disabled" : ""}>Become level ${N}</button>
        </div>
        ${problem ? `<p class="hint center">${esc(problem)}</p>` : ""}
      </main>`;
  }

  function slotText(d) {
    if (!d.slots.length) return "none";
    if (d.slots[0].pact) return `${d.slots[0].max} × ${ordinal(d.slots[0].level)}-level (Pact, back on short rest)`;
    return d.slots.map((s) => `${s.max}× ${ordinal(s.level)}`).join(", ");
  }

  // ----- Spell editing (outside level up) -------------------------------------
  function startSpellEdit(id) {
    const c = findChar(id);
    state.draft = c ? clone(c) : null;
  }

  function viewSpellEdit(id) {
    const orig = findChar(id);
    if (!orig) return viewMissing();
    if (!state.draft || state.draft.id !== id) startSpellEdit(id);
    const c = state.draft;
    const problem = spellProblem(c);
    return `${header("Change spells", `#/c/${id}`)}
      <main class="wrap">
        <p class="muted small">Rules reminder: Clerics, Druids and Wizards can change prepared spells after any Long Rest. Paladins and Rangers swap one after a Long Rest. Bards, Sorcerers and Warlocks swap one when they level up.</p>
        ${spellPicker(c)}
        <div class="sticky-actions">
          <a class="btn btn-ghost" href="#/c/${id}">Cancel</a>
          <button class="btn btn-primary" data-act="spells-save" ${problem ? "disabled" : ""}>Save spells</button>
        </div>
        ${problem ? `<p class="hint center">${esc(problem)}</p>` : ""}
      </main>`;
  }

  // ----- Character sheet ---------------------------------------------------------
  function viewMissing() {
    return `${header("Not found", "#/")}<main class="wrap"><section class="card"><p>That character doesn't exist on this device.</p><a class="btn btn-primary" href="#/">Back</a></section></main>`;
  }

  function abilityGrid(d) {
    return `<div class="abilities">${ABILITIES.map((a) => `<div class="ability">
        <span class="ab-name">${a.id.toUpperCase()}</span>
        <b class="ab-mod">${signed(d.mods[a.id])}</b>
        <span class="ab-score">${d.scores[a.id]}</span>
        <span class="ab-save ${d.saveProf.has(a.id) ? "prof" : ""}">save ${signed(d.saveMod(a.id))}</span>
      </div>`).join("")}</div>`;
  }

  const SHEET_TABS = [["main", "Main"], ["skills", "Skills"], ["features", "Features"], ["spells", "Spells"], ["gear", "Gear"], ["notes", "Notes"]];

  function viewSheet(id) {
    const c = findChar(id);
    if (!c) return viewMissing();
    const d = derive(c);
    let body = "";
    if (state.tab === "main") body = tabMain(c, d);
    if (state.tab === "skills") body = tabSkills(c, d);
    if (state.tab === "features") body = tabFeatures(c, d);
    if (state.tab === "spells") body = tabSpells(c, d);
    if (state.tab === "gear") body = tabGear(c, d);
    if (state.tab === "notes") body = tabNotes(c, d);
    const incomplete = d.insts.some((i) => !instDone(c, i)) || (d.casting && spellProblem(c));
    return `${header(c.name || "Hunter", "#/")}
      <main class="wrap sheet">
        <section class="sheet-head">
          <div>
            <p class="kicker">Level ${c.level} · ${esc(d.sp ? d.sp.name : "")} ${esc(d.cls ? d.cls.name : "")}</p>
            <p class="muted small">${d.sub ? esc(d.sub.name) + " · " : ""}${esc(d.bg ? d.bg.name : "")}</p>
          </div>
          ${c.level < MAX_LEVEL ? `<a class="btn btn-primary" href="#/c/${c.id}/levelup">Level up</a>` : `<span class="pill ok">Max level</span>`}
        </section>
        ${incomplete ? `<p class="hint">Something is unfinished (a choice or spell count). Check the Features and Spells tabs.</p>` : ""}
        ${body}
      </main>
      <nav class="tabbar">${SHEET_TABS.map(([t, label]) => `<button data-act="tab" data-value="${t}" class="${state.tab === t ? "on" : ""}">${label}</button>`).join("")}</nav>`;
  }

  // Main tab: HP, defenses, abilities, resources, attacks.
  function tabMain(c, d) {
    const hp = c.hp;
    const pct = Math.max(0, Math.min(100, (hp.current / d.hpMax) * 100));
    const bloodied = hp.current > 0 && hp.current <= d.hpMax / 2;
    const tracks = (d.cls.tracks || []).map((t) => `<div class="stat"><span>${esc(t.label)}</span><b>${esc(t.values[c.level - 1])}</b></div>`).join("");
    const attacks = attacksFor(c, d);
    return `<section class="card hp-card ${bloodied ? "bloodied" : ""} ${hp.current <= 0 ? "down" : ""}">
        <div class="hp-top">
          <div><span class="label">Hit Points</span><div class="hp-num"><b>${hp.current}</b> / ${d.hpMax}${hp.temp ? ` <span class="temp">+${hp.temp} temp</span>` : ""}</div></div>
          ${bloodied ? `<span class="pill blood">Bloodied</span>` : hp.current <= 0 ? `<span class="pill blood">Down</span>` : ""}
        </div>
        <div class="hp-bar"><span style="width:${pct}%"></span></div>
        <div class="hp-controls">
          <input type="number" inputmode="numeric" min="0" placeholder="Amount" id="hp-amount">
          <button class="btn btn-danger" data-act="hp-damage">Damage</button>
          <button class="btn btn-heal" data-act="hp-heal">Heal</button>
          <button class="btn btn-ghost" data-act="hp-temp">Temp</button>
        </div>
      </section>
      <div class="stat-row">
        <div class="stat"><span>AC</span><b>${d.ac}</b></div>
        <div class="stat"><span>Initiative</span><b>${signed(d.initiative)}</b></div>
        <div class="stat"><span>Speed</span><b>${d.speed}</b></div>
        <div class="stat"><span>Prof.</span><b>${signed(d.pb)}</b></div>
      </div>
      ${abilityGrid(d)}
      <div class="stat-row">
        <div class="stat"><span>Passive Perception</span><b>${d.passivePerception}</b></div>
        <div class="stat"><span>Hunter's DC</span><b>${d.hunterDC}</b></div>
        ${d.casting ? `<div class="stat"><span>Spell DC</span><b>${d.spellDC}</b></div>` : ""}
        ${tracks}
      </div>
      <section class="card">
        <div class="choice-head"><h3>Resources</h3>
          <div class="row gap"><button class="btn btn-ghost btn-sm" data-act="short-rest">Short rest</button><button class="btn btn-ghost btn-sm" data-act="long-rest">Long rest</button></div>
        </div>
        ${d.resources.map((r) => resourceRow(c, r)).join("")}
        ${d.slots.length ? slotRows(c, d) : ""}
      </section>
      <section class="card">
        <h3>Attacks</h3>
        ${attacks.map((a) => `<div class="attack">
            <div><b>${esc(a.name)}</b>${a.source ? ` <small class="muted">${esc(a.source)}</small>` : ""}${!a.prof ? ` <small class="warn">not proficient</small>` : ""}
              <div class="small muted">${esc(a.props || "")}${a.mastery ? ` · Mastery: ${a.masteryKnown ? `<b class="ok">${esc(a.mastery)}</b>` : esc(a.mastery)}` : ""}</div></div>
            <div class="atk-nums"><b>${signed(a.toHit)}</b><span>${esc(a.damage)}</span></div>
          </div>`).join("")}
        <p class="small muted">Add weapons on the Gear tab. Mastery shown in gold if you can use it.</p>
      </section>`;
  }

  function resourceRow(c, r) {
    const used = c.used[r.key] || 0;
    const resetLabel = r.reset === "long" ? "long rest" : r.reset === "short1" ? "1 back on short rest" : r.reset === "never" ? "single use" : "short rest";
    if (r.pool || r.max > 10) {
      // Pools (Lay on Hands, Sorcery Points): type the amount left, or step with − / +.
      return `<div class="res"><div><b>${esc(r.name)}</b><small>${resetLabel}</small></div>
        <div class="pool"><button class="btn btn-ghost btn-sm" data-act="pool" data-key="${esc(r.key)}" data-delta="1" data-max="${r.max}" aria-label="Spend one">−</button>
        <input type="number" inputmode="numeric" min="0" max="${r.max}" value="${r.max - used}" data-bind="pool" data-key="${esc(r.key)}" data-max="${r.max}" aria-label="${esc(r.name)} remaining"><span>/ ${r.max}</span>
        <button class="btn btn-ghost btn-sm" data-act="pool" data-key="${esc(r.key)}" data-delta="-1" data-max="${r.max}" aria-label="Restore one">+</button></div></div>`;
    }
    let pips = "";
    for (let i = 0; i < r.max; i++) pips += `<button class="pip ${i < used ? "spent" : ""}" data-act="pip" data-key="${esc(r.key)}" data-index="${i}" data-max="${r.max}" aria-label="${esc(r.name)} ${i + 1}"></button>`;
    return `<div class="res"><div><b>${esc(r.name)}</b><small>${resetLabel}</small></div><div class="pips">${pips}</div></div>`;
  }

  function slotRows(c, d) {
    return d.slots.map((s) => {
      const key = s.pact ? "pact" : String(s.level);
      const used = (c.slotsUsed || {})[key] || 0;
      let pips = "";
      for (let i = 0; i < s.max; i++) pips += `<button class="pip slot ${i < used ? "spent" : ""}" data-act="slot" data-key="${key}" data-index="${i}" data-max="${s.max}" aria-label="slot ${i + 1}"></button>`;
      return `<div class="res"><div><b>${s.pact ? `Pact slots (${ordinal(s.level)})` : `${ordinal(s.level)}-level slots`}</b><small>${s.pact ? "short rest" : "long rest"}</small></div><div class="pips">${pips}</div></div>`;
    }).join("");
  }

  function tabSkills(c, d) {
    return `<section class="card">
        <h3>Skills</h3>
        <ul class="skills">${SKILLS.map((s) => `<li class="${d.expertise.has(s.name) ? "exp" : d.skillProf.has(s.name) ? "prof" : ""}">
            <span class="dot"></span><span>${esc(s.name)} <small>${s.ability.toUpperCase()}</small></span><b>${signed(d.skillMod(s.name))}</b></li>`).join("")}</ul>
        <p class="small muted">● proficient · ◆ expertise${c.classId === "bard" && c.level >= 2 ? " · Jack of All Trades included" : ""}</p>
      </section>
      <section class="card">
        <h3>Saving throws</h3>
        <ul class="skills">${ABILITIES.map((a) => `<li class="${d.saveProf.has(a.id) ? "prof" : ""}"><span class="dot"></span><span>${a.name}</span><b>${signed(d.saveMod(a.id))}</b></li>`).join("")}</ul>
      </section>
      <section class="card">
        <h3>Proficiencies</h3>
        <p class="small"><b>Armor:</b> ${esc([...d.armorTraining].map((t) => t[0].toUpperCase() + t.slice(1)).join(", ") || "None")}</p>
        <p class="small"><b>Weapons:</b> ${esc(d.martial === "all" ? "Simple and Martial weapons" : d.cls.weapons)}</p>
        ${d.bg ? `<p class="small"><b>Tool:</b> ${esc(d.bg.tool)}</p>` : ""}
        ${d.sp && d.sp.darkvision ? `<p class="small"><b>Darkvision:</b> ${d.pick("lineage")[0] === "Drow" ? 120 : d.sp.darkvision} ft</p>` : ""}
      </section>`;
  }

  // Features tab: everything gained, grouped by level, with the choices made.
  function tabFeatures(c, d) {
    const blocks = [];
    // Origin block.
    const spChoices = d.insts.filter((i) => i.key.startsWith("1|sp|") || i.key.startsWith("1|bg|"));
    const breath = scaled({ 1: "1d10", 5: "2d10" }, c.level);
    blocks.push(`<section class="card">
        <h3>Origin</h3>
        ${d.sp ? d.sp.traits.filter((t) => !t.minLevel || c.level >= t.minLevel).map((t) => `<div class="feature"><h4>${esc(t.name)} <small>${esc(d.sp.name)}</small></h4>${paras(t.text.replace(/\{breath\}/g, breath))}</div>`).join("") : ""}
        ${d.bg ? `<div class="feature"><h4>${esc(d.bg.name)} <small>Background</small></h4><p>Skills: ${esc(d.bg.skills.join(", "))}. Tool: ${esc(d.bg.tool)}.</p><p class="small muted">${esc(d.bg.equipment)}</p></div>` : ""}
        ${d.feats.map((f) => `<div class="feature"><h4>${esc(f.name)} <small>Feat</small></h4>${paras(f.text)}</div>`).join("")}
        ${choiceSummary(c, spChoices)}
      </section>`);
    for (let L = 1; L <= c.level; L++) {
      const feats = [];
      if (d.cls && d.cls.levels[L]) d.cls.levels[L].features.forEach((f) => feats.push({ ...f, source: d.cls.name }));
      if (d.sub && d.sub.levels[L]) d.sub.levels[L].features.forEach((f) => feats.push({ ...f, source: d.sub.name }));
      const choices = d.insts.filter((i) => i.level === L && !i.key.startsWith("1|sp|") && !i.key.startsWith("1|bg|"));
      blocks.push(`<section class="card">
          <h3>Level ${L}</h3>
          ${feats.map((f) => `<div class="feature"><h4>${esc(f.name)} <small>${esc(f.source)}</small></h4>${paras(f.text)}</div>`).join("")}
          ${choiceSummary(c, choices)}
        </section>`);
    }
    return blocks.join("") + `<p class="center small"><button class="btn btn-ghost btn-sm" data-act="level-down">Undo last level</button></p>`;
  }

  function choiceSummary(c, insts) {
    if (!insts.length) return "";
    return `<div class="choices-made">${insts.map((i) => {
      const vals = c.choices[i.key] || [];
      const detail = i.def.type === "pick" ? vals.map((v) => {
        const o = choiceOptions(i.def).find((x) => x.name === v);
        return `<li><b>${esc(v)}</b>${o && o.text ? ` — ${esc(o.text)}` : ""}</li>`;
      }).join("") : `<li>${esc(vals.map((v) => valueLabel(i.def, v)).join(", ") || "— not chosen —")}</li>`;
      return `<div class="made"><span class="label">${esc(choiceLabel(i.def))}</span><ul>${detail}</ul></div>`;
    }).join("")}</div>`;
  }

  // Spells tab: relic spells, slots, class spells, bonus spells.
  function tabSpells(c, d) {
    const relics = c.gear.filter((g) => g.kind === "reward").map((g) => byId(REWARDS, g.ref)).filter((r) => r && r.type === "spell");
    const relicHtml = relics.length ? `<section class="card relic">
        <h3>Relic spells <small>no slots needed · Hunter's DC ${d.hunterDC}</small></h3>
        ${relics.map((r) => rewardBlock(c, d, r)).join("")}
      </section>` : "";
    if (!d.casting && !d.always.length) {
      return relicHtml + `<section class="card"><p>${esc(d.cls.name)}s don't cast spells${relics.length ? "" : " — but quest rewards can grant relic spells anyone can use"}.</p></section>`;
    }
    const groups = {};
    const addTo = (name, tag) => {
      const s = SPELL_BY_NAME.get(name);
      if (!s) return;
      (groups[s.level] = groups[s.level] || []).push({ s, tag });
    };
    if (d.casting) {
      c.spells.cantrips.forEach((n) => addTo(n, ""));
      c.spells.prepared.forEach((n) => addTo(n, "prepared"));
    }
    d.always.forEach((a) => addTo(a.name, `${a.source}${a.note ? " · " + a.note : ""}`));
    const levels = Object.keys(groups).map(Number).sort((a, b) => a - b);
    const land = d.sub && d.sub.landSpells ? `<label class="field"><span>Circle land today</span>
        <select data-bind="land">${Object.keys(d.sub.landSpells).map((l) => `<option ${d.pick("land")[0] === l ? "selected" : ""}>${l}</option>`).join("")}</select></label>` : "";
    const unprepBook = d.casting && d.casting.spellbook ? d.book.filter((n) => !c.spells.prepared.includes(n)) : [];
    return `${relicHtml}
      ${d.casting ? `<section class="card">
        <div class="stat-row">
          <div class="stat"><span>Ability</span><b>${d.casting.ability.toUpperCase()}</b></div>
          <div class="stat"><span>Save DC</span><b>${d.spellDC}</b></div>
          <div class="stat"><span>Attack</span><b>${signed(d.spellAtk)}</b></div>
        </div>
        ${slotRows(c, d)}
        ${land}
        <a class="btn btn-ghost btn-block mt" href="#/c/${c.id}/spells">Change spells</a>
      </section>` : land}
      ${levels.map((L) => `<section class="card list-card">
          <h3>${L ? `${ordinal(L)} level` : "Cantrips"}</h3>
          <ul class="spell-list">${groups[L].sort((a, b) => a.s.name.localeCompare(b.s.name)).map(({ s, tag }) => {
            const freeKey = "free:" + s.name;
            const free = /free cast/.test(tag);
            const okey = "sheet::" + s.name;
            return `<li class="spell">
              ${free ? `<button class="pip ${c.used[freeKey] ? "spent" : ""}" data-act="pip" data-key="${esc(freeKey)}" data-index="0" data-max="1" title="Free cast used"></button>` : ""}
              <details data-open-key="${esc(okey)}" ${state.openSpells.has(okey) ? "open" : ""}>
                <summary><span class="spell-name">${esc(s.name)}</span><span class="spell-meta">${s.conc ? "C · " : ""}${s.ritual ? "R · " : ""}${esc(s.time)}${tag ? ` · ${esc(tag)}` : ""}</span></summary>
                ${spellBody(s)}
              </details></li>`;
          }).join("")}</ul>
        </section>`).join("")}
      ${unprepBook.length ? `<section class="card"><h3>In spellbook, not prepared</h3><p class="small">${esc(unprepBook.join(", "))}</p></section>` : ""}`;
  }

  function rewardBlock(c, d, r) {
    const max = rewardUsesMax(r, d);
    const key = "reward:" + r.id;
    const used = c.used[key] || 0;
    let pips = "";
    for (let i = 0; i < max; i++) pips += `<button class="pip ${i < used ? "spent" : ""}" data-act="pip" data-key="${key}" data-index="${i}" data-max="${max}"></button>`;
    const reset = r.uses ? { long: "long rest", short: "short rest", never: "single use" }[r.uses.reset] : "";
    return `<div class="reward">
        <div class="reward-head"><div><b>${esc(r.name)}</b><small>${esc(r.rarity || "")}${r.quest ? ` · ${esc(questTitle(r.quest))}` : ""}</small></div>
        ${max ? `<div class="pips" title="${esc(reset)}">${pips}</div>` : ""}</div>
        ${r.base ? `<p class="small muted">${esc(r.base)}${r.bonus ? ` +${r.bonus}` : ""}</p>` : ""}
        ${paras(fillRewardText(r, d))}
        ${max ? `<p class="small muted">Uses: ${max} per ${esc(reset)}</p>` : ""}
      </div>`;
  }

  function questTitle(n) {
    const q = (CAMP.quests || []).find((x) => x.n === n);
    return q ? q.title : `Quest ${n}`;
  }

  // Gear tab: claim rewards, inventory, add gear.
  function tabGear(c, d) {
    const pending = state.pendingReward;
    const rewardsOwned = c.gear.filter((g) => g.kind === "reward").map((g) => ({ g, r: byId(REWARDS, g.ref) })).filter((x) => x.r);
    const others = c.gear.filter((g) => g.kind !== "reward");
    const armorWarn = (g) => {
      const a = SRD.armor.find((x) => x.name === g.ref);
      if (!a) return "";
      const notes = [];
      if (!d.armorTraining.has(a.type)) notes.push("no training — disadvantage & can't cast");
      if (a.str && d.scores.str < a.str) notes.push(`needs STR ${a.str} or -10 speed`);
      if (a.stealthDis) notes.push("stealth disadvantage");
      return notes.length ? `<small class="warn">${esc(notes.join(" · "))}</small>` : "";
    };
    return `<section class="card claim">
        <h3>Claim a quest reward</h3>
        <p class="small muted">Your DM gives you a code when you earn something.</p>
        <div class="row gap"><input type="text" id="reward-code" placeholder="CODE" autocapitalize="characters" autocomplete="off" spellcheck="false"><button class="btn btn-primary" data-act="claim">Claim</button></div>
        ${pending ? `<div class="reward pending mt">${rewardBlock(c, d, pending)}<div class="row gap"><button class="btn btn-primary" data-act="claim-confirm">Add to ${esc(c.name)}</button><button class="btn btn-ghost" data-act="claim-cancel">Not now</button></div></div>` : ""}
      </section>
      ${rewardsOwned.length ? `<section class="card relic"><h3>Quest rewards</h3>${rewardsOwned.map(({ g, r }) => `${rewardBlock(c, d, r)}
          <div class="row gap gear-actions">
            ${r.type !== "spell" ? `<button class="btn btn-ghost btn-sm ${g.equipped ? "on" : ""}" data-act="equip" data-uid="${g.uid}">${g.equipped ? "Equipped" : "Equip"}</button>` : ""}
            <button class="btn btn-ghost btn-sm" data-act="gear-remove" data-uid="${g.uid}">Remove</button>
          </div>`).join("<hr>")}</section>` : ""}
      <section class="card">
        <h3>Inventory</h3>
        ${others.length ? `<ul class="gear">${others.map((g) => `<li>
            <div class="gear-main"><b>${esc(g.name)}</b>${g.kind === "armor" ? armorWarn(g) : ""}${g.text ? `<small class="muted">${esc(g.text)}</small>` : ""}</div>
            <div class="gear-ctl">
              ${g.kind === "armor" || g.kind === "shield" ? `<button class="btn btn-ghost btn-sm ${g.equipped ? "on" : ""}" data-act="equip" data-uid="${g.uid}">${g.equipped ? "Worn" : "Wear"}</button>` : ""}
              ${g.kind === "item" || g.kind === "custom" ? `<button class="btn btn-ghost btn-sm" data-act="qty" data-uid="${g.uid}" data-delta="-1">−</button><span class="qty">${g.qty || 1}</span><button class="btn btn-ghost btn-sm" data-act="qty" data-uid="${g.uid}" data-delta="1">+</button>` : ""}
              <button class="btn btn-ghost btn-sm" data-act="gear-remove" data-uid="${g.uid}" aria-label="Remove">✕</button>
            </div></li>`).join("")}</ul>` : `<p class="muted">Nothing yet. Add your starting gear below (see your class and background on the Features tab).</p>`}
        <div class="add-gear">
          <select id="gear-select">
            <option value="">Add gear…</option>
            <optgroup label="Hunter's gear">${GEAR.map((g, i) => `<option value="item:${i}">${esc(g.name)} (${esc(g.cost)})</option>`).join("")}</optgroup>
            <optgroup label="Weapons">${SRD.weapons.map((w) => `<option value="weapon:${esc(w.name)}">${esc(w.name)} — ${esc(w.damage)}</option>`).join("")}</optgroup>
            <optgroup label="Armor">${SRD.armor.map((a) => `<option value="armor:${esc(a.name)}">${esc(a.name)} (AC ${a.base}${a.dexCap ? " + Dex" + (a.dexCap < 10 ? " max 2" : "") : ""})</option>`).join("")}<option value="shield:Shield">Shield (+2 AC)</option></optgroup>
          </select>
          <button class="btn btn-ghost" data-act="gear-add">Add</button>
        </div>
        <div class="add-gear">
          <input type="text" id="custom-gear" placeholder="Custom item (e.g. Grandmother's locket)">
          <button class="btn btn-ghost" data-act="gear-custom">Add</button>
        </div>
      </section>
      <section class="card">
        <label class="field"><span>Misc. AC bonus (rings, cloaks, DM fiat)</span><input type="number" inputmode="numeric" data-bind="acBonus" value="${Number(c.acBonus) || 0}"></label>
        <label class="field"><span>Coins</span><input type="text" data-bind="coins" value="${esc(c.coins || "")}" placeholder="e.g. 15 GP, 4 SP"></label>
      </section>`;
  }

  function tabNotes(c) {
    return `<section class="card">
        <label class="field"><span>Notes</span><textarea rows="12" data-bind="notes" placeholder="Allies, clues, names of the dead…">${esc(c.notes || "")}</textarea></label>
        <p class="small muted">Saved automatically.</p>
      </section>
      <section class="card">
        <h3>Character</h3>
        <label class="field"><span>Name</span><input type="text" data-bind="name" value="${esc(c.name)}"></label>
        <div class="row gap wrap-row mt">
          <button class="btn btn-ghost" data-act="export-one">Back up this hunter</button>
          <button class="btn btn-danger" data-act="delete">Delete hunter</button>
        </div>
      </section>`;
  }

  function viewAbout() {
    return `${header("About", "#/")}
      <main class="wrap">
        <section class="card">
          <h3>${esc(CAMP.title || "Hunter's Codex")}</h3>
          <p>A pocket character sheet for our vampire hunt. Build your hunter, level up after each session, and claim quest rewards with the codes your DM hands out.</p>
          <p><b>Install it:</b> on iPhone tap Share → <i>Add to Home Screen</i>. On Android tap the menu → <i>Install app</i>. It then works offline.</p>
          <p><b>Your data</b> lives only on this device. Use <i>Back up</i> on the home screen now and then.</p>
          <p class="small muted">This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noopener">dndbeyond.com/srd</a>. The SRD 5.2.1 is licensed under the <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener">Creative Commons Attribution 4.0 International License</a>. Compatible with fifth edition.</p>
        </section>
      </main>`;
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  function currentChar() {
    const r = route();
    return r.name === "c" ? findChar(r.id) : null;
  }

  // The character being edited right now: a draft (create/level-up/spells) or a saved one.
  function target() {
    const r = route();
    if (r.name === "new" || (r.name === "c" && (r.sub === "levelup" || r.sub === "spells"))) return state.draft;
    return currentChar();
  }

  // Save (unless it's an unsaved draft) and redraw.
  function commit(c) {
    if (c && c !== state.draft) saveCharacters();
    render();
  }

  // Toggle a value in a choice. Single-pick choices replace; multi-pick add/remove.
  function toggleChoice(c, key, value, need) {
    const vals = c.choices[key] || [];
    if (vals.includes(value)) c.choices[key] = vals.filter((v) => v !== value);
    else if (need === 1) c.choices[key] = [value];
    else if (vals.length < need) c.choices[key] = vals.concat(value);
    pruneChoices(c);
    if (key === "3|cls|subclass") pruneChoices(c);
    if (c.classId) cleanSpells(c);
  }

  function toggleSpell(c, kind, name, need) {
    const list = c.spells[kind];
    const i = list.indexOf(name);
    if (i >= 0) list.splice(i, 1);
    else if (list.length < need) list.push(name);
    if (kind === "book") cleanSpells(c); // un-prepare spells removed from the book
  }

  const actions = {
    "step-next"() {
      const steps = createSteps();
      if (stepProblem(steps[state.step].id, state.draft)) return;
      state.step = Math.min(state.step + 1, steps.length - 1);
      window.scrollTo(0, 0);
      render();
    },
    "step-back"() { state.step = Math.max(0, state.step - 1); window.scrollTo(0, 0); render(); },
    "pick-species"(el) {
      const c = state.draft;
      if (c.speciesId !== el.dataset.value) {
        c.speciesId = el.dataset.value;
        Object.keys(c.choices).filter((k) => k.startsWith("1|sp|")).forEach((k) => delete c.choices[k]);
      }
      render();
    },
    "pick-class"(el) {
      const c = state.draft;
      if (c.classId !== el.dataset.value) {
        c.classId = el.dataset.value;
        Object.keys(c.choices).filter((k) => !k.startsWith("1|sp|") && !k.startsWith("1|bg|")).forEach((k) => delete c.choices[k]);
        c.spells = { cantrips: [], prepared: [], book: [] };
      }
      render();
    },
    "pick-bg"(el) {
      const c = state.draft;
      if (c.backgroundId !== el.dataset.value) {
        c.backgroundId = el.dataset.value;
        c.bgAsi = { mode: c.bgAsi.mode, plus2: null, plus1: null };
        Object.keys(c.choices).filter((k) => k.startsWith("1|bg|")).forEach((k) => delete c.choices[k]);
        pruneChoices(c);
      }
      render();
    },
    "bgasi-mode"(el) { state.draft.bgAsi.mode = el.dataset.value; render(); },
    "suggest-scores"() {
      const c = state.draft;
      const order = SUGGESTED_ORDER[c.classId] || ABILITY_IDS;
      order.forEach((a, i) => { c.base[a] = SRD.standardArray[i]; });
      render();
    },
    "clear-scores"() { ABILITY_IDS.forEach((a) => { state.draft.base[a] = null; }); render(); },
    choose(el) {
      const c = target();
      toggleChoice(c, el.dataset.key, el.dataset.value, Number(el.dataset.need));
      commit(c);
    },
    "picker-tab"(el) { state.pickerTab = el.dataset.value; render(); },
    "spell-pick"(el) {
      const c = target();
      toggleSpell(c, el.dataset.kind, el.dataset.value, Number(el.dataset.need));
      render();
    },
    create() {
      const c = state.draft;
      if (createSteps().some((s) => stepProblem(s.id, c))) return;
      const d = derive(c);
      c.hpRolls = { 1: d.hitDie };
      c.hp = { current: d.hpMax, temp: 0 };
      state.chars.push(c);
      state.draft = null;
      saveCharacters();
      state.tab = "gear";
      toast(`${c.name} joins the hunt. Add starting gear.`);
      go(`#/c/${c.id}`);
    },
    "hp-avg"() { const c = state.draft; c.hpRolls[c.level] = Math.floor(derive(c).hitDie / 2) + 1; c._hpMode = "avg"; render(); },
    "hp-roll"() { const c = state.draft; const hd = derive(c).hitDie; c.hpRolls[c.level] = 1 + Math.floor(Math.random() * hd); c._hpMode = "roll"; render(); },
    "levelup-save"() {
      const c = state.draft;
      if (levelUpProblem(c)) return;
      const orig = findChar(c.id);
      const gained = derive(c).hpMax - derive(orig).hpMax;
      delete c._hpMode;
      c.hp.current = Math.max(0, c.hp.current + gained);
      const i = state.chars.findIndex((x) => x.id === c.id);
      state.chars[i] = c;
      state.draft = null;
      saveCharacters();
      state.tab = "main";
      toast(`Level ${c.level}! +${gained} max HP.`);
      go(`#/c/${c.id}`);
    },
    "spells-save"() {
      const c = state.draft;
      if (spellProblem(c)) return;
      const i = state.chars.findIndex((x) => x.id === c.id);
      state.chars[i] = c;
      state.draft = null;
      saveCharacters();
      state.tab = "spells";
      go(`#/c/${c.id}`);
    },
    tab(el) { state.tab = el.dataset.value; window.scrollTo(0, 0); render(); },
    "hp-damage"() { hpChange("damage"); },
    "hp-heal"() { hpChange("heal"); },
    "hp-temp"() { hpChange("temp"); },
    pip(el) {
      const c = currentChar();
      const idx = Number(el.dataset.index);
      const used = c.used[el.dataset.key] || 0;
      // Tapping a spent pip refunds down to it; tapping a fresh pip spends up to it.
      c.used[el.dataset.key] = idx < used ? idx : idx + 1;
      commit(c);
    },
    pool(el) {
      const c = currentChar();
      const used = c.used[el.dataset.key] || 0;
      const max = Number(el.dataset.max);
      c.used[el.dataset.key] = Math.max(0, Math.min(max, used + Number(el.dataset.delta)));
      commit(c);
    },
    slot(el) {
      const c = currentChar();
      c.slotsUsed = c.slotsUsed || {};
      const idx = Number(el.dataset.index);
      const used = c.slotsUsed[el.dataset.key] || 0;
      c.slotsUsed[el.dataset.key] = idx < used ? idx : idx + 1;
      commit(c);
    },
    "short-rest"() { rest("short"); },
    "long-rest"() { rest("long"); },
    claim() {
      const c = currentChar();
      const input = document.getElementById("reward-code");
      const code = (input.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!code) return;
      const r = REWARDS.find((x) => String(x.code).toUpperCase().replace(/[^A-Z0-9]/g, "") === code);
      if (!r) { toast("No reward matches that code."); return; }
      if (c.gear.some((g) => g.kind === "reward" && g.ref === r.id)) { toast(`${c.name} already has ${r.name}.`); return; }
      state.pendingReward = r;
      render();
    },
    "claim-confirm"() {
      const c = currentChar();
      const r = state.pendingReward;
      if (!r) return;
      c.gear.push({ uid: uid(), kind: "reward", ref: r.id, name: r.name, equipped: r.type !== "spell" });
      state.pendingReward = null;
      toast(`${r.name} claimed!`);
      commit(c);
    },
    "claim-cancel"() { state.pendingReward = null; render(); },
    "gear-add"() {
      const c = currentChar();
      const v = document.getElementById("gear-select").value;
      if (!v) return;
      const [kind, ref] = [v.slice(0, v.indexOf(":")), v.slice(v.indexOf(":") + 1)];
      if (kind === "item") {
        const g = GEAR[Number(ref)];
        const existing = c.gear.find((x) => x.kind === "item" && x.name === g.name);
        if (existing) existing.qty = (existing.qty || 1) + 1;
        else c.gear.push({ uid: uid(), kind: "item", ref: g.name, name: g.name, text: g.text, qty: 1 });
      } else {
        c.gear.push({ uid: uid(), kind, ref, name: ref, equipped: false });
      }
      commit(c);
    },
    "gear-custom"() {
      const c = currentChar();
      const input = document.getElementById("custom-gear");
      const name = input.value.trim();
      if (!name) return;
      c.gear.push({ uid: uid(), kind: "custom", ref: name, name, qty: 1 });
      commit(c);
    },
    "gear-remove"(el) {
      const c = currentChar();
      const g = c.gear.find((x) => x.uid === el.dataset.uid);
      if (!g || !confirm(`Remove ${g.name}?`)) return;
      c.gear = c.gear.filter((x) => x.uid !== el.dataset.uid);
      commit(c);
    },
    equip(el) {
      const c = currentChar();
      const g = c.gear.find((x) => x.uid === el.dataset.uid);
      if (!g) return;
      const turningOn = !g.equipped;
      // Only one suit of armor and one shield at a time.
      if (turningOn && g.kind === "armor") c.gear.forEach((x) => { if (x.kind === "armor") x.equipped = false; });
      const isShield = (x) => x.kind === "shield" || (x.kind === "reward" && (byId(REWARDS, x.ref) || {}).slot === "shield");
      if (turningOn && isShield(g)) c.gear.forEach((x) => { if (isShield(x)) x.equipped = false; });
      g.equipped = turningOn;
      commit(c);
    },
    qty(el) {
      const c = currentChar();
      const g = c.gear.find((x) => x.uid === el.dataset.uid);
      if (!g) return;
      g.qty = Math.max(0, (g.qty || 1) + Number(el.dataset.delta));
      commit(c);
    },
    "level-down"() {
      const c = currentChar();
      if (c.level <= 1) { toast("Already level 1."); return; }
      if (!confirm(`Undo level ${c.level}? Choices made at that level will be removed.`)) return;
      const L = c.level;
      Object.keys(c.choices).forEach((k) => { if (k.startsWith(L + "|")) delete c.choices[k]; });
      delete c.hpRolls[L];
      c.level = L - 1;
      pruneChoices(c);
      cleanSpells(c);
      // Trim spell lists to the lower counts.
      const n = spellNeeds(c);
      if (n) {
        c.spells.cantrips = c.spells.cantrips.slice(0, n.cantrips);
        c.spells.prepared = c.spells.prepared.slice(0, n.prepared);
        if (n.book) c.spells.book = c.spells.book.slice(0, n.book);
      }
      c.hp.current = Math.min(c.hp.current, derive(c).hpMax);
      commit(c);
    },
    delete() {
      const c = currentChar();
      if (!confirm(`Delete ${c.name} forever? This can't be undone.`)) return;
      state.chars = state.chars.filter((x) => x.id !== c.id);
      saveCharacters();
      go("#/");
    },
    "export-one"() { download(`${slug(currentChar().name)}.json`, { version: 1, characters: [currentChar()] }); },
    "export-all"() {
      if (!state.chars.length) { toast("Nothing to back up yet."); return; }
      download(`hunters-backup-${new Date().toISOString().slice(0, 10)}.json`, { version: 1, characters: state.chars });
    },
  };

  function hpChange(mode) {
    const c = currentChar();
    const input = document.getElementById("hp-amount");
    const n = Math.floor(Number(input.value));
    if (!n || n < 0) { input.focus(); return; }
    const max = derive(c).hpMax;
    if (mode === "damage") {
      const fromTemp = Math.min(c.hp.temp || 0, n);
      c.hp.temp = (c.hp.temp || 0) - fromTemp;
      c.hp.current = Math.max(0, c.hp.current - (n - fromTemp));
    } else if (mode === "heal") {
      c.hp.current = Math.min(max, c.hp.current + n);
    } else {
      c.hp.temp = Math.max(c.hp.temp || 0, n); // temp HP doesn't stack
    }
    commit(c);
  }

  function rest(kind) {
    const c = currentChar();
    const d = derive(c);
    if (kind === "long" && !confirm("Take a Long Rest? HP, spell slots and most abilities come back.")) return;
    d.resources.forEach((r) => {
      const used = c.used[r.key] || 0;
      if (kind === "long" && r.reset !== "never") c.used[r.key] = 0;
      if (kind === "short" && r.reset === "short") c.used[r.key] = 0;
      if (kind === "short" && r.reset === "short1") c.used[r.key] = Math.max(0, used - 1);
    });
    // Reward uses.
    c.gear.filter((g) => g.kind === "reward").forEach((g) => {
      const r = byId(REWARDS, g.ref);
      if (!r || !r.uses) return;
      const key = "reward:" + r.id;
      if (r.uses.reset === "long" && kind === "long") c.used[key] = 0;
      if (r.uses.reset === "short") c.used[key] = 0;
    });
    c.slotsUsed = c.slotsUsed || {};
    if (kind === "long") {
      c.slotsUsed = {};
      Object.keys(c.used).forEach((k) => { if (k.startsWith("free:")) delete c.used[k]; });
      c.hp.current = d.hpMax;
      c.hp.temp = 0;
      toast("Long rest taken. Fully restored.");
    } else {
      delete c.slotsUsed.pact;
      toast("Short rest taken. Spend Hit Dice to heal (roll and use Heal).");
    }
    commit(c);
  }

  // ---------------------------------------------------------------------------
  // Import / export
  // ---------------------------------------------------------------------------
  function slug(s) { return String(s || "hunter").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "hunter"; }

  function download(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const list = Array.isArray(data.characters) ? data.characters : [data];
        let added = 0, replaced = 0;
        list.forEach((c) => {
          if (!c || !c.id || !c.classId) return;
          const i = state.chars.findIndex((x) => x.id === c.id);
          if (i >= 0) { state.chars[i] = c; replaced++; } else { state.chars.push(c); added++; }
        });
        saveCharacters();
        toast(`Restored: ${added} new, ${replaced} updated.`);
        render();
      } catch (e) {
        toast("That file isn't a valid backup.");
      }
    };
    reader.readAsText(file);
  }

  // ---------------------------------------------------------------------------
  // Events (delegated)
  // ---------------------------------------------------------------------------
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || el.disabled) return;
    const act = el.dataset.act;
    if (act === "new") { state.draft = null; return; } // let the link navigate
    if (act === "import") return; // file input, handled on change
    if (actions[act]) { e.preventDefault(); actions[act](el); }
  });

  // Inputs bound to character fields.
  let saveTimer = null;
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.search != null) { state.search[el.dataset.search] = el.value; filterList(el.dataset.search, el.value); return; }
    const bind = el.dataset.bind;
    if (!bind) return;
    const c = target();
    if (!c) return;
    if (bind === "name" || bind === "notes" || bind === "coins") {
      c[bind] = el.value;
      if (!state.draft || state.draft !== c) { clearTimeout(saveTimer); saveTimer = setTimeout(saveCharacters, 400); }
      if (bind === "name" && route().name === "new") refreshCreateFooter();
    }
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.act === "import" && el.files && el.files[0]) { importFile(el.files[0]); el.value = ""; return; }
    const bind = el.dataset.bind;
    if (!bind) return;
    const c = target();
    if (!c) return;
    if (bind.startsWith("base.")) { c.base[bind.slice(5)] = el.value === "" ? null : Number(el.value); render(); }
    else if (bind.startsWith("bgAsi.")) { c.bgAsi[bind.slice(6)] = el.value || null; render(); }
    else if (bind === "hproll") {
      const hd = derive(c).hitDie;
      const v = Math.floor(Number(el.value));
      if (v >= 1 && v <= hd) { c.hpRolls[c.level] = v; c._hpMode = "manual"; } else { toast(`Enter 1–${hd}.`); }
      render();
    } else if (bind === "acBonus") { c.acBonus = Number(el.value) || 0; commit(c); }
    else if (bind === "pool") {
      const max = Number(el.dataset.max);
      const left = Math.max(0, Math.min(max, Math.floor(Number(el.value)) || 0));
      c.used[el.dataset.key] = max - left;
      commit(c);
    }
    else if (bind === "land") {
      const inst = derive(c).insts.find((i) => i.def.id === "land");
      if (inst) { c.choices[inst.key] = [el.value]; commit(c); }
    } else if (bind === "name" || bind === "notes" || bind === "coins") {
      if (!state.draft || state.draft !== c) saveCharacters();
      if (route().name !== "new") render();
    }
  });

  // Remember which spell cards are expanded across re-renders.
  document.addEventListener("toggle", (e) => {
    const key = e.target.dataset && e.target.dataset.openKey;
    if (!key) return;
    if (e.target.open) state.openSpells.add(key); else state.openSpells.delete(key);
  }, true);

  // Re-render only the footer of the creation wizard while typing the name (keeps focus).
  function refreshCreateFooter() {
    const steps = createSteps();
    const problem = stepProblem(steps[state.step].id, state.draft);
    const btn = document.querySelector('[data-act="step-next"]');
    if (btn) btn.disabled = !!problem;
    const hint = document.querySelector("main .hint.center");
    if (hint) hint.textContent = problem;
    else if (problem && btn) btn.closest(".sticky-actions").insertAdjacentHTML("afterend", `<p class="hint center">${esc(problem)}</p>`);
  }

  // ---------------------------------------------------------------------------
  // Toasts
  // ---------------------------------------------------------------------------
  let toastTimer = null;
  function toast(msg) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
  }

  // ---------------------------------------------------------------------------
  // Service worker (offline support) — only when served over http(s).
  // ---------------------------------------------------------------------------
  if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW failed", e));
    });
  }

  // Go.
  const startRoute = route();
  if (startRoute.name === "c" && startRoute.sub === "levelup") startLevelUp(startRoute.id);
  if (startRoute.name === "c" && startRoute.sub === "spells") startSpellEdit(startRoute.id);
  render();

  // Expose a few things for debugging in the console.
  window.HC = { state, derive, choiceInstances };
})();

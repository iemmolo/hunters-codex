// =============================================================================
// SRD RULES DATA — classes (levels 1-6), subclasses, species, backgrounds,
// feats, weapons and armor. Summarised from the System Reference Document 5.2.1.
//
// This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the
// Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
// Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.
//
// You normally don't need to edit this file. Campaign content lives in data/campaign.js.
//
// HOW CHOICES WORK (used by classes, subclasses, species, backgrounds and feats)
//   { id, type: "skills",    count, from? }      pick skill proficiencies (from = allowed list, default any)
//   { id, type: "expertise", count }             pick skills you're proficient in to double the bonus
//   { id, type: "subclass" }                     pick the class's subclass
//   { id, type: "asi" }                          Ability Score Improvement or a feat
//   { id, type: "originFeat" }                   pick an Origin feat
//   { id, type: "ability", label, from? }        +1 to one ability (from = allowed list)
//   { id, type: "pick", label, count, options }  pick from a list. Options can have `grants: [choices]`
//        add `pool` + `total` to make it cumulative across levels (invocations, masteries)
//   { id, type: "masteries", pool, total }       pick weapons whose mastery property you can use
//   { id, type: "spells", label, lists, level | maxLevel, count, filter? }  learn specific spells
//        level: 0 = cantrips, N = exactly level N, "slot" = cantrip up to your highest slot; maxLevel: N = level 1..N
// =============================================================================

var SRD = (window.SRD = window.SRD || {});

SRD.abilities = [
  { id: "str", name: "Strength" },
  { id: "dex", name: "Dexterity" },
  { id: "con", name: "Constitution" },
  { id: "int", name: "Intelligence" },
  { id: "wis", name: "Wisdom" },
  { id: "cha", name: "Charisma" },
];

SRD.standardArray = [15, 14, 13, 12, 10, 8];

SRD.skills = [
  { name: "Acrobatics", ability: "dex" },
  { name: "Animal Handling", ability: "wis" },
  { name: "Arcana", ability: "int" },
  { name: "Athletics", ability: "str" },
  { name: "Deception", ability: "cha" },
  { name: "History", ability: "int" },
  { name: "Insight", ability: "wis" },
  { name: "Intimidation", ability: "cha" },
  { name: "Investigation", ability: "int" },
  { name: "Medicine", ability: "wis" },
  { name: "Nature", ability: "int" },
  { name: "Perception", ability: "wis" },
  { name: "Performance", ability: "cha" },
  { name: "Persuasion", ability: "cha" },
  { name: "Religion", ability: "int" },
  { name: "Sleight of Hand", ability: "dex" },
  { name: "Stealth", ability: "dex" },
  { name: "Survival", ability: "wis" },
];

// Spell slots by class level (index 0 = level 1). Each entry: slots per spell level [1st, 2nd, 3rd].
SRD.slotTables = {
  full: [[2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3]],
  half: [[2], [2], [3], [3], [4, 2], [4, 2]],
};
// Warlock Pact Magic: number of slots and their level.
SRD.pactTable = { slots: [1, 2, 2, 2, 2, 2], slotLevel: [1, 1, 2, 2, 3, 3] };

// ---------------------------------------------------------------------------
// Shared option lists
// ---------------------------------------------------------------------------
SRD.fightingStyles = [
  { name: "Archery", text: "+2 bonus to attack rolls you make with Ranged weapons." },
  { name: "Defense", text: "While wearing Light, Medium, or Heavy armor, you gain +1 AC." },
  { name: "Great Weapon Fighting", text: "When you roll damage for a Melee weapon held in two hands (Two-Handed or Versatile), treat any 1 or 2 on a damage die as a 3." },
  { name: "Two-Weapon Fighting", text: "When you make the extra attack from a Light weapon, add your ability modifier to its damage." },
];

SRD.metamagic = [
  { name: "Careful Spell", text: "1 SP. When a spell forces saves, choose up to CHA mod creatures: they auto-succeed and take no damage on a half-damage save." },
  { name: "Distant Spell", text: "1 SP. Double a spell's range, or make a Touch spell's range 30 feet." },
  { name: "Empowered Spell", text: "1 SP. Reroll up to CHA mod damage dice (must use new rolls). Can combine with another Metamagic." },
  { name: "Extended Spell", text: "1 SP. Double a spell's duration (1 minute+, max 24 hours). Advantage on Concentration saves for it." },
  { name: "Heightened Spell", text: "2 SP. One target of the spell has Disadvantage on saves against it." },
  { name: "Quickened Spell", text: "2 SP. Cast a spell with a casting time of an action as a Bonus Action instead (can't if you've already cast a level 1+ spell this turn)." },
  { name: "Subtle Spell", text: "1 SP. Cast without Verbal, Somatic, or non-costly Material components." },
  { name: "Transmuted Spell", text: "1 SP. Change a spell's Acid, Cold, Fire, Lightning, Poison, or Thunder damage to another type from that list." },
  { name: "Twinned Spell", text: "1 SP. For a spell that can target an extra creature when upcast, increase its effective level by 1." },
];

SRD.invocations = [
  { name: "Pact of the Blade", text: "Bonus Action: conjure a pact weapon (Simple/Martial melee) or bond a magic weapon. You're proficient, can use CHA for attack and damage, and can make it deal Necrotic, Psychic, or Radiant damage." },
  { name: "Pact of the Chain", text: "You learn Find Familiar and can cast it as a Magic action without a slot. Special forms: Imp, Pseudodragon, Quasit, Skeleton, Sphinx of Wonder, Sprite, Venomous Snake. You can forgo one of your attacks to let the familiar attack with its Reaction.",
    grants: [] },
  { name: "Pact of the Tome", text: "Conjure a Book of Shadows after a rest. It holds 3 cantrips and 2 level-1 Ritual spells from any class; you have them prepared while you carry it.",
    grants: [
      { id: "tome-cantrips", type: "spells", label: "Book of Shadows cantrips", lists: "any", level: 0, count: 3 },
      { id: "tome-rituals", type: "spells", label: "Book of Shadows rituals", lists: "any", level: 1, count: 2, filter: "ritual" },
    ] },
  { name: "Armor of Shadows", text: "Cast Mage Armor on yourself without a spell slot." },
  { name: "Eldritch Mind", text: "Advantage on Constitution saves to maintain Concentration." },
  { name: "Agonizing Blast", minLevel: 2, text: "Pick a damaging Warlock cantrip (usually Eldritch Blast). Add your CHA mod to its damage." },
  { name: "Devil's Sight", minLevel: 2, text: "See normally in Dim Light and Darkness, magical or not, out to 120 feet." },
  { name: "Eldritch Spear", minLevel: 2, text: "A damaging Warlock cantrip with 10+ ft range gets +30 ft range per Warlock level." },
  { name: "Fiendish Vigor", minLevel: 2, text: "Cast False Life on yourself without a slot; you get the max Temporary HP." },
  { name: "Lessons of the First Ones", minLevel: 2, text: "Gain one Origin feat of your choice.", grants: [{ id: "first-ones-feat", type: "originFeat" }] },
  { name: "Mask of Many Faces", minLevel: 2, text: "Cast Disguise Self without a spell slot." },
  { name: "Misty Visions", minLevel: 2, text: "Cast Silent Image without a spell slot." },
  { name: "Otherworldly Leap", minLevel: 2, text: "Cast Jump on yourself without a spell slot." },
  { name: "Repelling Blast", minLevel: 2, text: "When an attack-roll Warlock cantrip hits a Large or smaller creature, push it up to 10 feet away." },
  { name: "Ascendant Step", minLevel: 5, text: "Cast Levitate on yourself without a spell slot." },
  { name: "Eldritch Smite", minLevel: 5, requires: "Pact of the Blade", text: "Once per turn when you hit with your pact weapon, spend a Pact slot: +1d8 Force plus 1d8 per slot level, and knock a Huge or smaller target Prone." },
  { name: "Gaze of Two Minds", minLevel: 5, text: "Bonus Action: touch a willing creature and perceive through its senses until the end of your next turn (extendable)." },
  { name: "Gift of the Depths", minLevel: 5, text: "Breathe underwater, gain a Swim Speed, and cast Water Breathing once per Long Rest without a slot." },
  { name: "Investment of the Chain Master", minLevel: 5, requires: "Pact of the Chain", text: "Your familiar gets a 40 ft Fly or Swim Speed, can attack as your Bonus Action, can deal Necrotic/Radiant, uses your save DC, and you can give it Resistance as a Reaction." },
  { name: "Master of Myriad Forms", minLevel: 5, text: "Cast Alter Self without a spell slot." },
  { name: "One with Shadows", minLevel: 5, text: "In Dim Light or Darkness, cast Invisibility on yourself without a spell slot." },
  { name: "Thirsting Blade", minLevel: 5, requires: "Pact of the Blade", text: "Extra Attack with your pact weapon: attack twice when you take the Attack action." },
];

SRD.dragonTypes = [
  { name: "Black (Acid)" }, { name: "Blue (Lightning)" }, { name: "Brass (Fire)" }, { name: "Bronze (Lightning)" },
  { name: "Copper (Acid)" }, { name: "Gold (Fire)" }, { name: "Green (Poison)" }, { name: "Red (Fire)" },
  { name: "Silver (Cold)" }, { name: "White (Cold)" },
];

const CASTING_ABILITY = (id) => ({
  id, type: "pick", label: "Spellcasting ability for these spells", count: 1,
  options: [{ name: "Intelligence" }, { name: "Wisdom" }, { name: "Charisma" }],
});

// ---------------------------------------------------------------------------
// Weapons & armor (SRD 5.2.1 equipment tables)
// ---------------------------------------------------------------------------
SRD.weapons = [
  // name, category, kind, damage, props, mastery
  ["Club", "simple", "melee", "1d4 Bludgeoning", "Light", "Slow"],
  ["Dagger", "simple", "melee", "1d4 Piercing", "Finesse, Light, Thrown (20/60)", "Nick"],
  ["Greatclub", "simple", "melee", "1d8 Bludgeoning", "Two-Handed", "Push"],
  ["Handaxe", "simple", "melee", "1d6 Slashing", "Light, Thrown (20/60)", "Vex"],
  ["Javelin", "simple", "melee", "1d6 Piercing", "Thrown (30/120)", "Slow"],
  ["Light Hammer", "simple", "melee", "1d4 Bludgeoning", "Light, Thrown (20/60)", "Nick"],
  ["Mace", "simple", "melee", "1d6 Bludgeoning", "—", "Sap"],
  ["Quarterstaff", "simple", "melee", "1d6 Bludgeoning", "Versatile (1d8)", "Topple"],
  ["Sickle", "simple", "melee", "1d4 Slashing", "Light", "Nick"],
  ["Spear", "simple", "melee", "1d6 Piercing", "Thrown (20/60), Versatile (1d8)", "Sap"],
  ["Dart", "simple", "ranged", "1d4 Piercing", "Finesse, Thrown (20/60)", "Vex"],
  ["Light Crossbow", "simple", "ranged", "1d8 Piercing", "Ammunition (80/320), Loading, Two-Handed", "Slow"],
  ["Shortbow", "simple", "ranged", "1d6 Piercing", "Ammunition (80/320), Two-Handed", "Vex"],
  ["Sling", "simple", "ranged", "1d4 Bludgeoning", "Ammunition (30/120)", "Slow"],
  ["Battleaxe", "martial", "melee", "1d8 Slashing", "Versatile (1d10)", "Topple"],
  ["Flail", "martial", "melee", "1d8 Bludgeoning", "—", "Sap"],
  ["Glaive", "martial", "melee", "1d10 Slashing", "Heavy, Reach, Two-Handed", "Graze"],
  ["Greataxe", "martial", "melee", "1d12 Slashing", "Heavy, Two-Handed", "Cleave"],
  ["Greatsword", "martial", "melee", "2d6 Slashing", "Heavy, Two-Handed", "Graze"],
  ["Halberd", "martial", "melee", "1d10 Slashing", "Heavy, Reach, Two-Handed", "Cleave"],
  ["Lance", "martial", "melee", "1d10 Piercing", "Heavy, Reach, Two-Handed (unless mounted)", "Topple"],
  ["Longsword", "martial", "melee", "1d8 Slashing", "Versatile (1d10)", "Sap"],
  ["Maul", "martial", "melee", "2d6 Bludgeoning", "Heavy, Two-Handed", "Topple"],
  ["Morningstar", "martial", "melee", "1d8 Piercing", "—", "Sap"],
  ["Pike", "martial", "melee", "1d10 Piercing", "Heavy, Reach, Two-Handed", "Push"],
  ["Rapier", "martial", "melee", "1d8 Piercing", "Finesse", "Vex"],
  ["Scimitar", "martial", "melee", "1d6 Slashing", "Finesse, Light", "Nick"],
  ["Shortsword", "martial", "melee", "1d6 Piercing", "Finesse, Light", "Vex"],
  ["Trident", "martial", "melee", "1d8 Piercing", "Thrown (20/60), Versatile (1d10)", "Topple"],
  ["Warhammer", "martial", "melee", "1d8 Bludgeoning", "Versatile (1d10)", "Push"],
  ["War Pick", "martial", "melee", "1d8 Piercing", "Versatile (1d10)", "Sap"],
  ["Whip", "martial", "melee", "1d4 Slashing", "Finesse, Reach", "Slow"],
  ["Blowgun", "martial", "ranged", "1 Piercing", "Ammunition (25/100), Loading", "Vex"],
  ["Hand Crossbow", "martial", "ranged", "1d6 Piercing", "Ammunition (30/120), Light, Loading", "Vex"],
  ["Heavy Crossbow", "martial", "ranged", "1d10 Piercing", "Ammunition (100/400), Heavy, Loading, Two-Handed", "Push"],
  ["Longbow", "martial", "ranged", "1d8 Piercing", "Ammunition (150/600), Heavy, Two-Handed", "Slow"],
  ["Musket", "martial", "ranged", "1d12 Piercing", "Ammunition (40/120), Loading, Two-Handed", "Slow"],
  ["Pistol", "martial", "ranged", "1d10 Piercing", "Ammunition (30/90), Loading", "Vex"],
].map(([name, category, kind, damage, props, mastery]) => ({ name, category, kind, damage, props, mastery }));

SRD.masteryText = {
  Cleave: "Hit a creature with a melee attack: make one more attack against a second creature within 5 ft of it (no ability mod to damage). Once per turn.",
  Graze: "If you miss, the target still takes damage equal to the ability modifier you used.",
  Nick: "The extra attack from the Light property can be part of the Attack action instead of a Bonus Action. Once per turn.",
  Push: "On a hit, push a Large or smaller creature up to 10 feet straight away from you.",
  Sap: "On a hit, the target has Disadvantage on its next attack roll before the start of your next turn.",
  Slow: "On a hit that deals damage, reduce the target's Speed by 10 ft until the start of your next turn.",
  Topple: "On a hit, the target makes a CON save (DC 8 + ability mod + PB) or falls Prone.",
  Vex: "On a hit that deals damage, you have Advantage on your next attack roll against that creature before the end of your next turn.",
};

SRD.armor = [
  { name: "Padded Armor", type: "light", base: 11, dexCap: 99, stealthDis: true },
  { name: "Leather Armor", type: "light", base: 11, dexCap: 99 },
  { name: "Studded Leather Armor", type: "light", base: 12, dexCap: 99 },
  { name: "Hide Armor", type: "medium", base: 12, dexCap: 2 },
  { name: "Chain Shirt", type: "medium", base: 13, dexCap: 2 },
  { name: "Scale Mail", type: "medium", base: 14, dexCap: 2, stealthDis: true },
  { name: "Breastplate", type: "medium", base: 14, dexCap: 2 },
  { name: "Half Plate Armor", type: "medium", base: 15, dexCap: 2, stealthDis: true },
  { name: "Ring Mail", type: "heavy", base: 14, dexCap: 0, stealthDis: true },
  { name: "Chain Mail", type: "heavy", base: 16, dexCap: 0, str: 13, stealthDis: true },
  { name: "Splint Armor", type: "heavy", base: 17, dexCap: 0, str: 15, stealthDis: true },
  { name: "Plate Armor", type: "heavy", base: 18, dexCap: 0, str: 15, stealthDis: true },
];

// ---------------------------------------------------------------------------
// Feats
// ---------------------------------------------------------------------------
SRD.feats = [
  { id: "alert", name: "Alert", category: "origin",
    text: "Add your Proficiency Bonus to Initiative. Right after rolling Initiative, you can swap Initiative with a willing ally." },
  { id: "magic-initiate-cleric", name: "Magic Initiate (Cleric)", category: "origin",
    text: "Learn two Cleric cantrips and one level 1 Cleric spell. You always have the level 1 spell prepared and can cast it once per Long Rest without a slot (or with slots you have).",
    choices: [CASTING_ABILITY("mi-ability"),
      { id: "mi-cantrips", type: "spells", label: "Magic Initiate cantrips", lists: ["Cleric"], level: 0, count: 2 },
      { id: "mi-spell", type: "spells", label: "Magic Initiate level 1 spell (1/long rest free)", lists: ["Cleric"], level: 1, count: 1 }] },
  { id: "magic-initiate-druid", name: "Magic Initiate (Druid)", category: "origin",
    text: "Learn two Druid cantrips and one level 1 Druid spell. You always have the level 1 spell prepared and can cast it once per Long Rest without a slot (or with slots you have).",
    choices: [CASTING_ABILITY("mi-ability"),
      { id: "mi-cantrips", type: "spells", label: "Magic Initiate cantrips", lists: ["Druid"], level: 0, count: 2 },
      { id: "mi-spell", type: "spells", label: "Magic Initiate level 1 spell (1/long rest free)", lists: ["Druid"], level: 1, count: 1 }] },
  { id: "magic-initiate-wizard", name: "Magic Initiate (Wizard)", category: "origin",
    text: "Learn two Wizard cantrips and one level 1 Wizard spell. You always have the level 1 spell prepared and can cast it once per Long Rest without a slot (or with slots you have).",
    choices: [CASTING_ABILITY("mi-ability"),
      { id: "mi-cantrips", type: "spells", label: "Magic Initiate cantrips", lists: ["Wizard"], level: 0, count: 2 },
      { id: "mi-spell", type: "spells", label: "Magic Initiate level 1 spell (1/long rest free)", lists: ["Wizard"], level: 1, count: 1 }] },
  { id: "savage-attacker", name: "Savage Attacker", category: "origin",
    text: "Once per turn when you hit with a weapon, roll its damage dice twice and use either roll." },
  { id: "skilled", name: "Skilled", category: "origin",
    text: "Gain proficiency in any combination of three skills or tools. (Pick skills here; note tools in your notes.)",
    choices: [{ id: "skilled-skills", type: "skills", count: 3 }] },
  { id: "asi", name: "Ability Score Improvement", category: "general", minLevel: 4,
    text: "Increase one ability score by 2, or two ability scores by 1 (max 20). Pick the same ability twice for +2.",
    choices: [{ id: "asi-a", type: "ability", label: "+1 to" }, { id: "asi-b", type: "ability", label: "+1 to" }] },
  { id: "grappler", name: "Grappler", category: "general", minLevel: 4, prereq: "Strength or Dexterity 13+",
    text: "Unarmed Strike hits during the Attack action can both deal damage and Grapple (once per turn). Advantage on attacks against creatures you're grappling. Moving a grappled creature your size or smaller costs no extra movement.",
    choices: [{ id: "grappler-asi", type: "ability", label: "+1 to", from: ["str", "dex"] }] },
];

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------
SRD.species = [
  { id: "dragonborn", name: "Dragonborn", speed: 30, darkvision: 60,
    blurb: "Draconic heritage, a breath weapon and resistance to your ancestor's element.",
    traits: [
      { name: "Breath Weapon", text: "Replace one attack in the Attack action with a 15-ft Cone or 30-ft Line. DEX save (DC 8 + CON mod + PB), {breath} damage of your ancestry type, half on success. Uses = PB per Long Rest." },
      { name: "Damage Resistance", text: "Resistance to your ancestry's damage type." },
      { name: "Darkvision", text: "60 feet." },
      { name: "Draconic Flight", minLevel: 5, text: "Bonus Action: spectral wings give you a Fly Speed equal to your Speed for 10 minutes. Once per Long Rest." },
    ],
    choices: [{ id: "ancestry", type: "pick", label: "Draconic ancestry", count: 1, options: SRD.dragonTypes }],
    resources: [
      { id: "breath", name: "Breath Weapon", max: "pb", reset: "long" },
      { id: "flight", name: "Draconic Flight", max: 1, reset: "long", minLevel: 5 },
    ],
    scale: { breath: { 1: "1d10", 5: "2d10" } } },
  { id: "dwarf", name: "Dwarf", speed: 30, darkvision: 120, hpPerLevel: 1,
    blurb: "Tough as stone. Extra HP every level, poison resistance, 120 ft darkvision.",
    traits: [
      { name: "Darkvision", text: "120 feet." },
      { name: "Dwarven Resilience", text: "Resistance to Poison damage. Advantage on saves to avoid or end the Poisoned condition." },
      { name: "Dwarven Toughness", text: "Your HP maximum increases by 1 per level (already added to your HP)." },
      { name: "Stonecunning", text: "Bonus Action: Tremorsense 60 ft for 10 minutes while on or touching stone. Uses = PB per Long Rest." },
    ],
    resources: [{ id: "stonecunning", name: "Stonecunning", max: "pb", reset: "long" }] },
  { id: "elf", name: "Elf", speed: 30, darkvision: 60,
    blurb: "Fey-touched. Trance instead of sleep, charm resistance, and lineage magic.",
    traits: [
      { name: "Darkvision", text: "60 feet (120 feet for Drow)." },
      { name: "Elven Lineage", text: "You know your lineage's cantrip. At level 3 and 5 you learn its spells; each can be cast once per Long Rest without a slot, or with your slots." },
      { name: "Fey Ancestry", text: "Advantage on saves to avoid or end the Charmed condition. (Very handy against vampires.)" },
      { name: "Keen Senses", text: "Proficiency in Insight, Perception, or Survival." },
      { name: "Trance", text: "You don't need to sleep and magic can't put you to sleep. Long Rest in 4 hours of meditation." },
    ],
    choices: [
      { id: "lineage", type: "pick", label: "Elven lineage", count: 1, options: [
        { name: "Drow", text: "Darkvision 120 ft. Dancing Lights cantrip; Faerie Fire at level 3; Darkness at level 5.",
          spells: { 1: ["Dancing Lights"], 3: ["Faerie Fire"], 5: ["Darkness"] } },
        { name: "High Elf", text: "Prestidigitation cantrip (swap for any Wizard cantrip on a Long Rest); Detect Magic at level 3; Misty Step at level 5.",
          spells: { 1: ["Prestidigitation"], 3: ["Detect Magic"], 5: ["Misty Step"] } },
        { name: "Wood Elf", text: "Speed 35 ft. Druidcraft cantrip; Longstrider at level 3; Pass without Trace at level 5.",
          spells: { 1: ["Druidcraft"], 3: ["Longstrider"], 5: ["Pass without Trace"] }, speed: 35 },
      ] },
      CASTING_ABILITY("spell-ability"),
      { id: "keen-senses", type: "skills", count: 1, from: ["Insight", "Perception", "Survival"] },
    ] },
  { id: "gnome", name: "Gnome", speed: 30, darkvision: 60,
    blurb: "Small and clever. Advantage on INT, WIS and CHA saves — great against mind magic.",
    traits: [
      { name: "Darkvision", text: "60 feet." },
      { name: "Gnomish Cunning", text: "Advantage on Intelligence, Wisdom, and Charisma saving throws." },
      { name: "Gnomish Lineage", text: "Forest Gnome: Minor Illusion cantrip, and Speak with Animals always prepared (PB free casts per Long Rest). Rock Gnome: Mending and Prestidigitation, and you can build Tiny clockwork devices." },
    ],
    choices: [
      { id: "lineage", type: "pick", label: "Gnomish lineage", count: 1, options: [
        { name: "Forest Gnome", text: "Minor Illusion cantrip; Speak with Animals PB times per Long Rest.", spells: { 1: ["Minor Illusion", "Speak with Animals"] } },
        { name: "Rock Gnome", text: "Mending and Prestidigitation cantrips; spend 10 minutes to make a Tiny clockwork device (up to 3 at a time).", spells: { 1: ["Mending", "Prestidigitation"] } },
      ] },
      CASTING_ABILITY("spell-ability"),
    ] },
  { id: "goliath", name: "Goliath", speed: 35,
    blurb: "Giant-blooded. A giant boon, Large Form at level 5, and 35 ft speed.",
    traits: [
      { name: "Giant Ancestry", text: "Your chosen boon can be used PB times per Long Rest." },
      { name: "Large Form", minLevel: 5, text: "Bonus Action: become Large for 10 minutes. Advantage on Strength checks and +10 ft Speed. Once per Long Rest." },
      { name: "Powerful Build", text: "Advantage on checks to end the Grappled condition; count as one size larger for carrying capacity." },
    ],
    choices: [{ id: "giant", type: "pick", label: "Giant ancestry", count: 1, options: [
      { name: "Cloud's Jaunt", text: "Bonus Action: teleport up to 30 feet to a space you can see." },
      { name: "Fire's Burn", text: "When you hit with an attack roll, deal an extra 1d10 Fire damage." },
      { name: "Frost's Chill", text: "When you hit with an attack roll, deal an extra 1d6 Cold damage and reduce the target's Speed by 10 ft." },
      { name: "Hill's Tumble", text: "When you hit a Large or smaller creature with an attack roll, knock it Prone." },
      { name: "Stone's Endurance", text: "Reaction when you take damage: reduce it by 1d12 + CON mod." },
      { name: "Storm's Thunder", text: "Reaction when a creature within 60 ft damages you: deal 1d8 Thunder damage to it." },
    ] }],
    resources: [
      { id: "giant", name: "Giant Ancestry", max: "pb", reset: "long" },
      { id: "large-form", name: "Large Form", max: 1, reset: "long", minLevel: 5 },
    ] },
  { id: "halfling", name: "Halfling", speed: 30,
    blurb: "Lucky and brave. Reroll natural 1s, advantage against fear.",
    traits: [
      { name: "Brave", text: "Advantage on saves to avoid or end the Frightened condition." },
      { name: "Halfling Nimbleness", text: "Move through the space of any creature a size larger than you (but can't stop there)." },
      { name: "Luck", text: "When you roll a 1 on a d20 Test, reroll it and use the new roll." },
      { name: "Naturally Stealthy", text: "You can Hide while obscured only by a creature at least one size larger than you." },
    ] },
  { id: "human", name: "Human", speed: 30,
    blurb: "Versatile. An extra skill, an extra Origin feat, and Heroic Inspiration every day.",
    traits: [
      { name: "Resourceful", text: "Gain Heroic Inspiration whenever you finish a Long Rest." },
      { name: "Skillful", text: "Proficiency in one skill of your choice." },
      { name: "Versatile", text: "Gain an Origin feat of your choice. Skilled is recommended." },
    ],
    choices: [
      { id: "skillful", type: "skills", count: 1 },
      { id: "versatile", type: "originFeat" },
    ],
    resources: [{ id: "heroic", name: "Heroic Inspiration", max: 1, reset: "long" }] },
  { id: "orc", name: "Orc", speed: 30, darkvision: 120,
    blurb: "Relentless. Refuse to drop once per day, dash with a burst of temporary HP.",
    traits: [
      { name: "Adrenaline Rush", text: "Dash as a Bonus Action and gain Temporary HP equal to your PB. Uses = PB per Short or Long Rest." },
      { name: "Darkvision", text: "120 feet." },
      { name: "Relentless Endurance", text: "When reduced to 0 HP but not killed outright, drop to 1 HP instead. Once per Long Rest." },
    ],
    resources: [
      { id: "adrenaline", name: "Adrenaline Rush", max: "pb", reset: "short" },
      { id: "relentless", name: "Relentless Endurance", max: 1, reset: "long" },
    ] },
  { id: "tiefling", name: "Tiefling", speed: 30, darkvision: 60,
    blurb: "Fiend-touched. A damage resistance and infernal spells. Fitting for a dark campaign.",
    traits: [
      { name: "Darkvision", text: "60 feet." },
      { name: "Fiendish Legacy", text: "Gain your legacy's resistance and cantrip. At level 3 and 5 you learn its spells; each can be cast once per Long Rest without a slot, or with your slots." },
      { name: "Otherworldly Presence", text: "You know the Thaumaturgy cantrip." },
    ],
    choices: [
      { id: "legacy", type: "pick", label: "Fiendish legacy", count: 1, options: [
        { name: "Abyssal", text: "Resistance to Poison. Poison Spray cantrip; Ray of Sickness at level 3; Hold Person at level 5.",
          spells: { 1: ["Poison Spray", "Thaumaturgy"], 3: ["Ray of Sickness"], 5: ["Hold Person"] } },
        { name: "Chthonic", text: "Resistance to Necrotic (great against vampires). Chill Touch cantrip; False Life at level 3; Ray of Enfeeblement at level 5.",
          spells: { 1: ["Chill Touch", "Thaumaturgy"], 3: ["False Life"], 5: ["Ray of Enfeeblement"] } },
        { name: "Infernal", text: "Resistance to Fire. Fire Bolt cantrip; Hellish Rebuke at level 3; Darkness at level 5.",
          spells: { 1: ["Fire Bolt", "Thaumaturgy"], 3: ["Hellish Rebuke"], 5: ["Darkness"] } },
      ] },
      CASTING_ABILITY("spell-ability"),
    ] },
];

// ---------------------------------------------------------------------------
// Backgrounds (more can be added in data/campaign.js)
// ---------------------------------------------------------------------------
SRD.backgrounds = [
  { id: "acolyte", name: "Acolyte", abilities: ["int", "wis", "cha"], feat: "magic-initiate-cleric",
    skills: ["Insight", "Religion"], tool: "Calligrapher's Supplies",
    equipment: "Calligrapher's Supplies, Book (prayers), Holy Symbol, Parchment (10 sheets), Robe, 8 GP — or 50 GP",
    blurb: "You served in a temple. Comes with Cleric magic." },
  { id: "criminal", name: "Criminal", abilities: ["dex", "con", "int"], feat: "alert",
    skills: ["Sleight of Hand", "Stealth"], tool: "Thieves' Tools",
    equipment: "2 Daggers, Thieves' Tools, Crowbar, 2 Pouches, Traveler's Clothes, 16 GP — or 50 GP",
    blurb: "You lived outside the law. Fast reactions." },
  { id: "sage", name: "Sage", abilities: ["con", "int", "wis"], feat: "magic-initiate-wizard",
    skills: ["Arcana", "History"], tool: "Calligrapher's Supplies",
    equipment: "Quarterstaff, Calligrapher's Supplies, Book (history), Parchment (8 sheets), Robe, 8 GP — or 50 GP",
    blurb: "You studied old lore. Comes with Wizard magic." },
  { id: "soldier", name: "Soldier", abilities: ["str", "dex", "con"], feat: "savage-attacker",
    skills: ["Athletics", "Intimidation"], tool: "One Gaming Set",
    equipment: "Spear, Shortbow, 20 Arrows, Gaming Set, Healer's Kit, Quiver, Traveler's Clothes, 14 GP — or 50 GP",
    blurb: "You trained for war. Hits hard." },
];

// ---------------------------------------------------------------------------
// Classes (levels 1-6)
// Resource `max`: a number, an array per level, "pb", "level", "level*5", or "mod:cha" (min 1).
// Resource `reset`: "long", "short" (all back on short rest) or "short1" (one back on short, all on long).
// ---------------------------------------------------------------------------
const ASI = (lvl) => ({ name: "Ability Score Improvement", text: "Take the Ability Score Improvement feat or another feat you qualify for." });
const SUBCLASS_FEATURE = (cls) => ({ name: `${cls} Subclass`, text: "Choose your subclass. You gain its features at this level and later levels." });
const EXTRA_ATTACK = { name: "Extra Attack", text: "You attack twice, instead of once, whenever you take the Attack action on your turn." };

SRD.classes = [
  // -------------------------------------------------------------- BARBARIAN
  { id: "barbarian", name: "Barbarian", hitDie: 12, primary: "Strength", saves: ["str", "con"],
    skills: { count: 2, from: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"] },
    weapons: "Simple and Martial weapons", armor: "Light and Medium armor, Shields",
    armorTraining: ["light", "medium", "shield"], unarmored: ["dex", "con"], shieldOkUnarmored: true,
    masteryFilter: "melee",
    blurb: "A storm of fury. Rage shrugs off physical blows and hits harder. Pairs well with a big axe and a sharpened stake.",
    tracks: [{ label: "Rage Damage", values: ["+2", "+2", "+2", "+2", "+2", "+2"] }],
    resources: [{ id: "rage", name: "Rage", max: [2, 2, 3, 3, 3, 4], reset: "short1" }],
    levels: {
      1: { features: [
          { name: "Rage", text: "Bonus Action (not in Heavy armor). While raging: Resistance to Bludgeoning, Piercing and Slashing; +Rage Damage on Strength attacks; Advantage on Strength checks and saves; no Concentration or spells. Lasts until the end of your next turn; extend each turn by attacking, forcing a save, or using a Bonus Action (max 10 minutes). Regain one use on a Short Rest, all on a Long Rest." },
          { name: "Unarmored Defense", text: "Without armor, your AC = 10 + DEX mod + CON mod. A Shield still works." },
          { name: "Weapon Mastery", text: "Use the mastery properties of two kinds of Simple or Martial Melee weapons. Change one after a Long Rest." },
        ],
        choices: [{ id: "masteries", type: "masteries", pool: "mastery", total: 2 }] },
      2: { features: [
          { name: "Danger Sense", text: "Advantage on Dexterity saving throws unless Incapacitated." },
          { name: "Reckless Attack", text: "On your first attack of the turn, choose to attack recklessly: Advantage on Strength attack rolls until your next turn, but attacks against you have Advantage too." },
        ] },
      3: { features: [
          SUBCLASS_FEATURE("Barbarian"),
          { name: "Primal Knowledge", text: "Gain another Barbarian skill. While raging, you can make Acrobatics, Intimidation, Perception, Stealth, or Survival checks as Strength checks." },
        ],
        choices: [{ id: "subclass", type: "subclass" },
          { id: "primal-skill", type: "skills", count: 1, from: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"] }] },
      4: { features: [ASI(4)], choices: [{ id: "asi", type: "asi" }, { id: "masteries", type: "masteries", pool: "mastery", total: 3 }] },
      5: { features: [EXTRA_ATTACK, { name: "Fast Movement", text: "+10 ft Speed while not wearing Heavy armor." }] },
      6: { features: [{ name: "Subclass feature", text: "Gain your subclass's level 6 feature." }] },
    } },

  // -------------------------------------------------------------- BARD
  { id: "bard", name: "Bard", hitDie: 8, primary: "Charisma", saves: ["dex", "cha"],
    skills: { count: 3 }, weapons: "Simple weapons", armor: "Light armor", armorTraining: ["light"],
    blurb: "Words are weapons. Inspire allies, control the battlefield, and learn secrets other casters can't.",
    spellcasting: { ability: "cha", lists: ["Bard"], type: "full", cantrips: [2, 2, 2, 3, 3, 3], prepared: [4, 5, 6, 7, 9, 10] },
    tracks: [{ label: "Bardic Inspiration Die", values: ["d6", "d6", "d6", "d6", "d8", "d8"] }],
    resources: [{ id: "inspiration", name: "Bardic Inspiration", max: "mod:cha", reset: "long", shortFromLevel: 5 }],
    levels: {
      1: { features: [
          { name: "Bardic Inspiration", text: "Bonus Action: give a creature within 60 ft a Bardic Inspiration die. Once within the next hour, when it fails a d20 Test, it can roll the die and add it. Uses = CHA mod per Long Rest." },
          { name: "Spellcasting", text: "Cast Bard spells using Charisma. You can swap one cantrip and one prepared spell whenever you gain a level. Focus: Musical Instrument." },
        ] },
      2: { features: [
          { name: "Expertise", text: "Gain Expertise in two skills you're proficient in." },
          { name: "Jack of All Trades", text: "Add half your PB (round down) to ability checks using skills you aren't proficient in." },
        ],
        choices: [{ id: "expertise", type: "expertise", count: 2 }] },
      3: { features: [SUBCLASS_FEATURE("Bard")], choices: [{ id: "subclass", type: "subclass" }] },
      4: { features: [ASI(4)], choices: [{ id: "asi", type: "asi" }] },
      5: { features: [{ name: "Font of Inspiration", text: "Regain all Bardic Inspiration on a Short or Long Rest. You can also expend a spell slot (no action) to regain one use." }] },
      6: { features: [{ name: "Subclass feature", text: "Gain your subclass's level 6 feature." }] },
    } },

  // -------------------------------------------------------------- CLERIC
  { id: "cleric", name: "Cleric", hitDie: 8, primary: "Wisdom", saves: ["wis", "cha"],
    skills: { count: 2, from: ["History", "Insight", "Medicine", "Persuasion", "Religion"] },
    weapons: "Simple weapons", armor: "Light and Medium armor, Shields", armorTraining: ["light", "medium", "shield"],
    blurb: "The classic vampire hunter. Turn Undead, radiant damage, healing, and at level 5 you burn the undead you turn.",
    spellcasting: { ability: "wis", lists: ["Cleric"], type: "full", cantrips: [3, 3, 3, 4, 4, 4], prepared: [4, 5, 6, 7, 9, 10] },
    resources: [{ id: "channel", name: "Channel Divinity", max: [0, 2, 2, 2, 2, 3], reset: "short1" }],
    levels: {
      1: { features: [
          { name: "Spellcasting", text: "Cast Cleric spells using Wisdom. Change your prepared spells after any Long Rest. Focus: Holy Symbol." },
          { name: "Divine Order", text: "Protector: Martial weapons and Heavy armor. Thaumaturge: one extra Cleric cantrip, and add your WIS mod (min +1) to Arcana and Religion checks." },
        ],
        choices: [{ id: "order", type: "pick", label: "Divine Order", count: 1, options: [
          { name: "Protector", text: "Proficiency with Martial weapons and training with Heavy armor.", armorTraining: ["heavy"], weapons: "Martial weapons" },
          { name: "Thaumaturge", text: "One extra Cleric cantrip. Add WIS mod (min +1) to Arcana and Religion checks.",
            grants: [{ id: "thaum-cantrip", type: "spells", label: "Extra Cleric cantrip", lists: ["Cleric"], level: 0, count: 1 }] },
        ] }] },
      2: { features: [
          { name: "Channel Divinity", text: "Two uses (regain one on a Short Rest, all on a Long Rest). Divine Spark: Magic action, a creature within 30 ft either regains 1d8 + WIS mod HP, or makes a CON save or takes that much Necrotic or Radiant damage (half on success). Turn Undead: Magic action, each Undead of your choice within 30 ft makes a WIS save or is Frightened and Incapacitated for 1 minute (ends if it takes damage)." },
        ] },
      3: { features: [SUBCLASS_FEATURE("Cleric")], choices: [{ id: "subclass", type: "subclass" }] },
      4: { features: [ASI(4)], choices: [{ id: "asi", type: "asi" }] },
      5: { features: [{ name: "Sear Undead", text: "When you use Turn Undead, roll d8s equal to your WIS mod (min 1). Each Undead that fails the save takes that much Radiant damage, and the turn effect isn't ended by it." }] },
      6: { features: [{ name: "Subclass feature", text: "Gain your subclass's level 6 feature." }] },
    } },

  // -------------------------------------------------------------- DRUID
  { id: "druid", name: "Druid", hitDie: 8, primary: "Wisdom", saves: ["int", "wis"],
    skills: { count: 2, from: ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"] },
    weapons: "Simple weapons", armor: "Light armor, Shields", armorTraining: ["light", "shield"],
    blurb: "Nature's answer to the unnatural. Shape-shift, call storms, and heal. Moonbeam is brutal against shapechangers.",
    spellcasting: { ability: "wis", lists: ["Druid"], type: "full", cantrips: [2, 2, 2, 3, 3, 3], prepared: [4, 5, 6, 7, 9, 10] },
    alwaysPrepared: { 1: ["Speak with Animals"] },
    resources: [{ id: "wildshape", name: "Wild Shape", max: [0, 2, 2, 2, 2, 3], reset: "short1" }],
    tracks: [{ label: "Wild Shape forms (max CR)", values: ["—", "4 (CR 1/4)", "4 (CR 1/4)", "6 (CR 1/2)", "6 (CR 1/2)", "6 (CR 1/2)"] }],
    levels: {
      1: { features: [
          { name: "Spellcasting", text: "Cast Druid spells using Wisdom. Change your prepared spells after any Long Rest. Focus: Druidic Focus." },
          { name: "Druidic", text: "You know the secret Druidic language and always have Speak with Animals prepared." },
          { name: "Primal Order", text: "Magician: one extra Druid cantrip and add WIS mod (min +1) to Arcana and Nature checks. Warden: Martial weapons and Medium armor." },
        ],
        choices: [{ id: "order", type: "pick", label: "Primal Order", count: 1, options: [
          { name: "Magician", text: "One extra Druid cantrip. Add WIS mod (min +1) to Arcana and Nature checks.",
            grants: [{ id: "magician-cantrip", type: "spells", label: "Extra Druid cantrip", lists: ["Druid"], level: 0, count: 1 }] },
          { name: "Warden", text: "Proficiency with Martial weapons and training with Medium armor.", armorTraining: ["medium"], weapons: "Martial weapons" },
        ] }] },
      2: { features: [
          { name: "Wild Shape", text: "Bonus Action: turn into a Beast form you know (no Fly Speed yet) for hours = half your Druid level. You gain Temp HP = Druid level, keep your HP, mental stats, features and proficiencies, but can't cast spells. Two uses; regain one on a Short Rest, all on a Long Rest." },
          { name: "Wild Companion", text: "Magic action: spend a spell slot or Wild Shape use to cast Find Familiar without components. The familiar is Fey and leaves after a Long Rest." },
        ] },
      3: { features: [SUBCLASS_FEATURE("Druid")], choices: [{ id: "subclass", type: "subclass" }] },
      4: { features: [ASI(4)], choices: [{ id: "asi", type: "asi" }] },
      5: { features: [{ name: "Wild Resurgence", text: "Once per turn with no Wild Shape uses left, spend a spell slot to regain one. Or spend a Wild Shape use to get a level 1 slot (once per Long Rest)." }] },
      6: { features: [{ name: "Subclass feature", text: "Gain your subclass's level 6 feature." }] },
    } },

  // -------------------------------------------------------------- FIGHTER
  { id: "fighter", name: "Fighter", hitDie: 10, primary: "Strength or Dexterity", saves: ["str", "con"],
    skills: { count: 2, from: ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Persuasion", "Perception", "Survival"] },
    weapons: "Simple and Martial weapons", armor: "All armor, Shields", armorTraining: ["light", "medium", "heavy", "shield"],
    masteryFilter: "any",
    blurb: "Master of arms. Most attacks, most masteries, and a second wind when the night gets long.",
    resources: [
      { id: "second-wind", name: "Second Wind", max: [2, 2, 2, 3, 3, 3], reset: "short1" },
      { id: "action-surge", name: "Action Surge", max: [0, 1, 1, 1, 1, 1], reset: "short" },
    ],
    levels: {
      1: { features: [
          { name: "Fighting Style", text: "Gain a Fighting Style feat. You can swap it whenever you gain a Fighter level." },
          { name: "Second Wind", text: "Bonus Action: regain 1d10 + Fighter level HP. Regain one use on a Short Rest, all on a Long Rest." },
          { name: "Weapon Mastery", text: "Use the mastery properties of three kinds of Simple or Martial weapons. Change one after a Long Rest." },
        ],
        choices: [
          { id: "style", type: "pick", label: "Fighting Style", count: 1, options: SRD.fightingStyles },
          { id: "masteries", type: "masteries", pool: "mastery", total: 3 },
        ] },
      2: { features: [
          { name: "Action Surge", text: "Take one additional action on your turn (not the Magic action). Once per Short or Long Rest." },
          { name: "Tactical Mind", text: "When you fail an ability check, spend a Second Wind use to add 1d10. If it still fails, the use isn't spent." },
        ] },
      3: { features: [SUBCLASS_FEATURE("Fighter")], choices: [{ id: "subclass", type: "subclass" }] },
      4: { features: [ASI(4)], choices: [{ id: "asi", type: "asi" }, { id: "masteries", type: "masteries", pool: "mastery", total: 4 }] },
      5: { features: [EXTRA_ATTACK, { name: "Tactical Shift", text: "When you use Second Wind as a Bonus Action, you can move up to half your Speed without provoking Opportunity Attacks." }] },
      6: { features: [ASI(6)], choices: [{ id: "asi", type: "asi" }] },
    } },

  // -------------------------------------------------------------- MONK
  { id: "monk", name: "Monk", hitDie: 8, primary: "Dexterity and Wisdom", saves: ["str", "dex"],
    skills: { count: 2, from: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"] },
    weapons: "Simple weapons, Martial weapons with the Light property", armor: "None", armorTraining: [],
    unarmored: ["dex", "wis"], monkWeapons: true,
    blurb: "A disciplined body. Fast, hard to hit, and at level 5 you can Stun a vampire spawn mid-lunge.",
    tracks: [
      { label: "Martial Arts Die", values: ["d6", "d6", "d6", "d6", "d8", "d8"] },
      { label: "Unarmored Movement", values: ["—", "+10 ft", "+10 ft", "+10 ft", "+10 ft", "+15 ft"] },
    ],
    resources: [
      { id: "focus", name: "Focus Points", max: [0, 2, 3, 4, 5, 6], reset: "short" },
      { id: "metabolism", name: "Uncanny Metabolism", max: [0, 1, 1, 1, 1, 1], reset: "long" },
    ],
    levels: {
      1: { features: [
          { name: "Martial Arts", text: "Unarmed or with only Monk weapons (Simple Melee, or Martial Melee with Light) and no armor/shield: Bonus Action Unarmed Strike, use the Martial Arts die for damage, and use DEX instead of STR for attacks, damage and grapple/shove DCs." },
          { name: "Unarmored Defense", text: "Without armor or a Shield, your AC = 10 + DEX mod + WIS mod." },
        ] },
      2: { features: [
          { name: "Monk's Focus", text: "Focus Points = Monk level, all back on a Short Rest. Save DC = 8 + WIS mod + PB. Flurry of Blows (1 FP): two Unarmed Strikes as a Bonus Action. Patient Defense: Disengage as a Bonus Action, or 1 FP for Disengage + Dodge. Step of the Wind: Dash as a Bonus Action, or 1 FP for Disengage + Dash and double jump distance." },
          { name: "Unarmored Movement", text: "+10 ft Speed without armor or a Shield." },
          { name: "Uncanny Metabolism", text: "When you roll Initiative, regain all Focus Points and heal Martial Arts die + Monk level. Once per Long Rest." },
        ] },
      3: { features: [
          { name: "Deflect Attacks", text: "Reaction when hit by a Bludgeoning, Piercing or Slashing attack: reduce the damage by 1d10 + DEX mod + Monk level. If it drops to 0, spend 1 FP to redirect: a creature within 5 ft (melee) or 60 ft (ranged) makes a DEX save or takes two Martial Arts dice + DEX mod." },
          SUBCLASS_FEATURE("Monk"),
        ],
        choices: [{ id: "subclass", type: "subclass" }] },
      4: { features: [ASI(4), { name: "Slow Fall", text: "Reaction when you fall: reduce falling damage by 5 x Monk level." }], choices: [{ id: "asi", type: "asi" }] },
      5: { features: [EXTRA_ATTACK, { name: "Stunning Strike", text: "Once per turn when you hit with a Monk weapon or Unarmed Strike, spend 1 FP: the target makes a CON save or is Stunned until the start of your next turn. On a success its Speed is halved and the next attack against it has Advantage." }] },
      6: { features: [
          { name: "Empowered Strikes", text: "Your Unarmed Strikes can deal Force damage instead of their normal type." },
          { name: "Subclass feature", text: "Gain your subclass's level 6 feature." },
        ] },
    } },

  // -------------------------------------------------------------- PALADIN
  { id: "paladin", name: "Paladin", hitDie: 10, primary: "Strength and Charisma", saves: ["wis", "cha"],
    skills: { count: 2, from: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"] },
    weapons: "Simple and Martial weapons", armor: "All armor, Shields", armorTraining: ["light", "medium", "heavy", "shield"],
    masteryFilter: "any",
    blurb: "Holy warrior. Divine Smite deals extra damage to Undead, and you sense them coming. The vampire hunter archetype.",
    spellcasting: { ability: "cha", lists: ["Paladin"], type: "half", cantrips: [0, 0, 0, 0, 0, 0], prepared: [2, 3, 4, 5, 6, 6] },
    alwaysPrepared: { 2: ["Divine Smite"], 5: ["Find Steed"] },
    resources: [
      { id: "lay-on-hands", name: "Lay On Hands (HP pool)", max: "level*5", reset: "long", pool: true },
      { id: "free-smite", name: "Free Divine Smite", max: [0, 1, 1, 1, 1, 1], reset: "long" },
      { id: "channel", name: "Channel Divinity", max: [0, 0, 2, 2, 2, 2], reset: "short1" },
      { id: "free-steed", name: "Free Find Steed", max: [0, 0, 0, 0, 1, 1], reset: "long" },
    ],
    levels: {
      1: { features: [
          { name: "Lay On Hands", text: "A pool of healing equal to 5 x Paladin level, refilled on a Long Rest. Bonus Action: touch a creature and restore HP from the pool, or spend 5 to remove the Poisoned condition." },
          { name: "Spellcasting", text: "Cast Paladin spells using Charisma. Swap one prepared spell after a Long Rest. Focus: Holy Symbol." },
          { name: "Weapon Mastery", text: "Use the mastery properties of two kinds of weapons you're proficient with. Change them after a Long Rest." },
        ],
        choices: [{ id: "masteries", type: "masteries", pool: "mastery", total: 2 }] },
      2: { features: [
          { name: "Fighting Style", text: "Gain a Fighting Style feat, or Blessed Warrior: learn two Cleric cantrips (CHA is your ability for them)." },
          { name: "Paladin's Smite", text: "You always have Divine Smite prepared, and can cast it once per Long Rest without a slot. Divine Smite: Bonus Action after hitting with a melee weapon, +2d8 Radiant (+1d8 per slot level above 1), +1d8 more vs Fiends and Undead." },
        ],
        choices: [{ id: "style", type: "pick", label: "Fighting Style", count: 1, options: [...SRD.fightingStyles,
          { name: "Blessed Warrior", text: "Learn two Cleric cantrips. They count as Paladin spells and use Charisma.",
            grants: [{ id: "blessed-cantrips", type: "spells", label: "Blessed Warrior cantrips", lists: ["Cleric"], level: 0, count: 2 }] },
        ] }] },
      3: { features: [
          { name: "Channel Divinity", text: "Two uses (regain one on a Short Rest). Divine Sense: Bonus Action, for 10 minutes you know the location and type of any Celestial, Fiend or Undead within 60 ft, and sense consecrated or desecrated places." },
          SUBCLASS_FEATURE("Paladin"),
        ],
        choices: [{ id: "subclass", type: "subclass" }] },
      4: { features: [ASI(4)], choices: [{ id: "asi", type: "asi" }] },
      5: { features: [EXTRA_ATTACK, { name: "Faithful Steed", text: "You always have Find Steed prepared and can cast it once per Long Rest without a slot." }] },
      6: { features: [{ name: "Aura of Protection", text: "You and allies within 10 ft add your CHA mod (min +1) to saving throws while you aren't Incapacitated. Huge against a vampire's charm." }] },
    } },

  // -------------------------------------------------------------- RANGER
  { id: "ranger", name: "Ranger", hitDie: 10, primary: "Dexterity and Wisdom", saves: ["str", "dex"],
    skills: { count: 3, from: ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"] },
    weapons: "Simple and Martial weapons", armor: "Light and Medium armor, Shields", armorTraining: ["light", "medium", "shield"],
    masteryFilter: "any",
    blurb: "The hunter. Mark your quarry, track it through the dark, and put a silvered arrow through it.",
    spellcasting: { ability: "wis", lists: ["Ranger"], type: "half", cantrips: [0, 0, 0, 0, 0, 0], prepared: [2, 3, 4, 5, 6, 6] },
    alwaysPrepared: { 1: ["Hunter's Mark"] },
    resources: [{ id: "favored-enemy", name: "Free Hunter's Mark", max: [2, 2, 2, 2, 3, 3], reset: "long" }],
    levels: {
      1: { features: [
          { name: "Spellcasting", text: "Cast Ranger spells using Wisdom. Swap one prepared spell after a Long Rest. Focus: Druidic Focus." },
          { name: "Favored Enemy", text: "You always have Hunter's Mark prepared and can cast it without a slot a few times per Long Rest (see tracker)." },
          { name: "Weapon Mastery", text: "Use the mastery properties of two kinds of weapons you're proficient with. Change them after a Long Rest." },
        ],
        choices: [{ id: "masteries", type: "masteries", pool: "mastery", total: 2 }] },
      2: { features: [
          { name: "Deft Explorer", text: "Expertise in one skill you're proficient in, and you learn two languages." },
          { name: "Fighting Style", text: "Gain a Fighting Style feat, or Druidic Warrior: learn two Druid cantrips (WIS is your ability for them)." },
        ],
        choices: [
          { id: "deft-expertise", type: "expertise", count: 1 },
          { id: "style", type: "pick", label: "Fighting Style", count: 1, options: [...SRD.fightingStyles,
            { name: "Druidic Warrior", text: "Learn two Druid cantrips. They count as Ranger spells and use Wisdom.",
              grants: [{ id: "druidic-cantrips", type: "spells", label: "Druidic Warrior cantrips", lists: ["Druid"], level: 0, count: 2 }] },
          ] },
        ] },
      3: { features: [SUBCLASS_FEATURE("Ranger")], choices: [{ id: "subclass", type: "subclass" }] },
      4: { features: [ASI(4)], choices: [{ id: "asi", type: "asi" }] },
      5: { features: [EXTRA_ATTACK] },
      6: { features: [{ name: "Roving", text: "+10 ft Speed when not in Heavy armor, and a Climb Speed and Swim Speed equal to your Speed." }] },
    } },

  // -------------------------------------------------------------- ROGUE
  { id: "rogue", name: "Rogue", hitDie: 8, primary: "Dexterity", saves: ["dex", "int"],
    skills: { count: 4, from: ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Persuasion", "Sleight of Hand", "Stealth"] },
    weapons: "Simple weapons, Martial weapons with Finesse or Light", armor: "Light armor", armorTraining: ["light"],
    masteryFilter: "rogue",
    blurb: "A knife in the dark. Sneak Attack, expertise, and unmatched mobility. The one who finds the coffin.",
    tracks: [{ label: "Sneak Attack", values: ["1d6", "1d6", "2d6", "2d6", "3d6", "3d6"] }],
    levels: {
      1: { features: [
          { name: "Expertise", text: "Expertise in two skills you're proficient in." },
          { name: "Sneak Attack", text: "Once per turn, deal extra damage to a creature you hit with a Finesse or Ranged weapon if you have Advantage, or if an ally is within 5 ft of the target (and you don't have Disadvantage)." },
          { name: "Thieves' Cant", text: "You know Thieves' Cant and one other language." },
          { name: "Weapon Mastery", text: "Use the mastery properties of two kinds of weapons you're proficient with. Change them after a Long Rest." },
        ],
        choices: [
          { id: "expertise", type: "expertise", count: 2 },
          { id: "masteries", type: "masteries", pool: "mastery", total: 2 },
        ] },
      2: { features: [{ name: "Cunning Action", text: "Bonus Action: Dash, Disengage, or Hide." }] },
      3: { features: [
          SUBCLASS_FEATURE("Rogue"),
          { name: "Steady Aim", text: "Bonus Action if you haven't moved this turn: Advantage on your next attack this turn. Your Speed becomes 0 until the end of the turn." },
        ],
        choices: [{ id: "subclass", type: "subclass" }] },
      4: { features: [ASI(4)], choices: [{ id: "asi", type: "asi" }] },
      5: { features: [
          { name: "Cunning Strike", text: "When you deal Sneak Attack damage, give up Sneak Attack dice for an effect (DC 8 + DEX mod + PB). Poison (1d6): CON save or Poisoned for 1 minute (needs a Poisoner's Kit). Trip (1d6): Large or smaller, DEX save or Prone. Withdraw (1d6): move half your Speed without provoking." },
          { name: "Uncanny Dodge", text: "Reaction when an attacker you can see hits you: halve the attack's damage." },
        ] },
      6: { features: [{ name: "Expertise", text: "Expertise in two more skills you're proficient in." }], choices: [{ id: "expertise6", type: "expertise", count: 2 }] },
    } },

  // -------------------------------------------------------------- SORCERER
  { id: "sorcerer", name: "Sorcerer", hitDie: 6, primary: "Charisma", saves: ["con", "cha"],
    skills: { count: 2, from: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"] },
    weapons: "Simple weapons", armor: "None", armorTraining: [],
    blurb: "Magic in the blood. Bend spells with Metamagic. A Daylight or Fireball from a sorcerer ends a nest fast.",
    spellcasting: { ability: "cha", lists: ["Sorcerer"], type: "full", cantrips: [4, 4, 4, 5, 5, 5], prepared: [2, 4, 6, 7, 9, 10] },
    resources: [
      { id: "innate", name: "Innate Sorcery", max: 2, reset: "long" },
      { id: "sorcery-points", name: "Sorcery Points", max: [0, 2, 3, 4, 5, 6], reset: "long", pool: true },
      { id: "restoration", name: "Sorcerous Restoration", max: [0, 0, 0, 0, 1, 1], reset: "long" },
    ],
    levels: {
      1: { features: [
          { name: "Spellcasting", text: "Cast Sorcerer spells using Charisma. Swap one cantrip and one prepared spell whenever you gain a level. Focus: Arcane Focus." },
          { name: "Innate Sorcery", text: "Bonus Action: for 1 minute, your Sorcerer spell save DC is +1 and you have Advantage on Sorcerer spell attack rolls. Twice per Long Rest." },
        ] },
      2: { features: [
          { name: "Font of Magic", text: "Sorcery Points = Sorcerer level (from level 2), back on a Long Rest. Turn a spell slot into points equal to its level (no action), or Bonus Action: turn points into a slot (level 1 = 2 SP, level 2 = 3 SP, level 3 = 5 SP; level 3 slots need Sorcerer level 5). Created slots vanish on a Long Rest." },
          { name: "Metamagic", text: "Learn two Metamagic options. Only one per spell unless stated. Swap one when you gain a level." },
        ],
        choices: [{ id: "metamagic", type: "pick", label: "Metamagic", count: 2, pool: "metamagic", total: 2, options: SRD.metamagic }] },
      3: { features: [SUBCLASS_FEATURE("Sorcerer")], choices: [{ id: "subclass", type: "subclass" }] },
      4: { features: [ASI(4)], choices: [{ id: "asi", type: "asi" }] },
      5: { features: [{ name: "Sorcerous Restoration", text: "On a Short Rest, regain Sorcery Points up to half your Sorcerer level (round down). Once per Long Rest." }] },
      6: { features: [{ name: "Subclass feature", text: "Gain your subclass's level 6 feature." }] },
    } },

  // -------------------------------------------------------------- WARLOCK
  { id: "warlock", name: "Warlock", hitDie: 8, primary: "Charisma", saves: ["wis", "cha"],
    skills: { count: 2, from: ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"] },
    weapons: "Simple weapons", armor: "Light armor", armorTraining: ["light"],
    blurb: "A pact with something dark. Few spell slots that come back on a Short Rest, plus Eldritch Invocations. Who hunts monsters with a monster's gift?",
    spellcasting: { ability: "cha", lists: ["Warlock"], type: "pact", cantrips: [2, 2, 2, 3, 3, 3], prepared: [2, 3, 4, 5, 6, 7] },
    resources: [{ id: "cunning", name: "Magical Cunning", max: [0, 1, 1, 1, 1, 1], reset: "long" }],
    tracks: [{ label: "Invocations", values: ["1", "3", "3", "3", "5", "5"] }],
    levels: {
      1: { features: [
          { name: "Eldritch Invocations", text: "Gain one invocation. You can swap one whenever you gain a Warlock level." },
          { name: "Pact Magic", text: "Cast Warlock spells using Charisma. All your slots are the same level and come back on a Short or Long Rest. Swap one cantrip and one prepared spell when you gain a level. Focus: Arcane Focus." },
        ],
        choices: [{ id: "invocations", type: "pick", label: "Eldritch Invocations", pool: "invocations", total: 1, options: SRD.invocations }] },
      2: { features: [{ name: "Magical Cunning", text: "1-minute rite: regain expended Pact slots up to half your maximum (round up). Once per Long Rest." }],
        choices: [{ id: "invocations", type: "pick", label: "Eldritch Invocations", pool: "invocations", total: 3, options: SRD.invocations }] },
      3: { features: [SUBCLASS_FEATURE("Warlock")], choices: [{ id: "subclass", type: "subclass" }] },
      4: { features: [ASI(4)], choices: [{ id: "asi", type: "asi" }] },
      5: { features: [{ name: "More Invocations", text: "You now know five Eldritch Invocations." }],
        choices: [{ id: "invocations", type: "pick", label: "Eldritch Invocations", pool: "invocations", total: 5, options: SRD.invocations }] },
      6: { features: [{ name: "Subclass feature", text: "Gain your subclass's level 6 feature." }] },
    } },

  // -------------------------------------------------------------- WIZARD
  { id: "wizard", name: "Wizard", hitDie: 6, primary: "Intelligence", saves: ["int", "wis"],
    skills: { count: 2, from: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Nature", "Religion"] },
    weapons: "Simple weapons", armor: "None", armorTraining: [],
    blurb: "Scholar of the arcane. The biggest spell list and a spellbook full of answers. Knows exactly which ward keeps a vampire out.",
    spellcasting: { ability: "int", lists: ["Wizard"], type: "full", cantrips: [3, 3, 3, 4, 4, 4], prepared: [4, 5, 6, 7, 9, 10], spellbook: true },
    resources: [{ id: "arcane-recovery", name: "Arcane Recovery", max: 1, reset: "long" }],
    levels: {
      1: { features: [
          { name: "Spellcasting", text: "Cast Wizard spells using Intelligence. Your spellbook starts with six level 1 spells and gains two each level. Prepare spells from your book after a Long Rest. Swap one cantrip after a Long Rest. Focus: Arcane Focus or spellbook." },
          { name: "Ritual Adept", text: "Cast any Ritual spell in your spellbook as a Ritual without preparing it." },
          { name: "Arcane Recovery", text: "On a Short Rest, recover spell slots with a combined level up to half your Wizard level (round up). Once per Long Rest." },
        ] },
      2: { features: [{ name: "Scholar", text: "Expertise in one of: Arcana, History, Investigation, Medicine, Nature, or Religion (must be proficient)." }],
        choices: [{ id: "scholar", type: "expertise", count: 1, from: ["Arcana", "History", "Investigation", "Medicine", "Nature", "Religion"] }] },
      3: { features: [SUBCLASS_FEATURE("Wizard")], choices: [{ id: "subclass", type: "subclass" }] },
      4: { features: [ASI(4)], choices: [{ id: "asi", type: "asi" }] },
      5: { features: [{ name: "Memorize Spell", text: "On a Short Rest, swap one prepared level 1+ spell for another from your spellbook." }] },
      6: { features: [{ name: "Subclass feature", text: "Gain your subclass's level 6 feature." }] },
    } },
];

// ---------------------------------------------------------------------------
// Subclasses (one per class in the SRD — add homebrew ones in data/campaign.js)
// `alwaysPrepared` = { classLevel: [spell names] }
// ---------------------------------------------------------------------------
SRD.subclasses = [
  { id: "berserker", classId: "barbarian", name: "Path of the Berserker",
    blurb: "Channel Rage into violent fury.",
    levels: {
      3: { features: [{ name: "Frenzy", text: "If you Reckless Attack while raging, the first target you hit on your turn with a Strength attack takes extra damage: roll d6s equal to your Rage Damage bonus." }] },
      6: { features: [{ name: "Mindless Rage", text: "Immune to Charmed and Frightened while raging. Entering Rage ends those conditions on you. A vampire's gaze means nothing to you." }] },
    } },
  { id: "lore", classId: "bard", name: "College of Lore",
    blurb: "Collect spells and secrets from every source.",
    levels: {
      3: { features: [
          { name: "Bonus Proficiencies", text: "Gain proficiency in three skills of your choice." },
          { name: "Cutting Words", text: "Reaction when a creature within 60 ft makes a damage roll or succeeds on an ability check or attack roll: spend Bardic Inspiration, roll it, and subtract it from their roll." },
        ],
        choices: [{ id: "lore-skills", type: "skills", count: 3 }] },
      6: { features: [{ name: "Magical Discoveries", text: "Learn two spells from the Cleric, Druid, or Wizard lists (cantrip or a level you have slots for). Always prepared." }],
        choices: [{ id: "discoveries", type: "spells", label: "Magical Discoveries", lists: ["Cleric", "Druid", "Wizard"], level: "slot", count: 2 }] },
    } },
  { id: "life", classId: "cleric", name: "Life Domain",
    blurb: "Soothe the hurts of the world.",
    alwaysPrepared: { 3: ["Aid", "Bless", "Cure Wounds", "Lesser Restoration"], 5: ["Mass Healing Word", "Revivify"] },
    levels: {
      3: { features: [
          { name: "Disciple of Life", text: "When a spell you cast with a slot restores HP, the creature regains an extra 2 + slot level HP." },
          { name: "Life Domain Spells", text: "Always prepared: Aid, Bless, Cure Wounds, Lesser Restoration (level 3); Mass Healing Word, Revivify (level 5)." },
          { name: "Preserve Life", text: "Channel Divinity, Magic action: restore 5 x Cleric level HP divided among Bloodied creatures within 30 ft (up to half their max)." },
        ] },
      6: { features: [{ name: "Blessed Healer", text: "Right after you cast a slot spell that heals someone other than you, you regain 2 + slot level HP." }] },
    } },
  { id: "land", classId: "druid", name: "Circle of the Land",
    blurb: "Celebrate connection to the natural world.",
    levels: {
      3: { features: [
          { name: "Circle of the Land Spells", text: "After each Long Rest choose a land: arid, polar, temperate or tropical. You have its spells prepared. Change it on the Spells tab." },
          { name: "Land's Aid", text: "Magic action, spend a Wild Shape use: 10-ft-radius Sphere within 60 ft. Creatures of your choice make a CON save or take 2d6 Necrotic (half on success), and one creature regains 2d6 HP." },
        ],
        choices: [{ id: "land", type: "pick", label: "Land type (changeable after a Long Rest)", count: 1, options: [
          { name: "Arid", text: "Blur, Burning Hands, Fire Bolt; Fireball at level 5." },
          { name: "Polar", text: "Fog Cloud, Hold Person, Ray of Frost; Sleet Storm at level 5." },
          { name: "Temperate", text: "Misty Step, Shocking Grasp, Sleep; Lightning Bolt at level 5." },
          { name: "Tropical", text: "Acid Splash, Ray of Sickness, Web; Stinking Cloud at level 5." },
        ] }] },
      6: { features: [{ name: "Natural Recovery", text: "Cast one prepared Circle spell (level 1+) without a slot once per Long Rest. On a Short Rest, recover slots with combined level up to half your Druid level (round up), once per Long Rest." }] },
    },
    landSpells: {
      Arid: { 3: ["Blur", "Burning Hands", "Fire Bolt"], 5: ["Fireball"] },
      Polar: { 3: ["Fog Cloud", "Hold Person", "Ray of Frost"], 5: ["Sleet Storm"] },
      Temperate: { 3: ["Misty Step", "Shocking Grasp", "Sleep"], 5: ["Lightning Bolt"] },
      Tropical: { 3: ["Acid Splash", "Ray of Sickness", "Web"], 5: ["Stinking Cloud"] },
    },
    resources: [{ id: "natural-recovery", name: "Natural Recovery", max: 1, reset: "long", minLevel: 6 }] },
  { id: "champion", classId: "fighter", name: "Champion",
    blurb: "Pursue physical excellence in combat.",
    levels: {
      3: { features: [
          { name: "Improved Critical", text: "Your weapon and Unarmed Strike attacks score a Critical Hit on a 19 or 20." },
          { name: "Remarkable Athlete", text: "Advantage on Initiative and Strength (Athletics) checks. After a Critical Hit, move up to half your Speed without provoking Opportunity Attacks." },
        ] },
    } },
  { id: "open-hand", classId: "monk", name: "Warrior of the Open Hand",
    blurb: "Master unarmed combat techniques.",
    resources: [{ id: "wholeness", name: "Wholeness of Body", max: "mod:wis", reset: "long", minLevel: 6 }],
    levels: {
      3: { features: [{ name: "Open Hand Technique", text: "When you hit with a Flurry of Blows attack, choose one: Addle (no Opportunity Attacks until its next turn), Push (STR save or pushed 15 ft), or Topple (DEX save or Prone)." }] },
      6: { features: [{ name: "Wholeness of Body", text: "Bonus Action: roll your Martial Arts die and regain that many HP + WIS mod (min 1). Uses = WIS mod (min 1) per Long Rest." }] },
    } },
  { id: "devotion", classId: "paladin", name: "Oath of Devotion",
    blurb: "Uphold the ideals of justice and order.",
    alwaysPrepared: { 3: ["Protection from Evil and Good", "Shield of Faith"], 5: ["Aid", "Zone of Truth"] },
    levels: {
      3: { features: [
          { name: "Oath of Devotion Spells", text: "Always prepared: Protection from Evil and Good, Shield of Faith (level 3); Aid, Zone of Truth (level 5). Protection from Evil and Good is a vampire hunter's best friend." },
          { name: "Sacred Weapon", text: "When you take the Attack action, spend Channel Divinity: for 10 minutes add your CHA mod (min +1) to attack rolls with one melee weapon, and it can deal Radiant damage. It sheds Bright Light 20 ft." },
        ] },
    } },
  { id: "hunter", classId: "ranger", name: "Hunter",
    blurb: "Protect nature and people from destruction.",
    levels: {
      3: { features: [
          { name: "Hunter's Lore", text: "While a creature is marked by your Hunter's Mark, you know its Immunities, Resistances and Vulnerabilities." },
          { name: "Hunter's Prey", text: "Choose one; swap it on any Short or Long Rest. Colossus Slayer: once per turn, +1d8 weapon damage to a target missing any HP. Horde Breaker: once per turn, make another attack with the same weapon against a different creature within 5 ft of the first target." },
        ],
        choices: [{ id: "prey", type: "pick", label: "Hunter's Prey", count: 1, options: [
          { name: "Colossus Slayer", text: "Once per turn, +1d8 weapon damage to a creature missing any HP." },
          { name: "Horde Breaker", text: "Once per turn, one extra attack against a different creature within 5 ft of your target." },
        ] }] },
    } },
  { id: "thief", classId: "rogue", name: "Thief",
    blurb: "Hunt for treasure as a classic adventurer.",
    levels: {
      3: { features: [
          { name: "Fast Hands", text: "Bonus Action: a Sleight of Hand check (pick a lock, disarm a trap, pick a pocket), the Utilize action, or the Magic action to use a magic item." },
          { name: "Second-Story Work", text: "Climb Speed equal to your Speed, and you can use DEX instead of STR to determine your jump distance." },
        ] },
    } },
  { id: "draconic", classId: "sorcerer", name: "Draconic Sorcery",
    blurb: "Breathe the magic of dragons.",
    alwaysPrepared: { 3: ["Alter Self", "Chromatic Orb", "Command", "Dragon's Breath"], 5: ["Fear", "Fly"] },
    hpFromLevel3: true,
    levels: {
      3: { features: [
          { name: "Draconic Resilience", text: "Your HP maximum increases by 3, plus 1 per Sorcerer level after 3 (already added). Without armor, your AC = 10 + DEX mod + CHA mod." },
          { name: "Draconic Spells", text: "Always prepared: Alter Self, Chromatic Orb, Command, Dragon's Breath (level 3); Fear, Fly (level 5)." },
        ] },
      6: { features: [{ name: "Elemental Affinity", text: "Choose Acid, Cold, Fire, Lightning or Poison: you have Resistance to it, and add your CHA mod to one damage roll of spells that deal that type." }],
        choices: [{ id: "affinity", type: "pick", label: "Elemental Affinity", count: 1, options: [{ name: "Acid" }, { name: "Cold" }, { name: "Fire" }, { name: "Lightning" }, { name: "Poison" }] }] },
    } },
  { id: "fiend", classId: "warlock", name: "Fiend Patron",
    blurb: "Make a deal with the Lower Planes.",
    alwaysPrepared: { 3: ["Burning Hands", "Command", "Scorching Ray", "Suggestion"], 5: ["Fireball", "Stinking Cloud"] },
    resources: [{ id: "own-luck", name: "Dark One's Own Luck", max: "mod:cha", reset: "long", minLevel: 6 }],
    levels: {
      3: { features: [
          { name: "Dark One's Blessing", text: "When you (or someone within 10 ft of you) reduce an enemy to 0 HP, gain Temp HP = CHA mod + Warlock level (min 1)." },
          { name: "Fiend Spells", text: "Always prepared: Burning Hands, Command, Scorching Ray, Suggestion (level 3); Fireball, Stinking Cloud (level 5)." },
        ] },
      6: { features: [{ name: "Dark One's Own Luck", text: "Add 1d10 to an ability check or saving throw after seeing the roll. Uses = CHA mod (min 1) per Long Rest, once per roll." }] },
    } },
  { id: "evoker", classId: "wizard", name: "Evoker",
    blurb: "Create explosive elemental effects.",
    levels: {
      3: { features: [
          { name: "Evocation Savant", text: "Add two Wizard Evocation spells (level 2 or lower) to your spellbook for free. Each time you gain a new level of spell slots, add one more Evocation spell free." },
          { name: "Potent Cantrip", text: "When a creature avoids your damaging cantrip (miss or successful save), it still takes half damage but no extra effect." },
        ],
        choices: [{ id: "savant", type: "spells", label: "Evocation Savant (free spellbook spells)", lists: ["Wizard"], maxLevel: 2, count: 2, filter: "evocation", target: "spellbook" }] },
      5: { features: [{ name: "Evocation Savant", text: "New level 3 slots: add one free Evocation spell to your spellbook." }],
        choices: [{ id: "savant5", type: "spells", label: "Evocation Savant (free spellbook spell)", lists: ["Wizard"], maxLevel: 3, count: 1, filter: "evocation", target: "spellbook" }] },
      6: { features: [{ name: "Sculpt Spells", text: "When you cast an Evocation spell, choose 1 + spell level creatures you can see. They automatically succeed on their saves against it and take no damage instead of half." }] },
    } },
];

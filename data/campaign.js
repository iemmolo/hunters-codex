// =============================================================================
// CAMPAIGN DATA — this is YOUR file. Edit freely.
//
// After editing: commit + push to GitHub. Players get the new version next time
// they open the app with internet (they may need to close and reopen it once).
//
// ---------------------------------------------------------------------------
// TEXT PLACEHOLDERS you can use in any reward `text`:
//   {dc}     Hunter's DC      = 8 + proficiency bonus + the character's highest ability modifier
//   {atk}    Hunter's attack  = proficiency bonus + highest ability modifier (shown as +N)
//   {pb}     proficiency bonus
//   {level}  character level
//   {level5} 5 x character level
//   {anyKey} any key you define in `scale` — the value for the character's current level.
//            e.g. scale: { dmg: { 1: "1d6", 5: "2d6" } }  ->  "{dmg}" shows 1d6 at levels 1-4, 2d6 from 5.
//
// USES: { max: 1 | 3 | "pb", reset: "long" | "short" | "never" }   ("never" = single use, gone once spent)
//
// Relic spells don't need spell slots and anyone can use them — fighters included.
// =============================================================================

window.CAMPAIGN = {
  title: "Hunter's Codex",
  maxLevel: 6,

  quests: [
    { n: 1, title: "Quest I" },
    { n: 2, title: "Quest II" },
    { n: 3, title: "Quest III" },
    { n: 4, title: "Quest IV" },
    { n: 5, title: "Quest V" },
    { n: 6, title: "Quest VI" },
  ],

  // ---------------------------------------------------------------------------
  // QUEST REWARDS — players type the code into the app to claim one.
  // Tiered for a party levelling 1 -> 6 (quest 1 ~ level 2, quest 6 ~ level 6 finale).
  // type: "weapon" | "spell" | "item"
  // weapon: `base` = an SRD weapon name (damage/properties/mastery copied from it), `bonus` = +N magic.
  // item:   `acBonus` adds to AC while the item is equipped (e.g. a magic shield).
  // ---------------------------------------------------------------------------
  rewards: [
    // ======================= QUEST I (party ~level 2) =======================
    { id: "whitethorn-stake", quest: 1, code: "HAWTHORN", type: "weapon", rarity: "Uncommon",
      name: "Whitethorn Stake", base: "Dagger", bonus: 0,
      scale: { rad: { 1: "1d4", 5: "1d6" } },
      text: "Hawthorn, soaked a full night in holy water. Counts as a wooden stake. Hits against Undead deal an extra {rad} Radiant.\n\nStaked: when you hit a Bloodied vampire or vampire spawn with it in melee, the creature can't regain Hit Points (Regeneration included) until the end of its next turn." },
    { id: "vigil", quest: 1, code: "VIGILBOLT", type: "weapon", rarity: "Uncommon",
      name: "Vigil, the Silvered Crossbow", base: "Hand Crossbow", bonus: 0,
      uses: { max: 1, reset: "short" },
      scale: { holy: { 1: "1d8", 5: "2d8" } },
      text: "Fires silvered bolts.\n\nShape-Lock: a creature hit by Vigil can't change shape (bat, wolf or mist forms included) until the end of its next turn.\n\nHoly Bolt (1/short rest): when you hit, deal an extra {holy} Radiant." },
    { id: "matins", quest: 1, code: "MATINBELL", type: "weapon", rarity: "Uncommon",
      name: "Matins", base: "Mace", bonus: 0,
      uses: { max: 1, reset: "long" },
      scale: { rad: { 1: "1d4", 5: "1d6" } },
      text: "A chapel mace with a small iron bell in its head. Hits against Undead deal an extra {rad} Radiant.\n\nToll (1/long rest, Bonus Action): each Undead of your choice within 30 ft makes a WIS save (DC {dc}). On a failure it can't take Reactions and has Disadvantage on its next attack roll before the end of your next turn." },
    { id: "threshold-ward", quest: 1, code: "THRESHOLD", type: "spell", rarity: "Relic Spell",
      name: "Threshold Ward",
      uses: { max: 1, reset: "long" },
      text: "Casting time: 1 minute. Touch a door, window or other opening.\n\nFor 8 hours, an Undead must succeed on a CHA save (DC {dc}) to pass through it. You wake up and know which ward it was whenever one tries. Each creature can only try once per night." },
    { id: "spark-of-dawn", quest: 1, code: "FIRSTLIGHT", type: "spell", rarity: "Relic Spell",
      name: "Spark of Dawn",
      uses: { max: "pb", reset: "long" },
      scale: { dmg: { 1: "2d6", 3: "3d6", 5: "4d6" } },
      text: "Action. A mote of daylight strikes one creature you can see within 60 ft. DEX save (DC {dc}) or take {dmg} Radiant.\n\nAn Undead that fails sheds Dim Light in 5 ft and can't become Invisible until the end of its next turn." },
    { id: "litany", quest: 1, code: "LITANY", type: "spell", rarity: "Relic Spell",
      name: "Litany Against the Bite",
      uses: { max: 1, reset: "short" },
      text: "Bonus Action. You and up to {pb} allies within 30 ft have Advantage on saves against being Charmed or Frightened for 1 minute.\n\nAny target that is already Charmed immediately repeats the save with Advantage." },

    // ======================= QUEST II (party ~level 3) ======================
    { id: "gravewarden", quest: 2, code: "GRAVEWARDEN", type: "weapon", rarity: "Uncommon",
      name: "Gravewarden", base: "Longsword", bonus: 0,
      scale: { rad: { 1: "1d6", 5: "1d8" } },
      text: "A silvered sexton's blade. Hits against Undead deal an extra {rad} Radiant.\n\nNo Escape: when an Undead within your reach tries to leave it (walking, Disengaging, teleporting or turning to mist), you can use your Reaction to make an Opportunity Attack against it." },
    { id: "thornbow", quest: 2, code: "BRIARSHOT", type: "weapon", rarity: "Uncommon",
      name: "Thornbow", base: "Shortbow", bonus: 0,
      uses: { max: "pb", reset: "long" },
      text: "Living briarwood. Arrows fired from it count as wooden stakes.\n\nBriar Shot (PB/long rest): when you hit, thorns burst from the wound. The target's Speed drops by 10 ft and it can't fly or climb until the end of its next turn." },
    { id: "thurible", quest: 2, code: "THURIBLE", type: "weapon", rarity: "Uncommon",
      name: "The Thurible", base: "Flail", bonus: 0,
      uses: { max: 1, reset: "long" },
      scale: { dmg: { 1: "1d6", 5: "2d6" } },
      text: "A censer on a chain, still smoking.\n\nHoly Smoke (1/long rest, Bonus Action): a 10-ft Emanation of incense surrounds you for 1 minute. An Undead that starts its turn in it takes {dmg} Radiant and can't take Reactions until the start of its next turn." },
    { id: "ash-step", quest: 2, code: "ASHSTEP", type: "spell", rarity: "Relic Spell",
      name: "Ash Step",
      uses: { max: "pb", reset: "long" },
      text: "Bonus Action. Teleport up to 30 ft to an unoccupied space you can see, leaving a puff of grave-ash behind.\n\nIf you arrive within 5 ft of an Undead, your next attack against it this turn has Advantage." },
    { id: "unmasking-mirror", quest: 2, code: "NOREFLECTION", type: "spell", rarity: "Relic Spell",
      name: "Unmasking Mirror",
      uses: { max: 1, reset: "long" },
      text: "Action. Flash a mirror across a 30-ft Cone.\n\nInvisible creatures in the cone are revealed and illusions are seen for what they are. A shapechanged creature makes a CHA save (DC {dc}) or reverts to its true form and can't change shape for 1 minute.\n\nCreatures that cast no reflection (vampires and their kin) glow with pale light, and attacks against them have Advantage until the end of your next turn." },
    { id: "salt-circle", quest: 2, code: "SALTLINE", type: "spell", rarity: "Relic Spell",
      name: "Salt Circle",
      uses: { max: 1, reset: "long" },
      text: "Casting time: 1 minute. Pour a 10-ft-radius circle of blessed salt.\n\nFor 1 hour, Undead and Fiends can't willingly enter the circle unless they succeed on a CHA save (DC {dc}). Creatures inside have Resistance to Necrotic damage. A creature can scuff the line as an action to end it early." },

    // ======================= QUEST III (party ~level 4) =====================
    { id: "penitent", quest: 3, code: "PENITENT", type: "weapon", rarity: "Rare",
      name: "Penitent", base: "Greatsword", bonus: 1,
      text: "+1 greatsword wrapped in prayer-cord.\n\nAgainst a Bloodied Undead, you score a Critical Hit on a 19 or 20.\n\nAn Undead hit by Penitent can't regenerate until the start of your next turn." },
    { id: "dusk-and-dawn", quest: 3, code: "DUSKDAWN", type: "weapon", rarity: "Rare",
      name: "Dusk & Dawn (pair)", base: "Shortsword", bonus: 1,
      scale: { dmg: { 1: "1d8", 5: "2d8" } },
      text: "Two +1 shortswords, one black and one white.\n\nIf you hit the same creature with both blades in one turn, it takes an extra {dmg} Radiant and can't regain Hit Points until the start of your next turn." },
    { id: "rosary-chain", quest: 3, code: "ROSARY", type: "weapon", rarity: "Rare",
      name: "Rosary Chain", base: "Whip", bonus: 1,
      scale: { rad: { 1: "1d4", 5: "1d6" } },
      text: "A +1 whip of silver rosary links.\n\nWhen you hit a Large or smaller creature, you can also Grapple it from 10 ft away (escape DC {dc}). An Undead held by the chain can't teleport, turn to mist or change shape, and takes {rad} Radiant at the start of each of its turns." },
    { id: "lance-of-morning", quest: 3, code: "MORNINGLANCE", type: "spell", rarity: "Relic Spell",
      name: "Lance of Morning",
      uses: { max: 1, reset: "long" },
      scale: { dmg: { 1: "3d8", 5: "4d8" } },
      text: "Action. A beam of sunrise in a 60-ft Line, 5 ft wide. Each creature in it makes a DEX save (DC {dc}): {dmg} Radiant on a failure, half on a success.\n\nUndead have Disadvantage on this save." },
    { id: "hallowed-ground", quest: 3, code: "HALLOWED", type: "spell", rarity: "Relic Spell",
      name: "Hallowed Ground",
      uses: { max: 1, reset: "long" },
      text: "Casting time: 10 minutes. Consecrate a 30-ft-radius area for 24 hours.\n\nUndead in the area have Disadvantage on attack rolls and can't regenerate. You and your allies in it have Advantage on saves against being Charmed or Frightened.\n\nThe perfect place to make a stand." },
    { id: "severance", quest: 3, code: "SEVERANCE", type: "spell", rarity: "Relic Spell",
      name: "Severance",
      uses: { max: 1, reset: "long" },
      text: "Action, touch a creature.\n\nEnd the Charmed condition on it and undo any bite effect (restore Hit Point maximum lost to an Undead). It is immune to being Charmed by that same source for 24 hours.\n\nFor the next hour you know the direction to the creature that charmed or bit it." },

    // ======================= QUEST IV (party ~level 5) ======================
    { id: "stakethrower", quest: 4, code: "STAKETHROWER", type: "weapon", rarity: "Rare",
      name: "The Stakethrower", base: "Heavy Crossbow", bonus: 1,
      uses: { max: 1, reset: "short" },
      text: "A +1 heavy crossbow that fires ironwood stakes. They count as wooden stakes.\n\nImpale (1/short rest): when you hit, the stake pins the target to a nearby surface. It is Restrained until it or an ally uses an action to pull free with a STR check (DC {dc}). A pinned Undead can't regenerate." },
    { id: "lantern-halberd", quest: 4, code: "LANTERNHALBERD", type: "weapon", rarity: "Rare",
      name: "Lantern Halberd", base: "Halberd", bonus: 1,
      uses: { max: 1, reset: "long" },
      scale: { dmg: { 1: "3d6", 5: "4d6" } },
      text: "A +1 halberd with a hooded lantern on the haft (Bright Light 20 ft when open).\n\nSunburst (1/long rest, Bonus Action): throw open the shutters. A 30-ft Cone of real sunlight lasts until the start of your next turn. Undead in it make a CON save (DC {dc}), taking {dmg} Radiant on a failure or half on a success. Vampires also suffer their sunlight weakness." },
    { id: "twin-hatchets", quest: 4, code: "TWINHATCHETS", type: "weapon", rarity: "Rare",
      name: "Brother & Sister (hatchets)", base: "Handaxe", bonus: 1,
      text: "A pair of +1 handaxes. When thrown, each one flies back to your hand right after the attack.\n\nIf you hit the same creature with both in one turn, its Speed becomes 0 until the end of its next turn." },
    { id: "bottled-sunrise", quest: 4, code: "BOTTLEDSUN", type: "spell", rarity: "Relic Spell",
      name: "Bottled Sunrise",
      uses: { max: 1, reset: "long" },
      scale: { dmg: { 1: "2d6", 5: "3d6" } },
      text: "Action. Shatter the vial at a point within 60 ft. A 15-ft-radius Sphere of true sunlight fills the area for 1 minute (Concentration).\n\nAn Undead that starts its turn in the light takes {dmg} Radiant. Vampires also suffer their sunlight weakness. Magical Darkness of level 3 or lower in the area ends." },
    { id: "last-breath", quest: 4, code: "LASTBREATH", type: "spell", rarity: "Relic Spell",
      name: "Vow of the Last Breath",
      uses: { max: 1, reset: "long" },
      text: "No action needed. When you drop to 0 Hit Points but aren't killed outright, you drop to 1 Hit Point instead and can immediately make one weapon attack or cast a cantrip." },
    { id: "bloodhound", quest: 4, code: "BLOODHOUND", type: "spell", rarity: "Relic Spell",
      name: "Hound of the Hunt",
      uses: { max: 1, reset: "long" },
      text: "Action. Summon a spectral bloodhound for 1 hour. Give it a creature's blood, hair or belongings and it tracks that creature unerringly (Advantage on checks to follow it).\n\nHound: AC 14, HP {level5}, Speed 50 ft. Bite +{atk} to hit, 1d8 + {pb} Radiant. It acts on your Initiative; command it with a Bonus Action." },

    // ======================= QUEST V (party ~level 6) =======================
    { id: "mercy", quest: 5, code: "MERCYSTROKE", type: "weapon", rarity: "Very Rare",
      name: "Mercy", base: "Longsword", bonus: 1,
      uses: { max: 1, reset: "long" },
      scale: { dmg: { 1: "4d8", 6: "6d8" } },
      text: "The executioner's blade of an order long gone. +1 longsword.\n\nMercy Stroke (1/long rest): when you hit a Bloodied Undead, deal an extra {dmg} Radiant. If this reduces it to 0 HP, it is destroyed outright: no mist form, no reforming, no coffin." },
    { id: "aspergillum", quest: 5, code: "ASPERGILLUM", type: "weapon", rarity: "Very Rare",
      name: "The Aspergillum", base: "Mace", bonus: 1,
      uses: { max: 3, reset: "long" },
      text: "A +1 mace with a hollow head full of holy water. 3 charges; regains all at dawn.\n\nAnoint: when you hit, spend 1 charge. The target takes an extra 2d6 Radiant and can't regenerate until the end of its next turn.\n\nSprinkle: Action, spend 2 charges. Each Undead or Fiend in a 15-ft Cone makes a DEX save (DC {dc}): 4d6 Radiant on a failure, half on a success." },
    { id: "duskhunter", quest: 5, code: "DUSKHUNTER", type: "weapon", rarity: "Very Rare",
      name: "Duskhunter", base: "Longbow", bonus: 1,
      uses: { max: "pb", reset: "long" },
      text: "+1 longbow of black yew.\n\nBrand (PB/long rest): when you hit, brand the target for 1 minute. While branded it can't become Invisible or turn to mist, it sheds Dim Light in 10 ft, and attacks against it ignore its Resistance to Piercing and Slashing damage." },
    { id: "final-rest", quest: 5, code: "FINALREST", type: "spell", rarity: "Relic Spell",
      name: "Rite of Final Rest",
      uses: { max: 1, reset: "long" },
      text: "Action, touch an Undead. It makes a CON save (DC {dc}).\n\nFailure: it takes 6d8 Radiant, and if that leaves it with {level5} HP or fewer, it crumbles to dust. Success: half damage." },
    { id: "sanctum-of-dawn", quest: 5, code: "SANCTUM", type: "spell", rarity: "Relic Spell",
      name: "Sanctum of Dawn",
      uses: { max: 1, reset: "long" },
      text: "Casting time: 10 minutes. A 20-ft-radius dome of pale gold light stands for 8 hours. Undead can't enter it, and their spells and attacks can't pass into it.\n\nEach ally who finishes a Long Rest inside gains Temporary HP equal to {level} + {pb}." },
    { id: "reprisal", quest: 5, code: "REPRISAL", type: "spell", rarity: "Relic Spell",
      name: "Hunter's Reprisal",
      uses: { max: "pb", reset: "long" },
      text: "Reaction when a creature you can see within 60 ft hits one of your allies. Teleport to an unoccupied space within 5 ft of the attacker and make one weapon attack against it with Advantage." },

    // ======================= QUEST VI (finale, level 6) =====================
    { id: "daybringer", quest: 6, code: "DAYBRINGER", type: "weapon", rarity: "Legendary",
      name: "Daybringer", base: "Greatsword", bonus: 2,
      uses: { max: 1, reset: "long" },
      scale: { rad: { 1: "1d8", 5: "2d8" } },
      text: "A +2 greatsword that glows like a sunrise (Bright Light 15 ft). Hits against Undead deal an extra {rad} Radiant.\n\nDaybreak (1/long rest, Bonus Action): plant the blade in the ground. True sunlight fills a 20-ft radius around it for 1 minute or until someone pulls it out." },
    { id: "heartwood-stake", quest: 6, code: "HEARTWOOD", type: "weapon", rarity: "Legendary (single use)",
      name: "The Heartwood Stake", base: "Dagger", bonus: 2,
      uses: { max: 1, reset: "never" },
      text: "Cut from the first tree to grow on consecrated ground. One use.\n\nMake a melee attack with it against an Undead, with Advantage. On a hit it takes 6d6 Radiant. If the target is a vampire and is Bloodied after this damage, the stake lodges in its heart: it is Paralyzed until another creature uses an action to pull the stake out." },
    { id: "aegis", quest: 6, code: "AEGIS", type: "item", rarity: "Very Rare",
      name: "Aegis of the Unbroken", acBonus: 3, slot: "shield",
      uses: { max: 1, reset: "long" },
      text: "A +1 Shield (+3 AC total while equipped).\n\nYou and allies within 10 ft have Advantage on saves against being Charmed.\n\nBastion (1/long rest, Reaction when an ally within 10 ft takes damage): halve that damage, and you and that ally gain Resistance to Necrotic damage until the end of your next turn." },
    { id: "unbound-sunrise", quest: 6, code: "SUNRISE", type: "spell", rarity: "Relic Spell (once ever)",
      name: "Sunrise Unbound",
      uses: { max: 1, reset: "never" },
      text: "Action. For 1 minute, true sunlight fills a 60-ft radius around you and moves with you (no Concentration).\n\nUndead that start their turn in it make a CON save (DC {dc}): 6d10 Radiant on a failure, half on a success. Vampires also suffer their sunlight weakness. Your allies in the light are immune to Charmed and Frightened." },
    { id: "true-name", quest: 6, code: "TRUENAME", type: "spell", rarity: "Relic Spell",
      name: "The Spoken Name",
      uses: { max: 1, reset: "long" },
      text: "Action. Speak the true name of a creature you have learned it for. The creature must be able to hear you.\n\nFor 1 minute it has Disadvantage on saving throws, can't use Legendary Resistance, and can't teleport or turn to mist." },
    { id: "second-dawn", quest: 6, code: "SECONDDAWN", type: "spell", rarity: "Relic Spell (once ever)",
      name: "Second Dawn",
      uses: { max: 1, reset: "never" },
      text: "Action, touch a creature that died within the last minute (not of old age).\n\nIt returns to life with half its Hit Points and is cured of any curse, charm or vampiric bite. If a vampire killed it, it can never be raised as a spawn." },
  ],

  // ---------------------------------------------------------------------------
  // SHOP GEAR — anyone can add these to their inventory from the Gear tab.
  // ---------------------------------------------------------------------------
  gear: [
    { name: "Holy Water (flask)", cost: "25 GP", text: "Action: throw at a creature within 20 ft. DEX save (DC 8 + DEX mod + PB) or 2d8 Radiant if it's a Fiend or Undead." },
    { name: "Wooden Stake", cost: "1 SP", text: "Sharpened hawthorn or ash. A pinned vampire is helpless while it stays in their heart (DM's call on when it works)." },
    { name: "Garlic (bundle)", cost: "1 CP", text: "Old wisdom says vampires hate it. The DM decides if it's true." },
    { name: "Steel Mirror", cost: "5 GP", text: "Vampires cast no reflection. Hold it up and see." },
    { name: "Silvering (one weapon)", cost: "100 GP", text: "A silvered weapon overcomes creatures that resist non-silvered attacks." },
    { name: "Silvered Ammunition (10)", cost: "100 GP", text: "Ten arrows, bolts or bullets coated in silver." },
    { name: "Holy Symbol", cost: "5 GP", text: "Amulet, emblem or reliquary. Spellcasting focus for Clerics and Paladins." },
    { name: "Potion of Healing", cost: "50 GP", text: "Bonus Action to drink: regain 2d4 + 2 HP." },
    { name: "Alchemist's Fire", cost: "50 GP", text: "Action: throw within 20 ft. DEX save (DC 8 + DEX mod + PB) or 1d4 Fire and Burning." },
    { name: "Oil (flask)", cost: "1 SP", text: "Douse a creature or a 5-ft area. Fire damage +5 on oiled targets, or burns for 2 rounds on the ground." },
    { name: "Lantern, Hooded", cost: "5 GP", text: "Bright Light 30 ft, Dim 30 ft more. Burns 6 hours on a flask of oil. Shutter it to dim." },
    { name: "Torch", cost: "1 CP", text: "Bright Light 20 ft, Dim 20 ft more, 1 hour. Can be used as a club that deals Fire damage." },
    { name: "Healer's Kit", cost: "5 GP", text: "10 uses. Utilize action: stabilize a creature at 0 HP without a check." },
    { name: "Manacles", cost: "2 GP", text: "Bind a Small or Medium creature. Escape DC 20 (DEX) or break DC 25 (STR)." },
    { name: "Chain (10 ft)", cost: "5 GP", text: "Bind a creature. Break it with a DC 20 STR check." },
    { name: "Crowbar", cost: "2 GP", text: "Advantage on STR checks where leverage helps. Also good for coffin lids." },
    { name: "Rope (50 ft)", cost: "1 GP", text: "Tie knots, climb, bind. Burst DC 20 (STR)." },
    { name: "Caltrops (bag)", cost: "1 GP", text: "Cover a 5-ft square. Creatures entering make a DEX save (DC 15) or take 1 Piercing and stop moving." },
    { name: "Thieves' Tools", cost: "25 GP", text: "Pick locks and disarm traps." },
    { name: "Explorer's Pack", cost: "10 GP", text: "Backpack, bedroll, 2 flasks of oil, 10 days of rations, rope, tinderbox, torches, waterskin." },
  ],

  // ---------------------------------------------------------------------------
  // HOMEBREW BACKGROUNDS (added alongside the four SRD ones)
  // abilities: the three abilities the +2/+1 or +1/+1/+1 can go into.
  // feat: an id from SRD.feats or CAMPAIGN.feats below.
  // ---------------------------------------------------------------------------
  backgrounds: [
    { id: "grave-warden", name: "Grave Warden (homebrew)", abilities: ["str", "con", "wis"], feat: "alert",
      skills: ["Religion", "Perception"], tool: "Mason's Tools",
      equipment: "Shovel, Lantern, Holy Symbol, Mason's Tools, Traveler's Clothes, 10 GP — or 50 GP",
      blurb: "You kept the dead in the ground, and learned what to watch for when they don't stay there." },
    { id: "survivor", name: "Bitten Survivor (homebrew)", abilities: ["dex", "con", "cha"], feat: "skilled",
      skills: ["Insight", "Stealth"], tool: "Herbalism Kit",
      equipment: "Herbalism Kit, Steel Mirror, 3 Wooden Stakes, Dark Cloak, 12 GP — or 50 GP",
      blurb: "A vampire fed on you once. You lived. You remember the voice, and you've stopped trusting charming strangers." },
    { id: "hunters-apprentice", name: "Hunter's Apprentice (homebrew)", abilities: ["str", "dex", "wis"], feat: "savage-attacker",
      skills: ["Survival", "Religion"], tool: "Tinker's Tools",
      equipment: "Hand Crossbow, 20 Bolts, 2 Wooden Stakes, Holy Water, Traveler's Clothes, 5 GP — or 50 GP",
      blurb: "You carried the bags of an old hunter until the night they didn't come back." },
  ],

  // ---------------------------------------------------------------------------
  // HOMEBREW FEATS (offered alongside the SRD feats)
  // category: "origin" (backgrounds/Human) or "general" (level 4+ ASI choice)
  // ---------------------------------------------------------------------------
  feats: [
    { id: "vampire-slayer", name: "Vampire Slayer (homebrew)", category: "general", minLevel: 4,
      text: "+1 to Strength, Dexterity or Wisdom. Advantage on saves against being Charmed by Undead. Once per turn when you hit an Undead with a weapon, deal an extra 1d6 Radiant.",
      choices: [{ id: "slayer-asi", type: "ability", label: "+1 to", from: ["str", "dex", "wis"] }] },
    { id: "blessed-blood", name: "Blessed Blood (homebrew)", category: "origin",
      text: "Your blood is poison to the undead. A creature that drinks your blood or bites you takes 2d6 Radiant. You have Resistance to Necrotic damage." },
  ],
};

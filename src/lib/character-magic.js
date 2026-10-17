export const castingAbilities = [
  { id: "str", name: "Força" },
  { id: "dex", name: "Destreza" },
  { id: "con", name: "Constituição" },
  { id: "int", name: "Inteligência" },
  { id: "wis", name: "Sabedoria" },
  { id: "cha", name: "Carisma" },
];
export const signed = (value) => (value >= 0 ? `+${value}` : String(value));
export function magicPreview(form) {
  const level = Number(form.level),
    score = Number(form.spellcastingScore);
  if (
    !form.spellcastingAbility ||
    form.spellcastingScore === "" ||
    !Number.isInteger(score) ||
    score < 1 ||
    score > 30 ||
    !Number.isInteger(level) ||
    level < 1 ||
    level > 20
  )
    return null;
  const proficiencyBonus = 2 + Math.floor((level - 1) / 4),
    spellcastingModifier = Math.floor((score - 10) / 2);
  return {
    ...form,
    proficiencyBonus,
    spellcastingModifier,
    spellSaveDc: 8 + proficiencyBonus + spellcastingModifier,
    spellAttackBonus: proficiencyBonus + spellcastingModifier,
  };
}

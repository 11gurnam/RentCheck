import regions from "./india.json";
export const indianStates = regions;
export function canonicalCity(name:string,state:string){
  const plain=name.replace(/\s+(Municipal Corporation|Municipal Council|Municipality|Tehsil)$/i,"").trim();
  return regions.find(region=>region.name===state)?.cities.find(city=>city.toLowerCase()===plain.toLowerCase())??plain;
}
export function canonicalState(name: string) {
  const aliases: Record<string, string> = { "NCT of Delhi": "Delhi", "National Capital Territory of Delhi": "Delhi", "Orissa": "Odisha", "Uttaranchal": "Uttarakhand" };
  const value = aliases[name] ?? name;
  return regions.find(state => state.name.toLowerCase() === value.toLowerCase())?.name ?? "";
}

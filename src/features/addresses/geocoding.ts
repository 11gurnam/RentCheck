import { canonicalState,canonicalCity } from "./india";
export type AddressResult={address:string;city:string;state:string;locality:string;postalCode:string;latitude:number;longitude:number};
/** Nearby reverse results may hold administrative fields omitted by the closest POI. */
export function completeReverseAddress(results:AddressResult[]):AddressResult[] {
 const first=results[0];if(!first)return results;
 const nearby=results.filter(result=>Math.abs(result.latitude-first.latitude)<0.01&&Math.abs(result.longitude-first.longitude)<0.01&&(!first.state||!result.state||first.state===result.state));
 const state=first.state||nearby.find(result=>result.state)?.state||"";
 const city=first.city||nearby.find(result=>result.city&&result.state===state)?.city||"";
 return [{...first,state,city},...results.slice(1)];
}
export function photonAddress(feature:{geometry?:{coordinates?:number[]};properties?:Record<string,string>}):AddressResult|null{
  const p=feature.properties??{},coords=feature.geometry?.coordinates;
  if(p.countrycode?.toUpperCase()!=="IN"||!coords||!Number.isFinite(coords[0])||!Number.isFinite(coords[1])||coords[1]<6||coords[1]>38||coords[0]<68||coords[0]>98)return null;
  const state=canonicalState(p.state??"");
  return {address:[p.housenumber,p.street||p.name,p.district,p.city||p.town||p.village].filter(Boolean).join(", "),city:canonicalCity(p.city||p.town||p.village||"",state),state,locality:p.district||p.locality||p.suburb||p.name||"",postalCode:/^[1-9]\d{5}$/.test(p.postcode??"")?p.postcode:"",latitude:coords[1],longitude:coords[0]};
}

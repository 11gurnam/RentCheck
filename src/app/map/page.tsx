import { AccountShell } from "@/components/ui/account-shell";
import { createDatabaseClient } from "@/lib/database/server";
import { RecordedMap, type MappedProperty } from "@/features/discovery/map";
import { ActionIcon } from "@/components/ui/action-feedback";
export default async function MapPage() {
  const db = await createDatabaseClient();
  const rows:MappedProperty[]=[];
  // Include public profiles without coordinates so every available city is searchable.
  for(let offset=0;;offset+=1000){
    const profiles=await db.from("property_discovery").select("id,name,is_demo,city,locality,address,property_type,rent_min,rent_max").order("name").order("id").range(offset,offset+999);
    if(profiles.error)throw new Error("Map profiles unavailable");
    if(!profiles.data.length)break;
    const locations=await db.from("property_locations").select("property_id,latitude,longitude,precision").in("property_id",profiles.data.map(p=>p.id));
    if(locations.error)throw new Error("Locations unavailable");
    const pins=new Map(locations.data.map(location=>[location.property_id,location]));
    rows.push(...profiles.data.map(profile=>{
      const location=pins.get(profile.id);
      return {...profile,latitude:location?Number(location.latitude):null,longitude:location?Number(location.longitude):null,precision:location?.precision??""};
    }));
    if(profiles.data.length<1000)break;
  }
  return <AccountShell><div className="map-page"><header className="map-page-heading"><div><p className="eyebrow">EXPLORE THE NEIGHBOURHOOD</p><h1>Find a place. Explore its surroundings.</h1><p>Find properties by name, city or neighbourhood. Choose a place to view its location.</p></div><a className="review-action" href="/search"><ActionIcon name="search"/>Browse all properties</a></header><RecordedMap properties={rows}/></div></AccountShell>;
}

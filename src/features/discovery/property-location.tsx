"use client";
import {useState} from "react";
import {PinMap} from "./pin-map";
export function PropertyLocation({name,latitude,longitude,precision}:{name:string;latitude?:number|null;longitude?:number|null;precision?:string|null}){
  const [open,setOpen]=useState(false);
  if(latitude==null||longitude==null)return <p className="field-hint">No map pin supplied for this place yet.</p>;
  return <section className="property-location" id="place-location"><h3>Location</h3><p>{precision==="approximate"?"Approximate area":"Shared property pin"} · <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}>Open {name} in Google Maps</a></p>{!open?<button className="secondary-button" type="button" onClick={()=>setOpen(true)}>Show location map</button>:<PinMap point={{latitude:Number(latitude),longitude:Number(longitude)}}/>}<p className="field-hint">Loading the map connects to OpenStreetMap. Confirm the address with the property before visiting.</p></section>;
}

"use client";
import {useState} from "react";
import {PinMap} from "./pin-map";
import {googleMapsUrl} from "./map-url";
import {InfoPopover} from "@/components/ui/info-popover";
export function PropertyLocation({name,latitude,longitude,precision}:{name:string;latitude?:number|null;longitude?:number|null;precision?:string|null}){
  const [open,setOpen]=useState(false);
  if(latitude==null||longitude==null)return <p className="field-hint">No map pin supplied for this place yet.</p>;
  return <section className="property-location" id="place-location"><div className="section-title"><h2>Location</h2><InfoPopover label="About this location">{precision==="approximate"?"This pin shows an approximate area.":"This pin was shared for the property."} Loading the map connects to OpenStreetMap.</InfoPopover></div><div className="property-map-actions"><a className="review-action" target="_blank" rel="noreferrer" href={googleMapsUrl(latitude,longitude)} aria-label={`Open ${name} in Google Maps`}>Open in Google Maps ↗</a>{!open&&<button className="secondary-button" type="button" onClick={()=>setOpen(true)}>Show location map</button>}</div>{open&&<PinMap point={{latitude:Number(latitude),longitude:Number(longitude)}}/>}<p className="field-hint">Confirm the address before visiting.</p></section>;
}

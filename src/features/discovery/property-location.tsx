"use client";
import {useState} from "react";
import {PinMap} from "./pin-map";
import {googleMapsUrl} from "./map-url";
import {InfoPopover} from "@/components/ui/info-popover";
export function PropertyLocation({name,city,state,latitude,longitude,precision}:{
  name:string;city:string;state:string;latitude:number;longitude:number;precision:string;
}){
  const [open,setOpen]=useState(false);
  const cityLevel=precision==="city";
  return <section className="property-location" id="place-location">
    <div className="section-title"><h2>Location</h2><InfoPopover label="About this location">{cityLevel?<>City coordinates come from <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a> (CC BY 4.0).</>:precision==="approximate"?"This pin shows an approximate area.":"This pin was shared for the property."} Loading the map connects to OpenStreetMap.</InfoPopover></div>
    {cityLevel&&<p className="field-hint">Approximate city pin · {city}, {state}. The marker shows the city centre.</p>}
    <div className="property-map-actions">
      <a className="review-action" target="_blank" rel="noreferrer" href={googleMapsUrl(latitude,longitude)}
        aria-label={`Open ${cityLevel ? city : name} in Google Maps`}>{cityLevel?"Open city in Google Maps":"Open in Google Maps"} ↗</a>
      {!open&&<button className="secondary-button" type="button" onClick={()=>setOpen(true)}>{cityLevel?"Show city map":"Show location map"}</button>}
    </div>
    {open&&<PinMap point={{latitude,longitude}} zoom={cityLevel?11:15}/>}
    <p className="field-hint">Confirm the address before visiting.</p>
  </section>;
}

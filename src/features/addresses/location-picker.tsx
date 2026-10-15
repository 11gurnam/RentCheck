"use client";
import { useEffect, useRef, useState } from "react";
import { PinMap, type MapPoint } from "@/features/discovery/pin-map";
import type { AddressResult } from "./geocoding";
export function LocationPicker({values,onChange}:{values:Record<string,string>;onChange:(values:Record<string,string>)=>void}) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[results,setResults]=useState<AddressResult[]>([]);
  const request=useRef<AbortController|null>(null),latest=useRef(values);
  useEffect(()=>{latest.current=values;},[values]);
  useEffect(()=>()=>request.current?.abort(),[]);
  const point=values.latitude&&values.longitude?{latitude:Number(values.latitude),longitude:Number(values.longitude)}:null;
  function addressValues(address:AddressResult,base:Record<string,string>,pin?:MapPoint) {
    return {...base,address:address.address,state:address.state,city:address.city,locality:address.locality,postalCode:address.postalCode,country:"India",latitude:String(pin?.latitude??address.latitude),longitude:String(pin?.longitude??address.longitude)};
  }
  async function lookup(pin?:MapPoint) {
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setBusy(true);setMessage("");setResults([]);const base=latest.current;
    const query=pin?new URLSearchParams({lat:String(pin.latitude),lon:String(pin.longitude)}):new URLSearchParams({q:[base.address,base.locality,base.city,base.state,"India"].filter(Boolean).join(", ")});
    try {
      const response=await fetch("/api/address?"+query,{signal:controller.signal});const data=await response.json();
      if(!response.ok)throw new Error(data.message);if(controller.signal.aborted)return;
      if(!data.results.length){setMessage("No address found. Enter the missing details yourself or move the pin.");return;}
      if(pin){const address=data.results[0] as AddressResult;onChange(addressValues(address,latest.current,pin));setMessage(`Address filled from the pin${address.city||address.state?` · ${[address.city,address.state].filter(Boolean).join(", ")}`:""}. Check the details and enter anything missing.`);}else setResults(data.results);
    }catch(error){if(!controller.signal.aborted)setMessage(error instanceof Error&&error.name==="Error"?error.message:"Address lookup unavailable. Enter the address yourself.");}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  function setPoint(pin:MapPoint) {
    if(pin.latitude<6||pin.latitude>38||pin.longitude<68||pin.longitude>98){request.current?.abort();setBusy(false);setMessage("Choose a location in India.");return;}
    latest.current={...latest.current,latitude:pin.latitude.toFixed(6),longitude:pin.longitude.toFixed(6),address:"",city:"",state:"",locality:"",postalCode:"",country:"India"};onChange(latest.current);void lookup(pin);
  }
  function locate() {
    if(!navigator.geolocation){setMessage("Location is unavailable. Place the pin yourself.");return;}setBusy(true);setMessage("");
    navigator.geolocation.getCurrentPosition(position=>setPoint({latitude:position.coords.latitude,longitude:position.coords.longitude}),()=>{setBusy(false);setMessage("Location access was denied or unavailable. You can still choose a pin yourself.");},{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
  }
  return <section className="location-picker wide"><h2>Where is this place?</h2><p className="field-hint">Select a pin to fill the address automatically. Map tiles use OpenStreetMap; address lookups send the pin or address to Photon.</p>
    {!open?<button type="button" className="secondary-button" onClick={()=>setOpen(true)}>Choose location on map</button>:<><div className="location-toolbar"><button type="button" className="secondary-button" disabled={busy} onClick={locate}>Use my location</button><button type="button" className="secondary-button" disabled={busy} onClick={()=>void lookup()}>Find address on map</button>{point&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>void lookup(point)}>Retry address lookup</button>}</div><PinMap point={point} onChange={setPoint}/><p className="field-hint">Click or move the pin. All address details remain editable below.</p><div className="coordinate-fields"><label>Latitude<input name="latitude" type="number" step="any" min="6" max="38" value={values.latitude??""} onChange={e=>onChange({...values,latitude:e.target.value})}/></label><label>Longitude<input name="longitude" type="number" step="any" min="68" max="98" value={values.longitude??""} onChange={e=>onChange({...values,longitude:e.target.value})}/></label></div></>}
    {busy&&<p role="status">Finding the address…</p>}{message&&<p role="status">{message}</p>}
    {results.length>0&&<div className="address-results" aria-label="Address matches">{results.map((result,i)=><button type="button" className="address-result" key={i} onClick={()=>{onChange(addressValues(result,latest.current));setResults([]);setMessage("Address filled. Check the details before saving.");}}>{result.address} · {result.city}, {result.state}{result.postalCode?` · ${result.postalCode}`:""}</button>)}</div>}
    {point&&<label className="checkbox-row"><input type="checkbox" name="shareLocation" checked={values.shareLocation==="on"} onChange={e=>onChange({...values,shareLocation:e.target.checked?"on":""})}/>Show this property pin on the public map.</label>}
  </section>;
}

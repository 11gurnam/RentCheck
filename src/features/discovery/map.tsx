"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {ExplorerMap} from "./explorer-map";
import {googleMapsUrl,googleMapsAddressUrl} from "./map-url";
import {money} from "./filters";
import {ActionIcon} from "@/components/ui/action-feedback";
import {InfoPopover} from "@/components/ui/info-popover";
export type MappedProperty={id:string;name:string;latitude:number|null;longitude:number|null;precision:string;is_demo:boolean;city?:string;locality?:string;address?:string;property_type?:string;rent_min?:number;rent_max?:number};
export type PinnedProperty=MappedProperty&{latitude:number;longitude:number};
export function hasMapPin(property:MappedProperty):property is PinnedProperty {return property.latitude!==null&&property.longitude!==null&&Number.isFinite(property.latitude)&&Number.isFinite(property.longitude);}
export function RecordedMap({properties}:{properties:MappedProperty[]}) {
 const [chosen,setChosen]=useState(properties.find(hasMapPin)?.id??properties[0]?.id??""),[loadMap,setLoadMap]=useState(false),[query,setQuery]=useState(""),[city,setCity]=useState(""),[type,setType]=useState(""),[fitRequest,setFitRequest]=useState(0);
 const [pinsOnly,setPinsOnly]=useState(false);
 const filtered=useMemo(()=>properties.filter(p=>(!pinsOnly||hasMapPin(p))&&(!city||p.city===city)&&(!type||p.property_type===type)&&`${p.name} ${p.address??""} ${p.locality??""} ${p.city??""}`.toLowerCase().includes(query.trim().toLowerCase())),[properties,query,city,type,pinsOnly]);
 const pins=useMemo(()=>filtered.filter(hasMapPin),[filtered]);
 const p=filtered.find(p=>p.id===chosen)??filtered[0];
 const results=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const list=results.current,card=list?.querySelector<HTMLElement>('[aria-pressed="true"]');
  if(!list||!card)return;
  const container=list.getBoundingClientRect(),item=card.getBoundingClientRect();
  if(window.matchMedia("(max-width:700px)").matches)list.scrollTo({left:list.scrollLeft+item.left-container.left});
  else if(item.top<container.top||item.bottom>container.bottom)list.scrollTo({top:list.scrollTop+item.top-container.top});
 },[p?.id,filtered]);
 const cities=[...new Set(properties.map(p=>p.city).filter((value):value is string=>!!value))].sort();
 const types=[...new Set(properties.map(p=>p.property_type).filter((value):value is string=>!!value))].sort();
 if(!properties.length)return <section className="dashboard-card map-empty"><h2>No properties yet</h2><p>Published properties will appear here.</p><a className="button" href="/search"><ActionIcon name="search"/>Explore properties</a></section>;
 return <div className="map-explorer">
  <section className="map-explorer-filters" aria-label="Find properties">
   <label className="map-explorer-search">Search places<div><ActionIcon name="search"/><input type="search" placeholder="Property, city or neighbourhood" value={query} onChange={e=>setQuery(e.target.value)}/></div></label>
   <label>City<select value={city} onChange={e=>setCity(e.target.value)}><option value="">All cities</option>{cities.map(value=><option key={value}>{value}</option>)}</select></label>
   <label>Property type<select value={type} onChange={e=>setType(e.target.value)}><option value="">All types</option>{types.map(value=><option key={value}>{value}</option>)}</select></label>
   <label className="map-pin-filter"><input type="checkbox" checked={pinsOnly} onChange={e=>setPinsOnly(e.target.checked)}/>With map pins only</label>
   {(query||city||type||pinsOnly)&&<button type="button" className="review-action" onClick={()=>{setQuery("");setCity("");setType("");setPinsOnly(false);}}>Clear filters</button>}
  </section>
  <div className="map-explorer-toolbar"><p role="status"><strong>{filtered.length}</strong> {filtered.length===1?"property":"properties"} · <strong>{pins.length}</strong> {pins.length===1?"map pin":"map pins"}</p><InfoPopover label="About map locations">All published properties are searchable. Only places with saved coordinates have map pins; address-only places can be searched externally in Google Maps. Approximate pins show an area, rather than an exact building. Maps load from OpenStreetMap only when requested; the provider receives your IP address and map area.</InfoPopover></div>
  <div className="map-explorer-workspace">
   <aside className="map-explorer-list" aria-label="Available properties">
    {filtered.length?<><label className="map-explorer-select">Choose a place<select value={p.id} onChange={e=>setChosen(e.target.value)}>{filtered.map(property=><option key={property.id} value={property.id}>{property.name}{property.city?` · ${property.city}`:""}</option>)}</select></label><div ref={results} className="map-property-results">{filtered.map(property=><button type="button" className={`map-property-option${property.id===p.id?" is-selected":""}`} key={property.id} aria-pressed={property.id===p.id} onClick={()=>setChosen(property.id)}><span className="map-property-type">{property.property_type??"Property"}<span className={`map-pin-badge${hasMapPin(property)?" has-pin":""}`}>{hasMapPin(property)?"Map pin":"Address only"}</span></span><strong>{property.name}</strong><span>{[property.locality,property.city].filter(Boolean).join(", ")||"Shared location"}</span>{property.rent_min!=null&&<b>{money(property.rent_min)}{property.rent_max!==property.rent_min?`–${money(property.rent_max??property.rent_min)}`:""}<small> / month</small></b>}</button>)}</div></>:<div className="map-empty"><h2>No matching places</h2><p>Try another name, city or property type.</p></div>}
   </aside>
   <section className="map-explorer-detail" aria-label="Selected property map">
    <div className="map-display-toolbar"><span><span className="map-live-dot"/>OpenStreetMap</span>{loadMap&&<div><button type="button" className="review-action" disabled={!pins.length} onClick={()=>setFitRequest(value=>value+1)}>Show all pins</button><button type="button" className="review-action" onClick={()=>setLoadMap(false)}><ActionIcon name="close"/>Hide map</button></div>}</div>
    {!pins.length?<div className="map-preview-placeholder map-no-pins"><ActionIcon name="search"/><h2>{filtered.length?"No saved map pins for these results":"Find a place to explore"}</h2><p>{filtered.length?"These properties have addresses, but no shared coordinates yet. Select a property below or search its address in Google Maps.":"Change the search or filters to see available properties."}</p></div>:loadMap?<ExplorerMap properties={pins} selected={p?.id??""} onSelect={setChosen} fitRequest={fitRequest}/>:<div className="map-preview-placeholder"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 17 18-7 18 7 18-7v38l-18 7-18-7-18 7V17Zm18-7v38m18-31v38"/><path d="M39 21c0 9-9 16-9 16s-9-7-9-16a9 9 0 1 1 18 0Z" fill="#edf3e8"/><circle cx="30" cy="21" r="3"/></svg><h2>Find your next neighbourhood</h2><p>Explore nearby streets and compare where places are located.</p><button className="button" type="button" onClick={()=>setLoadMap(true)}><ActionIcon name="search"/>Load OpenStreetMap</button></div>}
    {p&&<div className="map-selected-property"><div className="map-selected-heading"><div><small>{p.property_type??"Property"}{p.is_demo?" · Demonstration":""}</small><h2>{p.name}</h2><p>{p.address||[p.locality,p.city].filter(Boolean).join(", ")}</p></div>{p.rent_min!=null&&<strong>{money(p.rent_min)}{p.rent_max!==p.rent_min?`–${money(p.rent_max??p.rent_min)}`:""}<small> / month</small></strong>}</div><p className="map-coordinate-note">{hasMapPin(p)?<>{p.precision==="approximate"?"Approximate location":"Shared map location"}: {p.latitude}, {p.longitude}</>:"No map pin shared yet. Search the address in Google Maps or view the property for more details."}</p><div className="map-selected-actions"><a className="button" href={`/properties/${p.id}`}><ActionIcon name="search"/>View property</a><a className="review-action" href={hasMapPin(p)?googleMapsUrl(p.latitude,p.longitude):googleMapsAddressUrl([p.address,p.locality,p.city,"India"].filter(Boolean).join(", "))} target="_blank" rel="noreferrer" aria-label={`Open ${p.name} in Google Maps`}>{hasMapPin(p)?"Open in Google Maps":"Search address in Google Maps"} ↗</a></div></div>}
   </section>
  </div>
 </div>;
}

"use client";
import {useEffect,useRef,useState} from "react";
import type {Map as LeafletMap,LayerGroup} from "leaflet";
import type {PinnedProperty} from "./map";
export function ExplorerMap({properties,selected,onSelect,fitRequest}:{properties:PinnedProperty[];selected:string;onSelect:(id:string)=>void;fitRequest:number}) {
 const element=useRef<HTMLDivElement>(null),map=useRef<LeafletMap|null>(null),layers=useRef<LayerGroup|null>(null);
 const [ready,setReady]=useState(false),[error,setError]=useState(false);
 const callback=useRef(onSelect);useEffect(()=>{callback.current=onSelect;},[onSelect]);
 useEffect(()=>{
  let cancelled=false;
  void import("leaflet").then(L=>{
   if(cancelled||!element.current)return;
   const view=L.map(element.current,{scrollWheelZoom:false}).setView([22.8,79],5);map.current=view;
   L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL||"https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(view);
   layers.current=L.layerGroup().addTo(view);setReady(true);
  }).catch(()=>{if(!cancelled)setError(true);});
  return()=>{cancelled=true;map.current?.remove();map.current=null;};
 },[]);
 useEffect(()=>{
  if(!ready||!map.current||!layers.current)return;
  let cancelled=false;
  void import("leaflet").then(L=>{
   if(cancelled||!map.current||!layers.current)return;
   layers.current.clearLayers();
   for(const property of properties){
    const label=document.createElement("span");label.textContent=property.name;
    const marker=L.circleMarker([property.latitude,property.longitude],{radius:property.id===selected?11:8,color:"#fff",weight:3,fillColor:property.id===selected?"#ba6847":"#214f42",fillOpacity:1}).bindTooltip(label);
    marker.on("click",()=>callback.current(property.id));marker.addTo(layers.current);
   }
  });return()=>{cancelled=true;};
 },[properties,selected,ready]);
 useEffect(()=>{
  if(!ready||!map.current)return;
  const property=properties.find(p=>p.id===selected);
  if(property)map.current.setView([property.latitude,property.longitude],15);
  else map.current.setView([22.8,79],5);
 },[selected,properties,ready]);
 useEffect(()=>{
  if(!ready||!map.current||!fitRequest||!properties.length)return;
  let cancelled=false;
  void import("leaflet").then(L=>{if(!cancelled&&map.current)map.current.fitBounds(L.latLngBounds(properties.map(p=>[p.latitude,p.longitude])),{padding:[35,35],maxZoom:15});});
  return()=>{cancelled=true;};
 },[fitRequest,properties,ready]);
 return <div className="explorer-map-frame">{!ready&&!error&&<p className="explorer-map-loading" role="status">Loading map…</p>}{error&&<p className="explorer-map-loading" role="alert">Map unavailable. You can still browse places or open them in Google Maps.</p>}<div ref={element} className="explorer-live-map" role="region" aria-label="Property location map"/></div>;
}

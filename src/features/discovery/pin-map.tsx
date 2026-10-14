"use client";
import {useEffect,useRef} from "react";
import type {Map as LeafletMap,CircleMarker} from "leaflet";
export type MapPoint={latitude:number;longitude:number};
export function PinMap({point,onChange}:{point:MapPoint|null;onChange?:(point:MapPoint)=>void}){
  const node=useRef<HTMLDivElement>(null),map=useRef<LeafletMap|null>(null),marker=useRef<CircleMarker|null>(null);
  const callback=useRef(onChange);useEffect(()=>{callback.current=onChange;},[onChange]);
  useEffect(()=>{let cancelled=false;void import("leaflet").then(L=>{
    if(cancelled||!node.current)return;
    const view=L.map(node.current,{scrollWheelZoom:false}).setView([22.8,79],5);map.current=view;
    L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL||"https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(view);
    marker.current=L.circleMarker([22.8,79],{radius:9,color:"#fff",weight:3,fillColor:"#214f42",fillOpacity:1});
    view.on("click",event=>{if(callback.current)callback.current({latitude:event.latlng.lat,longitude:event.latlng.lng});});
    view.invalidateSize();
  });return()=>{cancelled=true;map.current?.remove();map.current=null;};},[]);
  useEffect(()=>{let cancelled=false;void import("leaflet").then(()=>{if(cancelled||!map.current||!marker.current)return;if(point){marker.current.setLatLng([point.latitude,point.longitude]).addTo(map.current);map.current.setView([point.latitude,point.longitude],Math.max(map.current.getZoom(),15));}else marker.current.remove();});return()=>{cancelled=true;};},[point]);
  return <div ref={node} className="pin-map" role="region" aria-label={onChange?"Choose property location on map":"Property location map"}/>;
}

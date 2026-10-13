"use client";
import { indianStates } from "./india";
export function AddressFields({values,onChange}:{values:Record<string,string>;onChange:(next:Record<string,string>)=>void}){
  const cities=indianStates.find(state=>state.name===values.state)?.cities??[];
  return <>
    <p className="field-hint wide">City choices use <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a> data (CC BY 4.0). If your town is missing, find the full address on the map to add its returned city.</p>
    <div className="form-field"><label htmlFor="state">State / union territory</label><select id="state" name="state" value={values.state??""} required onChange={event=>onChange({...values,state:event.target.value,city:"",postalCode:"",latitude:"",longitude:""})}><option value="">Select a state</option>{indianStates.map(state=><option key={state.code}>{state.name}</option>)}</select></div>
    <div className="form-field"><label htmlFor="city">City</label><select id="city" name="city" value={values.city??""} required disabled={!values.state} onChange={event=>onChange({...values,city:event.target.value,postalCode:"",latitude:"",longitude:""})}><option value="">Select a city or town</option>{values.city&&!cities.includes(values.city)&&<option>{values.city}</option>}{cities.map(city=><option key={city}>{city}</option>)}</select></div>
    <div className="form-field"><label htmlFor="postalCode">PIN code</label><input id="postalCode" name="postalCode" inputMode="numeric" autoComplete="postal-code" pattern="[1-9][0-9]{5}" maxLength={6} value={values.postalCode??""} onChange={event=>onChange({...values,postalCode:event.target.value.replace(/\D/g,"").slice(0,6)})}/><p className="field-hint">Filled from your map address when available. Check the six-digit PIN; one city can have several.</p></div>
  </>;
}

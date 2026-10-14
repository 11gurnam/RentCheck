"use client";
import { indianStates } from "./india";
export function AddressFields({values,onChange}:{values:Record<string,string>;onChange:(next:Record<string,string>)=>void}){
  const cities=indianStates.find(state=>state.name===values.state)?.cities??[];
  return <>
    <div className="form-field"><label htmlFor="country">Country</label><input id="country" name="country" value={values.country??"India"} onChange={event=>onChange({...values,country:event.target.value})}/><p className="field-hint">RentCheck currently supports properties in India.</p></div>
    <p className="field-hint wide">City choices use <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a> data (CC BY 4.0). If your town is missing, find the full address on the map to add its returned city.</p>
    <div className="form-field"><label htmlFor="state">State / union territory</label><select id="state" name="state" value={values.state??""} required onChange={event=>onChange({...values,state:event.target.value,city:"",postalCode:""})}><option value="">Select a state</option>{indianStates.map(state=><option key={state.code}>{state.name}</option>)}</select></div>
    <div className="form-field"><label htmlFor="city">City</label><input id="city" name="city" list="address-cities" value={values.city??""} required disabled={!values.state} onChange={event=>onChange({...values,city:event.target.value,postalCode:""})}/><datalist id="address-cities">{cities.map(city=><option key={city} value={city}/>)}</datalist></div>
    <div className="form-field"><label htmlFor="postalCode">PIN code</label><input id="postalCode" name="postalCode" inputMode="numeric" autoComplete="postal-code" pattern="[1-9][0-9]{5}" maxLength={6} value={values.postalCode??""} onChange={event=>onChange({...values,postalCode:event.target.value.replace(/\D/g,"").slice(0,6)})}/><p className="field-hint">Filled from your map address when available. Check the six-digit PIN; one city can have several.</p></div>
  </>;
}

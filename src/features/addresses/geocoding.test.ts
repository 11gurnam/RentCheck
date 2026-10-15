import {it,expect} from "vitest";
import {photonAddress,completeReverseAddress} from "./geocoding";
import {indianStates} from "./india";
it("includes all 36 states and union territories and useful city choices",()=>{
  expect(indianStates).toHaveLength(36);
  expect(indianStates.find(s=>s.name==="Rajasthan")?.cities).toContain("Jaipur");
  expect(indianStates.find(s=>s.name==="Delhi")?.cities).toContain("New Delhi");
});
it("uses a returned locality PIN without inventing a city-wide code",()=>{
  const feature={geometry:{coordinates:[75.8,26.9]},properties:{countrycode:"IN",state:"Rajasthan",city:"Jaipur",district:"Civil Lines",postcode:"302006",name:"Civil Lines"}};
  expect(photonAddress(feature)).toMatchObject({state:"Rajasthan",city:"Jaipur",postalCode:"302006",latitude:26.9});
  expect(photonAddress({...feature,properties:{...feature.properties,postcode:""}})?.postalCode).toBe("");
  expect(photonAddress({...feature,properties:{...feature.properties,city:"Jaipur Municipal Corporation"}})?.city).toBe("Jaipur");
});
it("rejects foreign, missing and invalid coordinates",()=>{
  expect(photonAddress({geometry:{coordinates:[75,27]},properties:{countrycode:"US"}})).toBeNull();
  expect(photonAddress({geometry:{coordinates:[]},properties:{countrycode:"IN"}})).toBeNull();
  expect(photonAddress({geometry:{coordinates:[0,0]},properties:{countrycode:"IN"}})).toBeNull();
});
it("fills missing administrative fields from nearby reverse results without copying a distant city or PIN",()=>{
 const first={address:"Selected street",state:"",city:"",locality:"",postalCode:"",latitude:26.918,longitude:75.787};
 const nearby={...first,address:"Neighbouring street",state:"Rajasthan",city:"Jaipur",postalCode:"302006",latitude:26.919};
 expect(completeReverseAddress([first,nearby])[0]).toEqual({...first,state:"Rajasthan",city:"Jaipur"});
 expect(completeReverseAddress([first,{...nearby,latitude:28.6}])[0]).toEqual(first);
 expect(completeReverseAddress([{...first,state:"Delhi"},nearby])[0]).toEqual({...first,state:"Delhi"});
});

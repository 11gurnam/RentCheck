import {it,expect} from "vitest";
import {photonAddress} from "./geocoding";
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

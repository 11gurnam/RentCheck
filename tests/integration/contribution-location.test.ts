import {it,expect} from "vitest";
import {createClient} from "@supabase/supabase-js";
import {localBackendConfiguration} from "../helpers/local-backend";
it("persists a contributor's PIN and consented property pin atomically and denies direct map edits",async()=>{
  const c=localBackendConfiguration();if(!c)throw Error("Local backend required");
  const admin=createClient(c.url,c.serviceKey,{auth:{persistSession:false}}),client=createClient(c.url,c.publicKey,{auth:{persistSession:false}});
  const password="Synthetic location check passphrase";
  const created=await admin.auth.admin.createUser({email:`location-${crypto.randomUUID()}@example.test`,password,email_confirm:true});
  expect(created.error).toBeNull();let property:string|undefined;
  try{
    expect((await client.auth.signInWithPassword({email:created.data.user!.email!,password})).error).toBeNull();
    const input={name:"Synthetic pin test",address:`Demo pin lane ${crypto.randomUUID()}`,state:"Rajasthan",city:"Jaipur",locality:"Civil Lines",type:"Flat",min:1000,max:2000,synthetic:true,postalCode:"302006",latitude:26.918,longitude:75.787,shareLocation:true};
    expect((await client.rpc("create_property",{p_input:{...input,postalCode:"000000"}})).error).not.toBeNull();
    expect((await client.rpc("create_property",{p_input:{...input,shareLocation:false}})).error).not.toBeNull();
    expect((await client.rpc("create_property",{p_input:{...input,longitude:null}})).error).not.toBeNull();
    const result=await client.rpc("create_property",{p_input:input});expect(result.error).toBeNull();property=result.data;
    expect((await client.from("properties").select("postal_code").eq("id",property).single()).data).toEqual({postal_code:"302006"});
    expect((await client.from("property_locations").select("latitude,longitude,precision").eq("property_id",property).single()).data).toMatchObject({latitude:26.918,longitude:75.787,precision:"exact"});
    expect((await client.from("property_locations").update({latitude:0}).eq("property_id",property)).error).not.toBeNull();
  }finally{if(property)await admin.from("properties").delete().eq("id",property);if(created.data.user)await admin.auth.admin.deleteUser(created.data.user.id);}
});

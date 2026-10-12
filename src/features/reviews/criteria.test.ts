import { expect, it } from "vitest";
import { criteriaFor, overallRating } from "./criteria";
import { criteriaSchema } from "./validation";
it("switches rating essentials by type and averages custom scores equally",()=>{
 expect(criteriaFor("PG").map(c=>c.key)).toContain("bathrooms");
 expect(criteriaFor("Homestay").map(c=>c.key)).toContain("hospitality");
 expect(criteriaFor("Flat").map(c=>c.key)).not.toContain("hospitality");
 expect(overallRating([{key:"water",label:"Water",rating:5},{key:"custom_parking",label:"Parking",rating:2,custom:true}])).toBe(3.5);
 expect(overallRating([])).toBeNull();
 const values=criteriaFor("Flat").map(c=>({...c,rating:4}));
 expect(criteriaSchema.safeParse(values).success).toBe(true);
 expect(criteriaSchema.safeParse([...values,values[0]]).success).toBe(false);
 expect(criteriaSchema.safeParse(values.map(c=>({...c,rating:0}))).success).toBe(false);
 expect(criteriaSchema.safeParse(values.map(c=>({...c,rating:0.5}))).success).toBe(true);
 expect(criteriaSchema.safeParse(values.map(c=>({...c,rating:3.5}))).success).toBe(true);
 expect(criteriaSchema.safeParse(values.map(c=>({...c,rating:3.25}))).success).toBe(false);
});

import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import sharp from 'sharp';
import {localBackendConfiguration} from '../helpers/local-backend';
import {fixtureAdmin} from '../helpers/admin-fixture';
test('tenant documents and property claim search, approval, reply and dispute UI',async({page,browser})=>{
 test.setTimeout(150000);const c=localBackendConfiguration();if(!c)throw new Error('Local backend required');
 const service=createClient(c.url,c.serviceKey,{auth:{persistSession:false}});const users:{id:string;email:string}[]=[];const password='Synthetic trust browser password';const property='20000000-0000-4000-8000-000000000008';const paths:string[]=[];
 const adminContext=await browser.newContext();const admin=await adminContext.newPage();
 async function login(p:typeof page,email:string){await p.goto('/sign-in');await p.getByLabel('Email address').fill(email);await p.getByLabel('Password',{exact:true}).fill(password);await p.getByRole('button',{name:'Sign in',exact:true}).click();await expect(p).toHaveURL(/\/account$/);}
 const png=await sharp({create:{width:200,height:150,channels:3,background:'white'}}).png().toBuffer();
 try{
  for(let n=0;n<3;n++){const email=`trust-browser-${crypto.randomUUID()}@example.test`;const u=await service.auth.admin.createUser({email,password,email_confirm:true});expect(u.error).toBeNull();users.push({id:u.data.user!.id,email});}
  fixtureAdmin(users[2].id,true);
  const tenant=createClient(c.url,c.publicKey,{auth:{persistSession:false}});await tenant.auth.signInWithPassword({email:users[0].email,password});
  const review=await tenant.rpc('create_review',{p_input:{property,start:'2024-01-01',current:true,paid:12000,propertyRating:4,body:'Synthetic browser evidence review.',synthetic:true}});expect(review.error).toBeNull();
  await login(page,users[0].email);await page.goto(`/reviews/${review.data.id}/edit`);
  await page.getByLabel('Evidence type').selectOption('utility');
  await page.getByLabel('Fictional supporting documents').setInputFiles([1,2].map(n=>({name:`bill-${n}.png`,mimeType:'image/png',buffer:png})));
  await page.getByLabel('This document contains only invented').check();
  await page.getByRole('button',{name:'Request demonstration verification'}).click();
  await expect(page.getByText('Private demonstration verification requested.',{exact:false})).toBeVisible();
  const verification=(await tenant.rpc('get_my_verifications')).data[0];const tenantDocs=(await tenant.rpc('get_evidence_documents',{p_primary:verification.document_id})).data;paths.push(...tenantDocs.map((d:{id:string})=>`verification/${d.id}.jpg`));
  await expect(page.getByRole('link',{name:/Download private document/})).toHaveCount(2);
  expect((await page.request.get(`/api/documents/${tenantDocs[1].id}`)).status()).toBe(200);
  await login(admin,users[2].email);await admin.goto('/admin/verification');const verificationCard=admin.locator('section.dashboard-card').filter({has:admin.locator(`input[value="${verification.id}"]`)});
  await expect(verificationCard).toContainText('01 Jan 2024');await expect(verificationCard.getByRole('link',{name:/Download private document/})).toHaveCount(2);
  await verificationCard.getByLabel('Decision reason',{exact:true}).fill('Fictional applicant property and dates inspected.');await verificationCard.getByRole('button',{name:'Save verification decision'}).click();await expect(verificationCard).toContainText('approved');
  await page.goto('/account');await expect(page.getByText('Demonstration verified tenant',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await login(page,users[1].email);
  expect((await page.request.get(`/api/documents/${tenantDocs[1].id}`)).status()).toBe(404);
  await page.goto('/claims/new');await page.getByLabel('Property name or address').fill('Mango');await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('link',{name:'Claim this property',exact:true}).click();
  await page.getByLabel('Evidence type').selectOption('authorization');await page.getByLabel('Fictional supporting documents').setInputFiles({name:'owner-authorization.png',mimeType:'image/png',buffer:png});await page.getByLabel('This claim and evidence use only invented').check();await page.getByRole('button',{name:'Submit demonstration claim'}).click();await expect(page.getByText('Private demonstration claim submitted.',{exact:false})).toBeVisible();
  const owner=createClient(c.url,c.publicKey,{auth:{persistSession:false}});await owner.auth.signInWithPassword({email:users[1].email,password});const claim=(await owner.rpc('get_my_claims')).data[0];paths.push(`claim/${claim.document_id}.jpg`);
  await admin.goto('/admin/claims');const claimCard=admin.locator('section.dashboard-card').filter({has:admin.locator(`input[value="${claim.id}"]`)});await claimCard.getByLabel('Claim decision reason').fill('Fictional property authority evidence inspected.');await claimCard.getByRole('button',{name:'Save claim decision'}).click();await expect(claimCard).toContainText('approved');
  await page.goto(`/properties/${property}`);await page.getByRole('button',{name:'Reply to review',exact:true}).click();await page.getByLabel('Your public representative reply').fill('Synthetic authorized landlord response.');await page.getByRole('button',{name:'Save representative reply'}).click();await page.keyboard.press('Escape');await expect(page.getByText('Demonstration Landlord Response',{exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await claimCard.getByRole('combobox',{name:/Claim decision/}).selectOption('disputed');await claimCard.getByLabel('Claim decision reason').fill('Fictional competing authority needs dispute review.');await claimCard.getByRole('button',{name:'Save claim decision'}).click();await expect(claimCard).toContainText('disputed');await page.reload();await expect(page.getByRole('button',{name:'Reply to review',exact:true})).toHaveCount(0);await expect(page.getByText('Synthetic authorized landlord response.',{exact:true})).toHaveCount(0);
 }finally{await adminContext.close();if(paths.length)await service.storage.from('rental-documents').remove(paths);for(const u of users)await service.auth.admin.deleteUser(u.id);}
});

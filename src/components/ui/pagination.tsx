import Link from "next/link";

function Arrow({next=false}:{next?:boolean}) {
 return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={next?"m9 5 7 7-7 7":"m15 5-7 7 7 7"}/></svg>;
}
export function Pagination({page,total,pageSize,href,label="Results pages"}:{page:number;total:number;pageSize:number;href:(page:number)=>string;label?:string}) {
 const last=Math.max(1,Math.ceil(total/pageSize));
 const visible=[...new Set([1,last,...(page<=3?[2,3,4]:page>=last-2?[last-3,last-2,last-1]:[page-1,page,page+1])])].filter(n=>n>=1&&n<=last).sort((a,b)=>a-b);
 const items:(number|string)[]=[];
 for(const number of visible){const previous=items.at(-1);if(typeof previous==="number"&&number-previous>1)items.push(`gap-${number}`);items.push(number);}
 return <nav className="numbered-pagination" aria-label={label}>
  <span className="pagination-status">Page <strong>{page}</strong> of {last}</span>
  <div className="pagination-controls">
   {page>1&&total>0?<Link className="pagination-control pagination-arrow" href={href(page-1)} prefetch={false} rel="prev" aria-label="Previous page"><Arrow/></Link>:<button className="pagination-control pagination-arrow" disabled aria-label="Previous page"><Arrow/></button>}
   {items.map(item=>typeof item==="number"?item===page?<span key={item} className="pagination-control is-current" aria-current="page" aria-label={`Page ${item}, current page`}>{item}</span>:<Link key={item} className={`pagination-control${item!==1&&item!==last?" pagination-secondary":""}`} href={href(item)} prefetch={false} aria-label={`Go to page ${item}`}>{item}</Link>:<span key={item} className="pagination-gap" aria-hidden="true">…</span>)}
   {page<last&&total>0?<Link className="pagination-control pagination-arrow" href={href(page+1)} prefetch={false} rel="next" aria-label="Next page"><Arrow next/></Link>:<button className="pagination-control pagination-arrow" disabled aria-label="Next page"><Arrow next/></button>}
  </div>
 </nav>;
}

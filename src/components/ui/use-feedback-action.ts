"use client";
import { useActionState } from "react";
import { notifySuccess } from "./toast-host";

type FeedbackState={message?:string;status?:string};
/** Notify before a successful mutation can remove the form from the page. */
export function useFeedbackAction<State extends FeedbackState, Payload=FormData>(
  action:(previous:Awaited<State>,payload:Payload)=>State|Promise<State>,
  initial:Awaited<State>,
) {
  const [state,dispatch,pending]=useActionState<State,Payload>(async(previous,payload)=>{
    window.dispatchEvent(new Event("rentcheck:action-start"));
    try {
      const result=await action(previous,payload);
      if(result?.status==="success"&&result.message)notifySuccess(result.message);
      return result;
    } catch(error) {
      // Preserve framework redirects; ordinary network/server failures stay in the form.
      if(error&&typeof error==="object"&&"digest" in error&&typeof error.digest==="string"&&/^(NEXT_REDIRECT|NEXT_HTTP_ERROR_FALLBACK)/.test(error.digest))throw error;
      return {...previous,status:"error",message:"We couldn’t complete this action. Please check your connection and try again."} as Awaited<State>;
    }
  },initial);
  return [pending ? {...state,message:undefined} : state,dispatch,pending] as const;
}

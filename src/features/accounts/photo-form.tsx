"use client";
import { useFeedbackAction } from "@/components/ui/use-feedback-action";
import { useState } from "react";
import { FilePicker } from "@/components/ui/file-picker";
import { prepareProfilePhoto } from "./prepare-photo";
import { ActionModal, ModalCancel } from "@/components/ui/action-modal";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { CameraIcon } from "@/components/ui/camera-icon";
import { uploadProfilePhoto } from "./photo-actions";
import { initialFormState } from "./validation";

export function ProfilePhotoForm({ name, src }: { name:string; src:string|null }) {
  const [selected, setSelected] = useState<File | null>(null);
  const [selectionKey,setSelectionKey]=useState(0);
  const [state,action,pending] = useFeedbackAction(async (previous: typeof initialFormState, form: FormData) => {
    try {
      const file = form.get("photo");
      if (!(file instanceof File)) throw new Error();
      form.set("photo", await prepareProfilePhoto(file));
    } catch { return { status: "error" as const, message: "Use a valid JPEG, PNG or WebP photo up to 5 MiB." }; }
    try {
      const result=await uploadProfilePhoto(previous, form);
      if(result.status==="success"){setSelected(null);setSelectionKey(key=>key+1);}
      return result;
    } catch { return { status: "error" as const, message: "Photo upload was interrupted. Refresh to check whether it saved before trying again." }; }
  },initialFormState);
  return <div className="account-photo-control"><ActionModal title="Profile photo" dialogClassName="profile-photo-dialog" onClose={()=>{setSelected(null);setSelectionKey(key=>key+1);}} trigger={src ? "Change photo" : "Upload photo"} triggerClassName="profile-photo-trigger" triggerContent={<><span className="profile-photo-image"><ProfileAvatar name={name} src={src} initials /><span className="photo-camera-badge"><CameraIcon /></span></span><span className="profile-photo-label">{src ? "Change photo" : "Upload photo"}<small>Choose your profile picture</small></span></>}>
    <form action={action} className="auth-form" onReset={event=>event.preventDefault()}>
      <p className="field-hint">Your photo appears publicly beside your username and reviews. JPEG, PNG or WebP, up to 5 MiB.</p>
      <div className="profile-current-photo"><ProfileAvatar name={name} src={src} initials/><span>Current profile photo</span></div>
      <FilePicker key={selectionKey} label="Profile photo" name="photo" accept="image/jpeg,image/png,image/webp" photo disabled={pending} onFile={setSelected} />
      <div className="form-actions"><ModalCancel disabled={pending}/><button disabled={pending || !selected}><CameraIcon/>{pending ? "Uploading…" : "Save photo"}</button></div>
      <ActionFeedback receipt={state} message={state.message} status={state.status === "error" ? "error" : "success"}/>
    </form>
  </ActionModal></div>;
}

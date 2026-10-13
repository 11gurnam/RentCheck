"use client";
import { useActionState, useState } from "react";
import { FilePicker } from "@/components/ui/file-picker";
import { prepareProfilePhoto } from "./prepare-photo";
import { ActionModal } from "@/components/ui/action-modal";
import { ActionFeedback, ActionIcon } from "@/components/ui/action-feedback";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { CameraIcon } from "@/components/ui/camera-icon";
import { uploadProfilePhoto } from "./photo-actions";
import { initialFormState } from "./validation";

export function ProfilePhotoForm({ name, src }: { name:string; src:string|null }) {
  const [selected, setSelected] = useState<File | null>(null);
  const [state,action,pending] = useActionState(async (previous: typeof initialFormState, form: FormData) => {
    try {
      const file = form.get("photo");
      if (!(file instanceof File)) throw new Error();
      form.set("photo", await prepareProfilePhoto(file));
      return await uploadProfilePhoto(previous, form);
    } catch { return { status: "error" as const, message: "Use a valid JPEG, PNG or WebP photo up to 5 MiB. If upload was interrupted, please try again." }; }
  },initialFormState);
  return <div className="account-photo-control"><ActionModal title="Profile photo" trigger={src ? "Change photo" : "Upload photo"} triggerClassName="profile-photo-trigger" triggerContent={<><span className="profile-photo-image"><ProfileAvatar name={name} src={src} initials /><span className="photo-camera-badge"><CameraIcon /></span></span><span className="profile-photo-label">{src ? "Change photo" : "Upload photo"}<small>Choose your profile picture</small></span></>}>
    <form action={action} className="auth-form">
      <p className="field-hint">Your photo appears publicly beside your username and reviews. JPEG, PNG or WebP, up to 5 MiB.</p>
      <FilePicker label="Profile photo" name="photo" accept="image/jpeg,image/png,image/webp" photo disabled={pending} onFile={setSelected} />
      <button disabled={pending || !selected}><ActionIcon name="upload"/>{pending ? "Uploading…" : "Save photo"}</button>
      <ActionFeedback message={state.message} status={state.status === "error" ? "error" : "success"}/>
    </form>
  </ActionModal></div>;
}

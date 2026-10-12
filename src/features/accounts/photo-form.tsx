"use client";
import { useActionState } from "react";
import { ActionModal } from "@/components/ui/action-modal";
import { ActionFeedback, ActionIcon } from "@/components/ui/action-feedback";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { CameraIcon } from "@/components/ui/camera-icon";
import { uploadProfilePhoto } from "./photo-actions";
import { initialFormState } from "./validation";

export function ProfilePhotoForm({ name, src }: { name:string; src:string|null }) {
  const [state,action,pending] = useActionState(uploadProfilePhoto,initialFormState);
  return <div className="account-photo-control"><ActionModal title="Profile photo" trigger={src ? "Change photo" : "Upload photo"} triggerClassName="profile-photo-trigger" triggerContent={<><span className="profile-photo-image"><ProfileAvatar name={name} src={src} initials /><span className="photo-camera-badge"><CameraIcon /></span></span><span className="profile-photo-label">{src ? "Change photo" : "Upload photo"}<small>Choose your profile picture</small></span></>}>
    <form action={action} className="auth-form">
      <p className="field-hint">Your photo appears publicly beside your username and reviews. JPEG, PNG or WebP, up to 5 MiB.</p>
      <label>Profile photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required /></label>
      <button disabled={pending}><ActionIcon name="upload"/>{pending ? "Uploading…" : "Save photo"}</button>
      <ActionFeedback message={state.message} status={state.status === "error" ? "error" : "success"}/>
    </form>
  </ActionModal></div>;
}

"use client";

import { PersonalInfoCard } from "./components/personal-info-card";
import { PasswordCard } from "./components/password-card";

interface ProfileFormProps {
  user: { firstName: string | null; lastName: string | null; email: string };
}

export function ProfileForm({ user }: ProfileFormProps) {
  return (
    <div className="max-w-xl space-y-6">
      <PersonalInfoCard user={user} />
      <PasswordCard userEmail={user.email} />
    </div>
  );
}

"use client";

import { PersonalInfoCard } from "./components/personal-info-card";
import { PasswordCard } from "./components/password-card";
import { PasskeysCard } from "./components/passkeys-card";

interface ProfileFormProps {
  user: { firstName: string | null; lastName: string | null; email: string };
}

export function ProfileForm({ user }: ProfileFormProps) {
  return (
    <div className="grid max-w-5xl items-start gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <PersonalInfoCard user={user} />
        <PasskeysCard />
      </div>
      <PasswordCard userEmail={user.email} />
    </div>
  );
}

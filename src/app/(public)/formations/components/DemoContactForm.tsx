"use client";

import React, { useState } from "react";
import { Mail, Building2, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { sendDemoRequestAction } from "../actions";

export function DemoContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
    website: "", // Honeypot field
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    try {
      const response = await sendDemoRequestAction(formData);

      if (response.success) {
        toast.success("Votre demande de démo a bien été prise en compte !");
        setFormData({
          name: "",
          email: "",
          phone: "",
          company: "",
          message: "",
          website: "",
        });
      } else {
        if (response.issues) {
          setFieldErrors(response.issues);
          toast.error("Veuillez corriger les erreurs dans le formulaire.");
        } else {
          toast.error(response.error || "Une erreur est survenue.");
        }
      }
    } catch {
      toast.error("Une erreur inattendue est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot field - completely invisible to humans, ignored by screen readers, but filled by automated spam bots */}
        <div
          style={{
            position: "absolute",
            opacity: 0,
            top: 0,
            left: 0,
            height: 0,
            width: 0,
            zIndex: -1,
            overflow: "hidden",
          }}
          aria-hidden="true"
        >
          <label htmlFor="website">
            Ne pas remplir ce champ si vous êtes un humain
          </label>
          <input
            id="website"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="new-password"
            value={formData.website}
            onChange={(e) =>
              setFormData({ ...formData, website: e.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-xs font-bold tracking-wider text-slate-500 uppercase"
            >
              Nom complet
            </label>
            <div className="relative">
              <input
                type="text"
                id="name"
                required
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-4 pl-10 text-sm outline-hidden transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="Jean Dupont"
              />
              <User className="absolute top-3.5 left-3.5 h-4.5 w-4.5 text-slate-400" />
            </div>
            {fieldErrors.name && (
              <p
                id="name-error"
                className="mt-1 text-xs font-medium text-red-600"
              >
                {fieldErrors.name[0]}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="company"
              className="mb-2 block text-xs font-bold tracking-wider text-slate-500 uppercase"
            >
              Organisme / Entreprise
            </label>
            <div className="relative">
              <input
                type="text"
                id="company"
                required
                aria-invalid={!!fieldErrors.company}
                aria-describedby={
                  fieldErrors.company ? "company-error" : undefined
                }
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-4 pl-10 text-sm outline-hidden transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="Secours Formation"
              />
              <Building2 className="absolute top-3.5 left-3.5 h-4.5 w-4.5 text-slate-400" />
            </div>
            {fieldErrors.company && (
              <p
                id="company-error"
                className="mt-1 text-xs font-medium text-red-600"
              >
                {fieldErrors.company[0]}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-xs font-bold tracking-wider text-slate-500 uppercase"
            >
              Adresse email
            </label>
            <div className="relative">
              <input
                type="email"
                id="email"
                required
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-4 pl-10 text-sm outline-hidden transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="contact@organisme.fr"
              />
              <Mail className="absolute top-3.5 left-3.5 h-4.5 w-4.5 text-slate-400" />
            </div>
            {fieldErrors.email && (
              <p
                id="email-error"
                className="mt-1 text-xs font-medium text-red-600"
              >
                {fieldErrors.email[0]}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-xs font-bold tracking-wider text-slate-500 uppercase"
            >
              Téléphone
            </label>
            <div className="relative">
              <input
                type="tel"
                id="phone"
                required
                aria-invalid={!!fieldErrors.phone}
                aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-4 pl-10 text-sm outline-hidden transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="06 12 34 56 78"
              />
              <Phone className="absolute top-3.5 left-3.5 h-4.5 w-4.5 text-slate-400" />
            </div>
            {fieldErrors.phone && (
              <p
                id="phone-error"
                className="mt-1 text-xs font-medium text-red-600"
              >
                {fieldErrors.phone[0]}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="message"
            className="mb-2 block text-xs font-bold tracking-wider text-slate-500 uppercase"
          >
            Votre message (facultatif)
          </label>
          <textarea
            id="message"
            rows={3}
            value={formData.message}
            onChange={(e) =>
              setFormData({ ...formData, message: e.target.value })
            }
            className="w-full rounded-xl border border-slate-300 bg-white p-4 text-sm outline-hidden transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            placeholder="Dites-nous en plus sur vos besoins..."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full cursor-pointer rounded-xl bg-blue-600 py-4 font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {isSubmitting ? "Envoi en cours..." : "Envoyer ma demande de démo"}
        </button>
      </form>
    </div>
  );
}

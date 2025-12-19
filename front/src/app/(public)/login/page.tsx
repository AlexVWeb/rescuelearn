"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

const formSchema = z.object({
    name: z.string().optional(),
    email: z.string().email({
        message: "Email invalide.",
    }),
    password: z.string().min(8, {
        message: "Le mot de passe doit contenir au moins 8 caractères.",
    }),
})

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSignUp, setIsSignUp] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        setError(null)

        if (isSignUp) {
            await authClient.signUp.email({
                email: values.email,
                password: values.password,
                name: values.name || "",
            }, {
                onSuccess: () => {
                    router.push("/admin")
                },
                onError: (ctx) => {
                    setError(ctx.error.message)
                    setLoading(false)
                }
            })
        } else {
            await authClient.signIn.email({
                email: values.email,
                password: values.password,
            }, {
                onSuccess: () => {
                    router.push("/admin")
                },
                onError: (ctx) => {
                    setError(ctx.error.message)
                    setLoading(false)
                }
            })
        }
    }

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{isSignUp ? "Créer un compte" : "Connexion"}</CardTitle>
                        <CardDescription>
                            {isSignUp
                                ? "Entrez vos informations pour créer un compte"
                                : "Entrez votre email ci-dessous pour vous connecter à votre compte"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid gap-6">
                                    {error && (
                                        <div className="text-sm font-medium text-destructive text-red-500">
                                            {error}
                                        </div>
                                    )}

                                    {isSignUp && (
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nom</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="John Doe" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="m@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center">
                                                    <FormLabel>Mot de passe</FormLabel>
                                                    {!isSignUp && (
                                                        <a
                                                            href="#"
                                                            className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                                        >
                                                            Mot de passe oublié ?
                                                        </a>
                                                    )}
                                                </div>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Button type="submit" className="w-full" disabled={loading}>
                                        {loading
                                            ? (isSignUp ? "Création..." : "Connexion...")
                                            : (isSignUp ? "S'inscrire" : "Se connecter")}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Button variant="link" onClick={() => setIsSignUp(!isSignUp)}>
                            {isSignUp
                                ? "Déjà un compte ? Se connecter"
                                : "Pas encore de compte ? S'inscrire"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}

import { LoginForm } from "@/components/login-form";

export const metadata = {
   title: "Connexion · Graph & Photos",
};

export default async function LoginPage({ searchParams }) {
   const params = await searchParams;
   const nextRaw = typeof params?.next === "string" ? params.next : "/";
   const next = nextRaw.startsWith("/") ? nextRaw : "/";

   return (
      <main className="relative flex min-h-svh items-center justify-center px-4 py-16">
         <div className="w-full max-w-sm">
            <div className="mb-8 text-center">
               <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                  Graph &amp; Co
               </p>
               <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  Drive
               </h1>
               <p className="mt-2 text-sm text-muted-foreground">
                  Connexion à ton espace fichiers
               </p>
            </div>
            <LoginForm next={next} />
         </div>
      </main>
   );
}

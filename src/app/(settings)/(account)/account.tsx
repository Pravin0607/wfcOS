"use client";

import React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/presentation/components/ui/button";

export const AccountSettings: React.FC = () => {
  const { data: session } = useSession();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to register");
      }

      // Login
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  if (session?.user) {
    return (
      <div className="flex flex-col items-center gap-6 p-6 w-full h-full overflow-y-auto">
        <div className="flex flex-col items-center gap-2">
            {session.user.image ? (
                <Image 
                    src={session.user.image} 
                    alt={session.user.name || "User"} 
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full border-2 border-white/20"
                />
            ) : (
                <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold border-2 border-white/20">
                    {session.user.name?.[0]?.toUpperCase() || "U"}
                </div>
            )}
          <div className="text-center">
            <h3 className="text-lg font-medium text-white">{session.user.name}</h3>
            <p className="text-sm text-gray-400">{session.user.email}</p>
          </div>
        </div>
        
        <div className="flex flex-col w-full gap-2 mt-4">
            <div className="p-4 rounded-lg bg-card/10 border border-white/10">
                <p className="text-xs text-secondary-foreground mb-1 uppercase tracking-wider">Cloud Sync</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm">Active & Synced</span>
                </div>
            </div>
            
            <Button 
            variant="destructive" 
            className="w-full mt-8"
            onClick={() => signOut()}
            >
            Sign Out
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 h-full w-full max-w-sm mx-auto overflow-y-auto">
      <div className="space-y-2 mb-8 text-center">
        <h3 className="text-xl font-bold text-white">Cloud Account</h3>
        <p className="text-sm text-gray-400">
          {isRegistering ? "Create an account to start syncing." : "Sign in to access your data."}
        </p>
      </div>

      <form onSubmit={handleCredentialsAuth} className="w-full space-y-4">
        {isRegistering && (
          <div className="space-y-1">
            <label className="text-xs text-gray-400 uppercase ml-1">Name</label>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-sm focus:outline-none focus:border-primary/50"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs text-gray-400 uppercase ml-1">Email</label>
          <input
            type="email"
            required
            className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-sm focus:outline-none focus:border-primary/50"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400 uppercase ml-1">Password</label>
          <input
            type="password"
            required
            className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-sm focus:outline-none focus:border-primary/50"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}

        <Button 
          type="submit"
          variant="default" 
          className="w-full"
          disabled={loading}
        >
          {loading ? "Processing..." : (isRegistering ? "Register" : "Sign In")}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <button 
          onClick={() => setIsRegistering(!isRegistering)}
          className="text-xs text-primary hover:underline"
        >
          {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Register"}
        </button>
      </div>

      <div className="w-full flex items-center gap-2 my-6">
        <div className="h-[1px] bg-white/10 flex-1" />
        <span className="text-[10px] text-gray-500 uppercase">Or</span>
        <div className="h-[1px] bg-white/10 flex-1" />
      </div>

      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => signIn("google")}
      >
        Sign In with Google
      </Button>
    </div>
  );
};

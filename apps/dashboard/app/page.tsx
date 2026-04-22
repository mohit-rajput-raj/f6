'use client';
import { useEffect } from "react";
import Header from "./header";
import { Spotlight } from "@repo/ui/components/ui/spotlight-new";
import { Button } from "@repo/ui/components/ui/button";
import { client } from "@/lib/orpc";
import Link from 'next/link';
import {
  ArrowRight,
  Database,
  Workflow,
  Shield,
  Zap,
  Box,
  BarChart
} from "lucide-react";

export default function Home() {
  useEffect(() => {
    client.users.list().then(console.log).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-black/95 text-neutral-200 selection:bg-indigo-500/30 selection:text-indigo-200">
      <Header />

      {/* Hero Section */}
      <main className="relative flex flex-col items-center justify-center pt-24 pb-16 overflow-hidden sm:pt-32 sm:pb-24">
        {/* Spotlight Effect Background */}
        <div className="absolute inset-0 z-0 bg-grid-white/[0.02] bg-[size:50px_50px]">
          <div className="absolute inset-0 bg-black/90 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_80%)]" />
        </div>
        <Spotlight />

        <div className="relative z-10 container flex flex-col items-center px-4 mx-auto text-center md:px-6">
          <div className="inline-flex items-center px-3 py-1 mb-8 text-sm font-medium border rounded-full border-white/10 bg-white/5 text-neutral-300 backdrop-blur-sm">
            <span className="flex w-2 h-2 mr-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Introducing UNIXL Dashboard Engine
          </div>

          <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-200 to-white/40 sm:text-7xl">
            Build powerful workflows at warp speed.
          </h1>

          <p className="max-w-2xl mt-6 text-lg font-medium leading-relaxed sm:text-xl text-neutral-400">
            A comprehensive visual editor for connecting databases, orchestrating automated tasks, and delivering insights faster than ever before.
          </p>

          <div className="flex flex-col items-center gap-4 mt-10 sm:flex-row">
            <Link href="/login">
              <span className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white transition-all duration-300 rounded-full shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] bg-indigo-600 hover:bg-indigo-500 hover:scale-105">
                Start Building Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </span>
            </Link>
            <Link href="https://nextjs.org/docs" target="_blank" rel="noopener noreferrer">
              <span className="inline-flex items-center justify-center px-8 py-4 text-base font-medium transition-all duration-300 border rounded-full text-neutral-300 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white">
                Read Documentation
              </span>
            </Link>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="relative z-10 py-24 border-y border-white/5 bg-black/40">
        <div className="container px-4 mx-auto md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Everything you need to scale</h2>
            <p className="max-w-2xl mx-auto mt-4 text-neutral-400">Transform how you manage data and automate processes with our cutting-edge toolset.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Visual Workflows", desc: "Drag and drop node editor to build complex logical systems without writing code.", icon: <Workflow className="w-6 h-6 text-indigo-400" /> },
              { title: "Database Sync", desc: "Easily union, merge, and filter datasets with live sync capabilities.", icon: <Database className="w-6 h-6 text-emerald-400" /> },
              { title: "High Performance", desc: "Built on TurboRepo and React Flow for butter-smooth interactions handling thousands of nodes.", icon: <Zap className="w-6 h-6 text-amber-400" /> },
              { title: "Secure by Default", desc: "Enterprise-grade security and authentication wrapped around every API call.", icon: <Shield className="w-6 h-6 text-rose-400" /> },
              { title: "Extensible Architecture", desc: "Publish node structures to a shared marketplace to reuse logic.", icon: <Box className="w-6 h-6 text-blue-400" /> },
              { title: "Instant Insights", desc: "Render data via embedded charts and visual analytics directly in the workflow.", icon: <BarChart className="w-6 h-6 text-purple-400" /> },
            ].map((feature, idx) => (
              <div key={idx} className="relative p-8 transition-transform duration-300 border backdrop-blur-sm rounded-2xl bg-white/[0.02] border-white/5 hover:-translate-y-1 hover:bg-white/[0.04]">
                <div className="flex items-center justify-center w-12 h-12 mb-6 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
                  {feature.icon}
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">{feature.title}</h3>
                <p className="leading-relaxed text-neutral-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Futuristic CTA */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-indigo-900/10 blur-[100px]" />
        <div className="container relative z-10 px-4 mx-auto md:px-6">
          <div className="max-w-4xl p-12 mx-auto text-center border shadow-2xl rounded-3xl bg-neutral-900/50 backdrop-blur-xl border-white/10">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to revolutionize your workflow?</h2>
            <p className="mb-10 text-lg text-neutral-400">Join thousands of leading developers building the next generation of data tools.</p>
            <span className="inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-black transition-all bg-white rounded-full hover:bg-neutral-200">
              Create Free Account
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-black/60">
        <div className="container px-4 mx-auto text-center md:px-6">
          <div className="flex justify-center items-center mb-6">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg">U</div>
            <span className="ml-3 text-xl font-bold tracking-wider text-white">UNIXL</span>
          </div>
          <p className="text-sm text-neutral-500">
            © {new Date().getFullYear()} UNIXL Workspace. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

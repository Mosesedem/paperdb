"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, X, Zap, Building2, Rocket } from "lucide-react";
import { SiGithub } from "react-icons/si";
import Ttile from "@/components/ttile";
import { useState, useEffect } from "react";
import { authClient } from "../lib/auth-client";

const plans = [
  {
    name: "Free",
    description: "Perfect for side projects and prototyping",
    price: "$0",
    priceDetail: "forever",
    icon: Rocket,
    features: [
      { name: "1 Database", included: true },
      { name: "5 Collections per database", included: true },
      { name: "1,000 Documents", included: true },
      { name: "1,000 API requests/month", included: true },
      { name: "100 MB storage", included: true },
      { name: "Realtime subscriptions", included: false },
      { name: "Priority support", included: false },
    ],
    cta: "Get Started",
    ctaLink: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "For growing projects and small teams",
    price: "$9",
    priceDetail: "/month",
    icon: Zap,
    polarProductId: "pro_monthly",
    features: [
      { name: "5 Databases", included: true },
      { name: "25 Collections per database", included: true },
      { name: "50,000 Documents", included: true },
      { name: "100,000 API requests/month", included: true },
      { name: "5 GB storage", included: true },
      { name: "Realtime subscriptions", included: true },
      { name: "Priority support", included: false },
    ],
    cta: "Upgrade to Pro",
    ctaLink: "/api/auth/checkout?plan=pro",
    highlighted: true,
  },
  {
    name: "Team",
    description: "For larger teams and production apps",
    price: "$29",
    priceDetail: "/month",
    icon: Building2,
    polarProductId: "team_monthly",
    features: [
      { name: "Unlimited Databases", included: true },
      { name: "Unlimited Collections", included: true },
      { name: "500,000 Documents", included: true },
      { name: "1,000,000 API requests/month", included: true },
      { name: "50 GB storage", included: true },
      { name: "Realtime subscriptions", included: true },
      { name: "Priority support", included: true },
    ],
    cta: "Upgrade to Team",
    ctaLink: "/api/auth/checkout?plan=team",
    highlighted: false,
  },
];

const faqs = [
  {
    question: "Can I upgrade or downgrade at any time?",
    answer:
      "Yes! You can change your plan at any time. When upgrading, you'll be charged a prorated amount. When downgrading, the change takes effect at the end of your billing period.",
  },
  {
    question: "What happens if I exceed my limits?",
    answer:
      "On the Free plan, API requests will be blocked once you hit your limit. On paid plans, we'll send you a warning email at 80% usage and give you time to upgrade before blocking requests.",
  },
  {
    question: "Do you offer annual billing?",
    answer:
      "Yes! Annual billing gives you 2 months free. Contact us to switch to annual billing.",
  },
  {
    question: "Can I self-host PaperDB?",
    answer:
      "Yes! PaperDB is open source. You can self-host the entire stack for free. Our cloud service is for teams who want a managed solution.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards through our payment provider Polar. We also support payment via GitHub Sponsors for open source maintainers.",
  },
];

export default function PricingPage() {
  const [session, setSession] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );

  useEffect(() => {
    (async () => {
      const { data } = await authClient.getSession();
      setSession(data);
    })();
  }, []);

  return (
    <>
      <Ttile>Pricing - PaperDB</Ttile>

      {/* Header */}
      <div className="flex justify-between max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-1">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" className="w-6" alt="PaperDB" />
            <p className="font-semibold">PaperDB</p>
          </Link>
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <Link href="/docs" className="hover:text-white">
            Documentation
          </Link>
          <Link href="/pricing" className="text-white">
            Pricing
          </Link>
          <span className="mx-2">|</span>
          {session ? (
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hover:text-white">
                Login
              </Link>
              <Link href="/signup" className="hover:text-white">
                Signup
              </Link>
            </>
          )}
          <span className="mx-2">|</span>
          <Link
            href="https://github.com/mosesedem/paperdb"
            className="p-1 hover:bg-white/10 rounded-sm transition-colors"
            target="_blank"
          >
            <SiGithub size={20} />
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-white mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Start free, upgrade when you need more. No hidden fees, no surprises.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              billingCycle === "monthly"
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("annual")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              billingCycle === "annual"
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Annual <span className="text-green-400 text-xs ml-1">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const displayPrice =
              billingCycle === "annual" && plan.price !== "$0"
                ? `$${Math.floor(parseInt(plan.price.replace("$", "")) * 10)}`
                : plan.price;
            const displayDetail =
              billingCycle === "annual" && plan.price !== "$0"
                ? "/year"
                : plan.priceDetail;

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 ${
                  plan.highlighted
                    ? "bg-gradient-to-b from-blue-500/20 to-transparent border-2 border-blue-500/50"
                    : "bg-black/10 border border-gray-200/5"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      plan.highlighted ? "bg-blue-500/20" : "bg-white/10"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        plan.highlighted ? "text-blue-400" : "text-gray-400"
                      }`}
                    />
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    {plan.name}
                  </h3>
                </div>

                <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">
                    {displayPrice}
                  </span>
                  <span className="text-gray-400 ml-1">{displayDetail}</span>
                </div>

                <Link
                  href={session ? plan.ctaLink : "/signup"}
                  className="block"
                >
                  <Button
                    className={`w-full ${
                      plan.highlighted ? "bg-blue-500 hover:bg-blue-600" : ""
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>

                <div className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature.name} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      )}
                      <span
                        className={
                          feature.included ? "text-gray-300" : "text-gray-500"
                        }
                      >
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Compare Plans
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-4 px-4 text-gray-400 font-medium">
                  Feature
                </th>
                <th className="text-center py-4 px-4 text-white font-medium">
                  Free
                </th>
                <th className="text-center py-4 px-4 text-white font-medium">
                  Pro
                </th>
                <th className="text-center py-4 px-4 text-white font-medium">
                  Team
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr>
                <td className="py-4 px-4 text-gray-300">Databases</td>
                <td className="text-center py-4 px-4 text-gray-400">1</td>
                <td className="text-center py-4 px-4 text-gray-400">5</td>
                <td className="text-center py-4 px-4 text-gray-400">
                  Unlimited
                </td>
              </tr>
              <tr>
                <td className="py-4 px-4 text-gray-300">Collections/DB</td>
                <td className="text-center py-4 px-4 text-gray-400">5</td>
                <td className="text-center py-4 px-4 text-gray-400">25</td>
                <td className="text-center py-4 px-4 text-gray-400">
                  Unlimited
                </td>
              </tr>
              <tr>
                <td className="py-4 px-4 text-gray-300">Documents</td>
                <td className="text-center py-4 px-4 text-gray-400">1,000</td>
                <td className="text-center py-4 px-4 text-gray-400">50,000</td>
                <td className="text-center py-4 px-4 text-gray-400">500,000</td>
              </tr>
              <tr>
                <td className="py-4 px-4 text-gray-300">API Requests/mo</td>
                <td className="text-center py-4 px-4 text-gray-400">1,000</td>
                <td className="text-center py-4 px-4 text-gray-400">100,000</td>
                <td className="text-center py-4 px-4 text-gray-400">
                  1,000,000
                </td>
              </tr>
              <tr>
                <td className="py-4 px-4 text-gray-300">Storage</td>
                <td className="text-center py-4 px-4 text-gray-400">100 MB</td>
                <td className="text-center py-4 px-4 text-gray-400">5 GB</td>
                <td className="text-center py-4 px-4 text-gray-400">50 GB</td>
              </tr>
              <tr>
                <td className="py-4 px-4 text-gray-300">Realtime</td>
                <td className="text-center py-4 px-4">
                  <X className="w-4 h-4 text-gray-600 mx-auto" />
                </td>
                <td className="text-center py-4 px-4">
                  <Check className="w-4 h-4 text-green-400 mx-auto" />
                </td>
                <td className="text-center py-4 px-4">
                  <Check className="w-4 h-4 text-green-400 mx-auto" />
                </td>
              </tr>
              <tr>
                <td className="py-4 px-4 text-gray-300">Priority Support</td>
                <td className="text-center py-4 px-4">
                  <X className="w-4 h-4 text-gray-600 mx-auto" />
                </td>
                <td className="text-center py-4 px-4">
                  <X className="w-4 h-4 text-gray-600 mx-auto" />
                </td>
                <td className="text-center py-4 px-4">
                  <Check className="w-4 h-4 text-green-400 mx-auto" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-black/10 border border-gray-200/5 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-2">
                {faq.question}
              </h3>
              <p className="text-gray-400">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className=" rounded-2xl p-12 text-center border ">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Start with the free tier and upgrade anytime. No credit card
            required.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg">Start for Free</Button>
            </Link>
            <Link href="/docs">
              <Button
                size="lg"
                variant="outline"
                className="border-gray-600 hover:bg-white/10"
              >
                Read the Docs
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200/5 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/logo.png" className="w-6" alt="PaperDB" />
              <p className="font-semibold text-white">PaperDB</p>
            </div>
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} PaperDB. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

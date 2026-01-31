// app/not-found.tsx
"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchX, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="flex justify-center max-w-7xl mx-auto px-4 py-8">
      {" "}
      <div className="text-center space-y-8 max-w-xl py-12">
        {/* Visual + Status */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-amber-100 text-amber-600 mb-4">
          <SearchX size={48} strokeWidth={1.8} />
        </div>

        <h1 className="text-6xl md:text-7xl font-bold tracking-tight ">404</h1>

        <h2 className="text-3xl md:text-4xl font-semibold text-gray-400 mt-2">
          Page not found
        </h2>

        <p className="text-lg text-gray-400 max-w-md mx-auto leading-relaxed pt-2">
          Sorry, we couldn’t find the page you’re looking for. It may have been
          moved, renamed, or doesn’t exist.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Home size={18} />
            Go to homepage
          </Link>

          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-lg transition-colors border border-gray-300 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            <ArrowLeft size={18} />
            Go back
          </button>
        </div>

        {/* Helpful links / reassurance */}
        <div className="pt-10 text-sm text-gray-500">
          <p>Looking for something else?</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-3 ">
            <Link href="/docs" className="hover:underline">
              Documentation
            </Link>
            <Link href="/login" className="hover:underline">
              Login{" "}
            </Link>
            <Link href="/Signup" className="hover:underline">
              Signup
            </Link>
            <Link href="/pricing" className="hover:underline">
              Pricing{" "}
            </Link>
          </div>
        </div>
      </div>
      {/* Optional subtle footer note */}
      <div className="absolute bottom-6 text-xs text-gray-400">
        PaperDB • {new Date().getFullYear()}
      </div>
    </div>
  );
}

// Optional: better SEO for 404 pages
// export const metadata = {
//   title: "404 - Page Not Found",
//   description: "The page you are looking for does not exist or has been moved.",
//   robots: {
//     index: false,
//     follow: false,
//   },
// };

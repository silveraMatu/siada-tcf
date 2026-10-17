import { FeaturesGrid } from './FeaturesGrid';
import { Hero } from './Hero';
import { LandingFooter } from './LandingFooter';
import { LandingNavbar } from './LandingNavbar';

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingNavbar />
      <main className="flex-1">
        <Hero />
        <FeaturesGrid />
      </main>
      <LandingFooter />
    </div>
  );
}

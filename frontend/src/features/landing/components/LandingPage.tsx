import { CierreCta } from './CierreCta';
import { Hero } from './Hero';
import { LandingFooter } from './LandingFooter';
import { LandingNavbar } from './LandingNavbar';
import { FiltroTintaSello } from './Sello';
import { SeccionAsistente } from './SeccionAsistente';
import { SeccionMotor } from './SeccionMotor';
import { SeccionOrganismos } from './SeccionOrganismos';
import { SeccionTrazabilidad } from './SeccionTrazabilidad';

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-oficio font-prensa">
      <FiltroTintaSello />
      <LandingNavbar />
      <main className="flex-1">
        <Hero />
        <SeccionMotor />
        <SeccionAsistente />
        <SeccionTrazabilidad />
        <SeccionOrganismos />
        <CierreCta />
      </main>
      <LandingFooter />
    </div>
  );
}

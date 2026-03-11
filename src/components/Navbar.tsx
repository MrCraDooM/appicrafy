import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/AppLogo";

export function Navbar() {
  const navigate = useNavigate();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/">
          <AppLogo size="md" />
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <a href="/#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-foreground transition-colors cursor-pointer">Features</a>
          <a href="/#pricing" onClick={(e) => { e.preventDefault(); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-foreground transition-colors cursor-pointer">Pricing</a>
          <a href="/#how" onClick={(e) => { e.preventDefault(); document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-foreground transition-colors cursor-pointer">How it works</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Login</Button>
          <Button size="sm" className="brand-gradient text-brand-foreground border-0 hover:opacity-90" onClick={() => navigate("/register")}>
            Get Started
          </Button>
        </div>
      </div>
    </header>);

}
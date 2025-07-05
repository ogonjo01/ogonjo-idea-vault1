import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Upload, Menu, X, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  onLogin?: () => void;
  showSearch?: boolean; // This prop will now be controlled by MainLayout based on path
}

const Header = ({ onLogin, showSearch = false }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserProfile();
  const isLoggedIn = !!user;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  

  // DEBUG LOG 1: Verify the onLogin prop when the Header component renders
  useEffect(() => {
    console.log("Header Component Mounted/Updated. Current path:", location.pathname);
    console.log("Header: Received onLogin prop type:", typeof onLogin, "Value:", onLogin);
    if (typeof onLogin === 'function') {
      console.log("Header: onLogin is a function. It should be callable.");
    } else {
      console.warn("Header: onLogin prop is NOT a function. This is problematic.");
    }
  }, [onLogin, location.pathname]);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to dashboard (which is now '/') with search query
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery(''); // Clear search input
    }
  };

  const handleLogout = async () => {
    console.log("Header: Logout button clicked.");
    await signOut();
    navigate('/'); // Navigate to the new landing page (Dashboard) after logout
  };

  return (

    
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-montserrat font-bold text-lg">O</span>
            </div>
            <span className="font-montserrat font-bold text-xl text-primary">OGONJO</span>
          </Link>

          {/* Search Bar (Desktop) */}
          {/* showSearch is now passed from MainLayout, so it will be true on '/' (Dashboard) */}
          {showSearch && (
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search ideas by title, category, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 font-roboto"
                />
              </div>
            </form>
          )}

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {!isLoggedIn ? (
              <>
                <nav className="flex items-center space-x-6">
                  <Link to="/features" className="font-roboto text-foreground hover:text-primary transition-colors">
                    Features
                  </Link>
                  <Link to="/contact" className="font-roboto text-foreground hover:text-primary transition-colors">
                    Contact
                  </Link>
                </nav>
                <div className="flex items-center space-x-3">
                  <Button variant="ghost" onClick={() => { console.log("Header: Desktop Log In button clicked. Calling onLogin()."); onLogin?.(); }} className="font-roboto">
                    Log In
                  </Button>
                  <Button onClick={() => { console.log("Header: Desktop Sign Up button clicked. Calling onLogin()."); onLogin?.(); }} className="bg-accent hover:bg-accent/90 text-accent-foreground font-roboto">
                    Sign Up
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <nav className="flex items-center space-x-4">
                  <Link to="/" className="font-roboto text-foreground hover:text-primary transition-colors"> {/* Link to new landing page */}
                    Ideas
                  </Link>
                </nav>
                <Link to="/upload">
                  <Button variant="ghost" size="sm" className="font-roboto">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="font-roboto">
                          {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="font-roboto">Profile</Link>
                    </DropdownMenuItem>
                    {isAdmin() && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="font-roboto">
                          <Shield className="h-4 w-4 mr-2" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout} className="font-roboto">
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            {showSearch && ( // showSearch is true on '/' (Dashboard)
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search ideas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 font-roboto"
                  />
                </div>
              </form>
            )}

            {!isLoggedIn ? (
              <div className="space-y-3">
                <Link
                  to="/features"
                  className="block py-2 font-roboto text-foreground hover:text-primary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  to="/contact"
                  className="block py-2 font-roboto text-foreground hover:text-primary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Contact
                </Link>
                <div className="pt-3 space-y-2">
                  <Button
                    variant="ghost"
                    onClick={() => { console.log("Header: Mobile Log In button clicked. Calling onLogin()."); onLogin?.(); setIsMobileMenuOpen(false); }}
                    className="w-full justify-start font-roboto"
                  >
                    Log In
                  </Button>
                  <Button
                    onClick={() => { console.log("Header: Mobile Sign Up button clicked. Calling onLogin()."); onLogin?.(); setIsMobileMenuOpen(false); }}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-roboto"
                  >
                    Sign Up
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  to="/" // Link to new landing page
                  className="block py-2 font-roboto text-foreground hover:text-primary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Ideas
                </Link>
                <Link
                  to="/upload"
                  className="flex items-center py-2 font-roboto text-foreground hover:text-primary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Link>
                <Link
                  to="/profile"
                  className="block py-2 font-roboto text-foreground hover:text-primary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                {isAdmin() && (
                  <Link
                    to="/admin"
                    className="flex items-center py-2 font-roboto text-foreground hover:text-primary"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Link>
                )}
                <Button
                  variant="ghost"
                  onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                  className="w-full justify-start font-roboto"
                >
                  Logout
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

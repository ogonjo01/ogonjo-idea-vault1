// ogonjo-web-app/src/components/Header.tsx
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Corrected import
import { useUserProfile } from '../hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Upload, Menu, X, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Theme } from '../constants/Theme';

interface HeaderProps {
  onLogin?: () => void;
  showSearch?: boolean;
}

const Header = ({ onLogin, showSearch = false }: HeaderProps) => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const isLoggedIn = !!user;
  const isAdmin = () => profile?.role === 'admin'; // Safe check for isAdmin
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Debug auth and profile state
  useEffect(() => {
    console.log('Header: Auth state:', { user, authLoading });
    console.log('Header: Profile state:', { profile, profileLoading });
    console.log('Header: Current path:', location.pathname);
    console.log('Header: onLogin prop type:', typeof onLogin, 'Value:', onLogin);
    if (typeof onLogin !== 'function') {
      console.warn('Header: onLogin prop is not a function. Using default navigation.');
    }
  }, [onLogin, location.pathname, user, authLoading, profile, profileLoading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMobileMenuOpen(false); // Close mobile menu on search
      toast({
        title: 'Search Initiated',
        description: `Searching for "${searchQuery.trim()}"`,
      });
    } else {
      toast({
        title: 'Empty Search',
        description: 'Please enter a search query.',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    console.log('Header: Logout button clicked.');
    try {
      const error = await signOut();
      if (error) throw error;
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
      navigate('/');
    } catch (error: any) {
      console.error('Header: Logout error:', error.message);
      toast({
        title: 'Logout Error',
        description: error.message,
        variant: 'destructive',
      });
    }
    setIsMobileMenuOpen(false);
  };

  const handleLoginClick = () => {
    console.log('Header: Login/Sign Up button clicked.');
    if (typeof onLogin === 'function') {
      onLogin();
    } else {
      navigate('/auth');
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className="bg-background border-b border-border sticky top-0 z-50"
      style={{ backgroundColor: Theme.colors.background, borderColor: Theme.colors.border }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: Theme.colors.primary }}
            >
              <span
                className="font-montserrat font-bold text-lg"
                style={{ color: Theme.colors.textSecondary }}
              >
                o
              </span>
            </div>
            <span
              className="font-montserrat font-bold text-xl"
              style={{ color: Theme.colors.primary }}
            >
              OGONJO
            </span>
          </Link>

          {/* Search Bar (Desktop) */}
          {showSearch && (
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                  style={{ color: Theme.colors.textSecondary }}
                />
                <Input
                  type="text"
                  placeholder="Search ideas by title, category, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 font-roboto"
                  style={{ borderColor: Theme.colors.border }}
                />
              </div>
            </form>
          )}

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {!isLoggedIn ? (
              <>
                <nav className="flex items-center space-x-6">
                  <Link
                    to="/features"
                    className="font-roboto transition-colors"
                    style={{
                      color: Theme.colors.textPrimary,
                      fontWeight: 500,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = Theme.colors.primary)}
                    onMouseOut={(e) => (e.currentTarget.style.color = Theme.colors.textPrimary)}
                  >
                    Features
                  </Link>
                  <Link
                    to="/contact"
                    className="font-roboto transition-colors"
                    style={{
                      color: Theme.colors.textPrimary,
                      fontWeight: 500,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = Theme.colors.primary)}
                    onMouseOut={(e) => (e.currentTarget.style.color = Theme.colors.textPrimary)}
                  >
                    Contact
                  </Link>
                </nav>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    onClick={handleLoginClick}
                    className="font-roboto"
                    style={{ color: Theme.colors.textPrimary }}
                  >
                    Log In
                  </Button>
                  <Button
                    onClick={handleLoginClick}
                    className="font-roboto"
                    style={{
                      backgroundColor: Theme.colors.primary,
                      color: Theme.colors.buttonText,
                    }}
                  >
                    Sign Up
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <nav className="flex items-center space-x-4">
                  <Link
                    to="/"
                    className="font-roboto transition-colors"
                    style={{
                      color: Theme.colors.textPrimary,
                      fontWeight: 500,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = Theme.colors.primary)}
                    onMouseOut={(e) => (e.currentTarget.style.color = Theme.colors.textPrimary)}
                  >
                    Ideas
                  </Link>
                </nav>
                <Link to="/upload">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-roboto"
                    style={{ color: Theme.colors.textPrimary }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full"
                      disabled={authLoading || profileLoading}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback
                          className="font-roboto"
                          style={{ backgroundColor: Theme.colors.primary, color: Theme.colors.textSecondary }}
                        >
                          {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56"
                    align="end"
                    style={{ backgroundColor: Theme.colors.cardBackground }}
                  >
                    <DropdownMenuItem asChild>
                      <Link
                        to="/profile"
                        className="font-roboto"
                        style={{ color: Theme.colors.textPrimary }}
                      >
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin() && (
                      <DropdownMenuItem asChild>
                        <Link
                          to="/admin"
                          className="font-roboto"
                          style={{ color: Theme.colors.textPrimary }}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="font-roboto"
                      style={{ color: Theme.colors.textPrimary }}
                    >
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
            style={{ color: Theme.colors.textPrimary }}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden py-4 border-t"
            style={{ borderColor: Theme.colors.border }}
          >
            {showSearch && (
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                    style={{ color: Theme.colors.textSecondary }}
                  />
                  <Input
                    type="text"
                    placeholder="Search ideas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 font-roboto"
                    style={{ borderColor: Theme.colors.border }}
                  />
                </div>
              </form>
            )}
            {!isLoggedIn ? (
              <div className="space-y-3">
                <Link
                  to="/features"
                  className="block py-2 font-roboto"
                  style={{ color: Theme.colors.textPrimary }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  to="/contact"
                  className="block py-2 font-roboto"
                  style={{ color: Theme.colors.textPrimary }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Contact
                </Link>
                <div className="pt-3 space-y-2">
                  <Button
                    variant="ghost"
                    onClick={handleLoginClick}
                    className="w-full justify-start font-roboto"
                    style={{ color: Theme.colors.textPrimary }}
                  >
                    Log In
                  </Button>
                  <Button
                    onClick={handleLoginClick}
                    className="w-full font-roboto"
                    style={{
                      backgroundColor: Theme.colors.primary,
                      color: Theme.colors.buttonText,
                    }}
                  >
                    Sign Up
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  to="/"
                  className="block py-2 font-roboto"
                  style={{ color: Theme.colors.textPrimary }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Ideas
                </Link>
                <Link
                  to="/upload"
                  className="flex items-center py-2 font-roboto"
                  style={{ color: Theme.colors.textPrimary }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Link>
                <Link
                  to="/profile"
                  className="block py-2 font-roboto"
                  style={{ color: Theme.colors.textPrimary }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                {isAdmin() && (
                  <Link
                    to="/admin"
                    className="flex items-center py-2 font-roboto"
                    style={{ color: Theme.colors.textPrimary }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Link>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start font-roboto"
                  style={{ color: Theme.colors.textPrimary }}
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
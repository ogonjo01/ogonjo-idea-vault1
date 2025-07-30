import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Settings, Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';

// --- INTERFACES ---
interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  plan: string;
  avatar_url?: string;
}

const Profile = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, created_at, plan, avatar_url, email')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError.message);
        } else if (profileData) {
          setUserData({
            id: user.id,
            full_name: profileData.full_name,
            email: profileData.email || 'N/A',
            created_at: profileData.created_at,
            plan: profileData.plan,
            avatar_url: profileData.avatar_url,
          });
        }
      } else {
        console.warn('No user session found, redirecting to login.');
        navigate('/login');
      }
      setLoading(false);
    };

    fetchUserProfile();
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    } else {
      navigate('/');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      console.error("Invalid date string:", dateString, e);
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-2 font-montserrat text-lg">Loading profile data...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-lg text-destructive">Could not load user data. Please ensure you are logged in.</p>
        <Button onClick={() => navigate('/login')} className="mt-4">Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  {userData.avatar_url ? (
                    <AvatarImage src={userData.avatar_url} alt={userData.full_name} />
                  ) : (
                    <AvatarFallback className="text-2xl font-montserrat font-semibold">
                      {userData.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h1 className="font-montserrat font-bold text-3xl text-foreground mb-1">
                    {userData.full_name}
                  </h1>
                  <Badge variant="secondary" className="font-roboto mb-2">
                    {userData.plan}
                  </Badge>
                  <div className="flex items-center gap-2 text-muted-foreground font-roboto text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Member since {formatDate(userData.created_at)}</span>
                  </div>
                  <div className="font-roboto text-sm text-muted-foreground mt-1">
                    <span>Email: {userData.email}</span>
                  </div>
                </div>
              </div>
              <div className="md:ml-auto flex gap-2">
                <Button variant="destructive" className="font-roboto" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Content Buttons */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-montserrat text-2xl text-foreground">Upload Content</CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              className="font-roboto bg-foreground hover:bg-foreground/90 text-white flex items-center justify-center gap-2"
              onClick={() => navigate('/upload-investments')}
            >
              📊 Investments
            </Button>
            <Button
              className="font-roboto bg-foreground hover:bg-foreground/90 text-white flex items-center justify-center gap-2"
              onClick={() => navigate('/upload-innovations')}
            >
              💡 Innovations
            </Button>
            <Button
              className="font-roboto bg-foreground hover:bg-foreground/90 text-white flex items-center justify-center gap-2"
              onClick={() => navigate('/upload-learning')}
            >
              🏫 Learning
            </Button>
            <Button
              className="font-roboto bg-foreground hover:bg-foreground/90 text-white flex items-center justify-center gap-2"
              onClick={() => navigate('/upload-summaries')}
            >
              📚 Summaries
            </Button>
            <Button
              className="font-roboto bg-foreground hover:bg-foreground/90 text-white flex items-center justify-center gap-2"
              onClick={() => navigate('/upload-wisdom')}
            >
              💬 Wisdom
            </Button>
            <Button
              className="font-roboto bg-foreground hover:bg-foreground/90 text-white flex items-center justify-center gap-2"
              onClick={() => navigate('/upload-audiobooks')}
            >
              🎧 Audio Books
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
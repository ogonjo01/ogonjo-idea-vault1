import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
//import Header from '@/components/Header';
//import Footer from '@/components/Footer';
// Removed IdeaCard import as it's no longer used
import { Calendar, Settings, Loader2 } from 'lucide-react'; // Removed Heart, Download icons
import { supabase } from '@/lib/supabase';

// --- INTERFACES ---
interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  created_at: string; // From 'profiles' table
  plan: string; // From 'profiles' table
  avatar_url?: string;
}

// Removed Idea, LikedIdeaSupabaseRow, DownloadedIdeaSupabaseRow interfaces
// as their data is no longer fetched or used in the component.

const Profile = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserProfile | null>(null);

  // Removed state for likedIdeas, downloadedIdeas, ideasUploaded

  useEffect(() => {
    const fetchUserProfile = async () => { // Renamed function as it only fetches profile now
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // --- Fetch user profile data from 'profiles' table ---
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, created_at, plan, avatar_url, email') // Select 'created_at', 'plan', 'email' to match DB
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
        // Removed fetching logic for liked ideas, downloaded ideas, and uploaded ideas
      } else {
        console.warn('No user session found, redirecting to login.');
        navigate('/login');
      }
      setLoading(false);
    };

    fetchUserProfile(); // Call the renamed function
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
              {/* Avatar and Basic Info */}
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

              {/* Only Logout Button for MVP */}
              <div className="md:ml-auto flex gap-2">
                <Button variant="destructive" className="font-roboto" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>

            {/* Removed the stats section entirely as requested */}
            {/* Keeping this comment block for easy re-introduction if needed later */}
            {/*
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 pt-6 border-t border-border">
              <div className="text-center">
                <div className="text-2xl font-montserrat font-bold text-primary mb-1">
                  {likedIdeas.length}
                </div>
                <div className="font-roboto text-sm text-muted-foreground">
                  Ideas Liked
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-montserrat font-bold text-primary mb-1">
                  {downloadedIdeas.length}
                </div>
                <div className="font-roboto text-sm text-muted-foreground">
                  Ideas Downloaded
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-montserrat font-bold text-primary mb-1">
                  {ideasUploaded}
                </div>
                <div className="font-roboto text-sm text-muted-foreground">
                  Ideas Uploaded
                </div>
              </div>
            </div>
            */}
          </CardContent>
        </Card>

        {/* Tabs component and its content are entirely removed */}
      </main>

      
    </div>
  );
};

export default Profile;
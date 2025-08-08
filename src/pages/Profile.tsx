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
  const [uploadSuccess, setUploadSuccess] = useState(false); // Track upload success

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          console.warn('No user session found, redirecting to login.');
          navigate('/auth?mode=signIn');
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, created_at, plan, avatar_url, email')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError.message);
          setUserData(null); // Fallback to null if error occurs
        } else if (profileData) {
          setUserData({
            id: user.id,
            full_name: profileData.full_name || 'Unknown User',
            email: profileData.email || 'N/A',
            created_at: profileData.created_at || new Date().toISOString(),
            plan: profileData.plan || 'Free',
            avatar_url: profileData.avatar_url,
          });
        }
      } catch (error) {
        console.error('Unexpected error fetching profile:', error);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error.message);
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

  // Handle auto-redirect after upload
  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
        setUploadSuccess(false); // Reset after redirect
      }, 2000); // 2-second delay for user feedback
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess, navigate]);

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
        <Button onClick={() => navigate('/auth?mode=signIn')} className="mt-4">Go to Login</Button>
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
                <Button variant="outline" onClick={() => navigate('/dashboard')} className="font-roboto">
                  Back to Dashboard
                </Button>
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
              onClick={() => { navigate('/upload-investments'); setUploadSuccess(true); }}
            >
              📊 Investments
            </Button>
            <Button
              className="font-roboto bg-foreground hover:bg-foreground/90 text-white flex items-center justify-center gap-2"
              onClick={() => { navigate('/upload-innovations'); setUploadSuccess(true); }}
            >
              💡 Innovations
            </Button>
            <Button
              className="font-roboto bg-foreground hover:bg-foreground/90 text-white flex items-center justify-center gap-2"
              onClick={() => { navigate('/upload-learning'); setUploadSuccess(true); }}
            >
              🏫 Learning
            </Button>
            <Button
              className="font-roboto bg-foreground hover:bg-foreground/90 text-white flex items-center justify-center gap-2"
              onClick={() => { navigate('/upload-summaries'); setUploadSuccess(true); }}
            >
              📚 Summaries
            </Button>
            <Button
              className="font-roboto bg-foreground hover:bg-foreground/90 text-white flex items-center justify-center gap-2"
              onClick={() => { navigate('/upload-wisdom'); setUploadSuccess(true); }}
            >
              💬 Wisdom
            </Button>
            <Button
              className="font-roboto bg-foreground hover:bg-foreground/90 text-white flex items-center justify-center gap-2"
              onClick={() => { navigate('/upload-audiobooks'); setUploadSuccess(true); }}
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